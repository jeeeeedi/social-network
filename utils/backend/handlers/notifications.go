package handlers

import (
	"log"
	"net/http"
	"social_network/dbTools"
	"social_network/middleware"
	"social_network/utils"
	"strconv"
	"strings"
	"time"
)

// NotificationHandler manages user notifications with cleaner, service-based architecture
func NotificationHandler(db *dbTools.DB, w http.ResponseWriter, r *http.Request) {
	log.Printf("NotificationHandler called at %s for URL %s", time.Now().Format(time.RFC3339), r.URL.Path)
	middleware.SetCORSHeaders(w)
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	currentUserID, err := utils.GetUserIDFromSession(db.GetDB(), r)
	if err != nil {
		log.Printf("Session check error: %v", err)
		utils.SendErrorResponse(w, http.StatusUnauthorized, "Invalid session")
		return
	}

	// Initialize notification service
	notificationService := dbTools.NewNotificationService(db)

	switch r.Method {
	case "GET":
		handleGetNotifications(w, notificationService, currentUserID)
	case "POST":
		handleMarkAsRead(w, r, notificationService, currentUserID)
	case "DELETE":
		handleClearNotifications(w, notificationService, currentUserID)
	default:
		utils.SendErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
	}
}

// handleGetNotifications retrieves all notifications for the current user
func handleGetNotifications(w http.ResponseWriter, service *dbTools.NotificationService, userID int) {
	notifications, err := service.GetNotificationsByUserID(userID)
	if err != nil {
		log.Printf("Notifications query error: %v", err)
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Failed to fetch notifications")
		return
	}

	// Map notifications to frontend format
	formattedNotifications := []map[string]interface{}{}
	for _, n := range notifications {
		notification := map[string]interface{}{
			"id":          n.NotificationID,
			"receiver_id": n.ReceiverID,
			"actor_id":    n.ActorID,
			"type":        mapActionTypeToFrontendType(n.ActionType),
			"parent_type": n.ParentType,
			"parent_id":   n.ParentID,
			"message":     n.Content,
			"status":      mapStatusToFrontendStatus(n.Status),
			"timestamp":   n.CreatedAt,
			"sender":      n.Nickname,
			"avatar":      n.Avatar,
		}
		formattedNotifications = append(formattedNotifications, notification)
	}

	utils.SendSuccessResponse(w, map[string]interface{}{
		"notifications": formattedNotifications,
	})
}

// handleMarkAsRead marks a specific notification as read
func handleMarkAsRead(w http.ResponseWriter, r *http.Request, service *dbTools.NotificationService, userID int) {
	path := strings.TrimPrefix(r.URL.Path, "/api/notifications/")
	notificationIDStr := strings.TrimSpace(path)
	if notificationIDStr == "" {
		utils.SendErrorResponse(w, http.StatusBadRequest, "Missing notification ID")
		return
	}

	notificationID, err := strconv.Atoi(notificationIDStr)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusBadRequest, "Invalid notification ID")
		return
	}

	err = service.MarkAsRead(notificationID, userID)
	if err != nil {
		log.Printf("Mark as read error: %v", err)
		if err.Error() == "notification not found or already read" {
			utils.SendErrorResponse(w, http.StatusNotFound, err.Error())
		} else {
			utils.SendErrorResponse(w, http.StatusInternalServerError, "Failed to update notification")
		}
		return
	}

	utils.SendSuccessResponse(w, map[string]interface{}{
		"message": "Notification marked as read",
	})
}

// handleClearNotifications clears all read notifications for the user
func handleClearNotifications(w http.ResponseWriter, service *dbTools.NotificationService, userID int) {
	err := service.ClearReadNotifications(userID)
	if err != nil {
		log.Printf("Clear notifications error: %v", err)
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Failed to clear notifications")
		return
	}

	utils.SendSuccessResponse(w, map[string]interface{}{
		"message": "Read notifications cleared",
	})
}

// mapActionTypeToFrontendType maps backend action_type to frontend type
func mapActionTypeToFrontendType(actionType string) string {
	switch actionType {
	case "follow_request":
		return "follow_request"
	case "follow_accepted":
		return "follow"
	case "group_invitation":
		return "group_invitation"
	case "group_event":
		return "event"
	default:
		return actionType
	}
}

// mapStatusToFrontendStatus maps backend status to frontend status
func mapStatusToFrontendStatus(status string) string {
	switch status {
	case "unread":
		return "new"
	case "accepted", "declined", "read":
		return status
	default:
		return status
	}
}

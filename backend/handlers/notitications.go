package handlers

import (
	"log"
	"net/http"
	"social_network/dbTools"
	"social_network/middleware"
	"social_network/utils"
	"strings"
	"time"
)

// NotificationHandler manages user notifications
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

	switch r.Method {
	case "GET":
		rows, err := db.GetDB().Query(`
			SELECT n.notification_id, n.receiver_id, n.actor_id, n.action_type, n.parent_type, n.parent_id,
				n.content, n.status, n.created_at, COALESCE(u.nickname, u.first_name) as nickname, COALESCE(u.avatar, '') as avatar
			FROM notifications n
			JOIN users u ON n.actor_id = u.user_id
			WHERE n.receiver_id = ? AND n.status != 'inactive'
			ORDER BY n.created_at DESC
		`, currentUserID)
		if err != nil {
			log.Printf("Notifications query error: %v", err)
			utils.SendErrorResponse(w, http.StatusInternalServerError, "Failed to fetch notifications")
			return
		}
		defer rows.Close()

		notifications := []map[string]interface{}{}
		for rows.Next() {
			var n dbTools.Notification
			err = rows.Scan(&n.NotificationID, &n.ReceiverID, &n.ActorID, &n.ActionType, &n.ParentType,
				&n.ParentID, &n.Content, &n.Status, &n.CreatedAt, &n.Nickname, &n.Avatar)
			if err == nil {
				// Map fields for frontend
				notification := map[string]interface{}{
					"id":          n.NotificationID,
					"receiver_id": n.ReceiverID,
					"actor_id":    n.ActorID,
					"type":        n.ActionType,
					"parent_type": n.ParentType,
					"parent_id":   n.ParentID,
					"message":     n.Content,
					"status":      n.Status,
					"timestamp":   n.CreatedAt,
					"sender":      n.Nickname,
					"avatar":      n.Avatar,
				}
				// Map backend action_type to frontend type
				switch n.ActionType {
				case "follow_request":
					notification["type"] = "follow_request"
				case "follow_accepted":
					notification["type"] = "follow"
				case "group_invitation":
					notification["type"] = "group_invite"
				case "group_event":
					notification["type"] = "event"
				}
				// Map backend status to frontend status
				switch n.Status {
				case "unread":
					notification["status"] = "new"
				case "accepted", "declined", "read":
					// Keep as is
				}
				notifications = append(notifications, notification)
			}
		}
		if err = rows.Err(); err != nil {
			log.Printf("Notifications rows error: %v", err)
		}

		utils.SendSuccessResponse(w, map[string]interface{}{
			"notifications": notifications,
		})

	case "POST":
		path := strings.TrimPrefix(r.URL.Path, "/api/notifications/")
		notificationID := strings.TrimSpace(path)
		if notificationID == "" {
			utils.SendErrorResponse(w, http.StatusBadRequest, "Missing notification ID")
			return
		}

		query := `
			UPDATE notifications 
			SET status = 'read', updated_at = datetime('now'), updater_id = ?
			WHERE notification_id = ? AND receiver_id = ? AND status = 'unread'
		`
		result, err := db.GetDB().Exec(query, currentUserID, notificationID, currentUserID)
		if err != nil {
			log.Printf("Update notification error: %v", err)
			utils.SendErrorResponse(w, http.StatusInternalServerError, "Failed to update notification")
			return
		}

		rowsAffected, _ := result.RowsAffected()
		if rowsAffected == 0 {
			utils.SendErrorResponse(w, http.StatusNotFound, "Notification not found or already read")
			return
		}

		utils.SendSuccessResponse(w, map[string]interface{}{
			"message": "Notification marked as read",
		})

	case "DELETE":
		query := `
			UPDATE notifications 
			SET status = 'inactive', updated_at = datetime('now'), updater_id = ?
			WHERE receiver_id = ? AND status = 'read'
		`
		_, err := db.GetDB().Exec(query, currentUserID, currentUserID)
		if err != nil {
			log.Printf("Clear notifications error: %v", err)
			utils.SendErrorResponse(w, http.StatusInternalServerError, "Failed to clear notifications")
			return
		}

		utils.SendSuccessResponse(w, map[string]interface{}{
			"message": "Read notifications cleared",
		})

	default:
		utils.SendErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
	}
}

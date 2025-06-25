package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"social_network/dbTools"
	"social_network/middleware"
	"social_network/utils"
	"time"
)

func FollowRequestHandler(db *dbTools.DB, w http.ResponseWriter, r *http.Request) {
	log.Printf("FollowRequestHandler called at %s for URL %s, Method: %s", time.Now().Format(time.RFC3339), r.URL.Path, r.Method)
	middleware.SetCORSHeaders(w)

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != "POST" {
		log.Printf("Invalid method: %s", r.Method)
		utils.SendErrorResponse(w, http.StatusMethodNotAllowed, "Only POST is allowed")
		return
	}

	currentUserID, err := utils.GetUserIDFromSession(db.GetDB(), r)
	if err != nil {
		log.Printf("Session check error: %v", err)
		utils.SendErrorResponse(w, http.StatusUnauthorized, "Invalid session")
		return
	}

	var requestBody struct {
		FollowID int    `json:"follow_id"`
		Action   string `json:"action"`
	}
	if err := json.NewDecoder(r.Body).Decode(&requestBody); err != nil {
		log.Printf("Invalid request body: %v", err)
		utils.SendErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	var newStatus string
	switch requestBody.Action {
	case "accept":
		newStatus = "accepted"
	case "decline":
		newStatus = "declined"
	default:
		log.Printf("Invalid action: %s", requestBody.Action)
		utils.SendErrorResponse(w, http.StatusBadRequest, "Invalid action: must be 'accept' or 'decline'")
		return
	}

	var followedUserID, followerUserID int
	var status string
	checkQuery := `
        SELECT followed_user_id, follower_user_id, status
        FROM follows
        WHERE follow_id = ? AND status = 'pending'
    `
	err = db.GetDB().QueryRow(checkQuery, requestBody.FollowID).Scan(&followedUserID, &followerUserID, &status)
	if err != nil {
		log.Printf("Follow request fetch error: %v", err)
		utils.SendErrorResponse(w, http.StatusNotFound, "Follow request not found or not pending")
		return
	}
	if currentUserID != followedUserID {
		log.Printf("Unauthorized attempt by user %d to manage follow request %d", currentUserID, requestBody.FollowID)
		utils.SendErrorResponse(w, http.StatusForbidden, "Unauthorized to manage this request")
		return
	}

	updateQuery := `
        UPDATE follows
        SET status = ?, updated_at = datetime('now'), updater_id = ?
        WHERE follow_id = ?
    `
	result, err := db.GetDB().Exec(updateQuery, newStatus, currentUserID, requestBody.FollowID)
	if err != nil {
		log.Printf("Follow update error: %v", err)
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Failed to update follow request")
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil || rowsAffected == 0 {
		log.Printf("No rows affected for follow_id %d: %v", requestBody.FollowID, err)
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Failed to update follow request")
		return
	}

	// Update follow_request notification and create accepted notification if needed
	notificationHelpers := dbTools.NewNotificationHelpers(db)

	// Mark the original follow request notification as read
	err = notificationHelpers.UpdateFollowRequestNotificationStatus(requestBody.FollowID, currentUserID)
	if err != nil {
		log.Printf("Notification update error for follow_id %d: %v", requestBody.FollowID, err)
	}

	// Create follow_accepted notification if accepted
	if newStatus == "accepted" {
		err = notificationHelpers.CreateFollowAcceptedNotification(followerUserID, currentUserID, requestBody.FollowID)
		if err != nil {
			log.Printf("Notification creation error for follow_id %d: %v", requestBody.FollowID, err)
		}
	}
	utils.SendSuccessResponse(w, map[string]interface{}{
		"status": newStatus,
	})
}

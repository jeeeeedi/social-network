package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"social_network/dbTools"
	"social_network/middleware"
	"social_network/utils"
	"time"
)

func FollowRequestHandler(w http.ResponseWriter, r *http.Request) {
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

	db := &dbTools.DB{}
	db, err := db.OpenDB()
	if err != nil {
		log.Printf("DB connection error: %v", err)
		utils.SendErrorResponse(w, http.StatusInternalServerError, "DB connection failed")
		return
	}
	defer db.CloseDB()

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

	// Update follow_request notification
	notifyUpdateQuery := `
        UPDATE notifications
        SET status = 'read', updated_at = datetime('now'), updater_id = ?
        WHERE parent_type = 'follow' AND parent_id = ? AND action_type = 'follow_request'
    `
	result, err = db.GetDB().Exec(notifyUpdateQuery, currentUserID, requestBody.FollowID)
	if err != nil {
		log.Printf("Notification update error for follow_id %d: %v", requestBody.FollowID, err)
	} else {
		rowsAffected, _ = result.RowsAffected()
		log.Printf("Updated %d notification(s) for follow_id %d to status 'read'", rowsAffected, requestBody.FollowID)
	}

	// Create follow_accepted notification if accepted
	if newStatus == "accepted" {
		var nickname string
		err = db.GetDB().QueryRow(`SELECT COALESCE(nickname, first_name) FROM users WHERE user_id = ?`, currentUserID).Scan(&nickname)
		if err != nil || nickname == "" {
			nickname = "Someone"
		}
		content := fmt.Sprintf("%s accepted your follow request", nickname)
		notifyQuery := `
            INSERT INTO notifications (receiver_id, actor_id, action_type, parent_type, parent_id, content, status, created_at, updater_id)
            VALUES (?, ?, 'follow_accepted', 'follow', ?, ?, 'unread', datetime('now'), ?)
        `
		_, err = db.GetDB().Exec(notifyQuery, followerUserID, currentUserID, requestBody.FollowID, content, currentUserID)
		if err != nil {
			log.Printf("Notification insert error for follow_id %d: %v", requestBody.FollowID, err)
		}
	}
	utils.SendSuccessResponse(w, map[string]interface{}{
		"status": newStatus,
	})
}

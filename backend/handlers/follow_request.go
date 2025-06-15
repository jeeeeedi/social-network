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

// FollowRequestHandler handles follow request operations (GET for listing, POST for accepting/declining)
func FollowRequestHandler(w http.ResponseWriter, r *http.Request) {
	log.Printf("FollowRequestHandler called at %s for URL %s", time.Now().Format(time.RFC3339), r.URL.Path)
	middleware.SetCORSHeaders(w)

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Initialize database
	db := &dbTools.DB{}
	db, err := db.OpenDB()
	if err != nil {
		log.Printf("DB connection error: %v", err)
		utils.SendErrorResponse(w, http.StatusInternalServerError, "DB connection failed")
		return
	}
	defer db.CloseDB()

	if db.GetDB() == nil {
		log.Println("Nil database connection")
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Database not initialized")
		return
	}

	// Get current user ID from session
	currentUserID, err := utils.GetUserIDFromSession(db.GetDB(), r)
	if err != nil {
		log.Printf("Session check error: %v", err)
		utils.SendErrorResponse(w, http.StatusUnauthorized, "Invalid session")
		return
	}

	if r.Method == "GET" {
		rows, err := db.GetDB().Query(`
			SELECT f.follow_id, u.user_uuid, COALESCE(u.nickname, u.first_name) as nickname
			FROM follows f
			JOIN users u ON f.follower_user_id = u.user_id
			WHERE f.followed_user_id = ? AND f.status = 'pending'
		`, currentUserID)
		if err != nil {
			log.Printf("Query error: %v", err)
			utils.SendErrorResponse(w, http.StatusInternalServerError, "Failed to fetch requests")
			return
		}
		defer rows.Close()

		requests := []map[string]interface{}{}
		for rows.Next() {
			var followID int
			var userUUID, nickname string
			if err := rows.Scan(&followID, &userUUID, &nickname); err != nil {
				log.Printf("Row scan error: %v", err)
				continue
			}
			requests = append(requests, map[string]interface{}{
				"follow_id": followID,
				"user_uuid": userUUID,
				"nickname":  nickname,
			})
		}

		utils.SendSuccessResponse(w, map[string]interface{}{
			"requests": requests,
		})
		return
	}

	if r.Method == "POST" {
		var requestBody struct {
			FollowID int    `json:"follow_id"`
			Action   string `json:"action"`
		}
		if err := json.NewDecoder(r.Body).Decode(&requestBody); err != nil {
			log.Printf("Invalid request body: %v", err)
			utils.SendErrorResponse(w, http.StatusBadRequest, "Invalid request body")
			return
		}

		// Map action to status
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
		if int(currentUserID) != followedUserID {
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
			utils.SendErrorResponse(w, http.StatusInternalServerError, fmt.Sprintf("Failed to update follow request: %v", err))
			return
		}

		rowsAffected, err := result.RowsAffected()
		if err != nil || rowsAffected == 0 {
			log.Printf("No rows affected for follow_id %d: %v", requestBody.FollowID, err)
			utils.SendErrorResponse(w, http.StatusInternalServerError, "Failed to update follow request")
			return
		}

		// Update the follow_request notification
		notifyUpdateQuery := `
			UPDATE notifications
			SET status = ?, updated_at = datetime('now'), updater_id = ?
			WHERE parent_type = 'follow' AND parent_id = ? AND action_type = 'follow_request'
		`
		notifyStatus := newStatus // 'accepted' or 'declined' for frontend
		result, err = db.GetDB().Exec(notifyUpdateQuery, notifyStatus, currentUserID, requestBody.FollowID)
		if err != nil {
			log.Printf("Notification update error for follow_id %d: %v", requestBody.FollowID, err)
		} else {
			rowsAffected, _ = result.RowsAffected()
			log.Printf("Updated %d notification(s) for follow_id %d to status %s", rowsAffected, requestBody.FollowID, notifyStatus)
		}

		// Create a follow_accepted notification if accepted
		if newStatus == "accepted" {
			var nickname string
			err = db.GetDB().QueryRow(`SELECT COALESCE(nickname, first_name) FROM users WHERE user_id = ?`, currentUserID).Scan(&nickname)
			if err != nil || nickname == "" {
				nickname = "Someone"
			}
			content := fmt.Sprintf("%s accepted your follow request", nickname)
			notifyQuery := `
				INSERT INTO notifications (receiver_id, actor_id, action_type, parent_type, parent_id, content, status, created_at, updater_id)
				VALUES (?, ?, 'follow_accepted', 'follow', ?, ?, 'read', datetime('now'), ?)
			`
			_, err = db.GetDB().Exec(notifyQuery, followerUserID, currentUserID, requestBody.FollowID, content, currentUserID)
			if err != nil {
				log.Printf("Notification insert error for follow_id %d: %v", requestBody.FollowID, err)
			}
		}

		utils.SendSuccessResponse(w, map[string]interface{}{
			"status": newStatus,
		})
		return
	}

	utils.SendErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
}

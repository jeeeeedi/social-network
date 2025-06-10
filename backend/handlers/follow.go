package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"social_network/dbTools"
	"social_network/middleware"
	"social_network/utils"
	"strings"
	"time"
)

// FollowHandler handles follow and unfollow requests
func FollowHandler(w http.ResponseWriter, r *http.Request) {
	log.Printf("FollowHandler called at %s for URL %s", time.Now().Format(time.RFC3339), r.URL.Path)
	middleware.SetCORSHeaders(w)

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != "POST" && r.Method != "DELETE" {
		utils.SendErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	// Extract user_uuid from URL
	path := strings.TrimPrefix(r.URL.Path, "/api/follow/")
	userUUID := strings.Split(path, "/")[0]
	if userUUID == "" {
		utils.SendErrorResponse(w, http.StatusBadRequest, "Missing user UUID")
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

	// Get followed user ID from user_uuid
	var followedUserID int
	var privacy string
	userQuery := `SELECT user_id, privacy FROM users WHERE user_uuid = ? AND status = 'active'`
	err = db.GetDB().QueryRow(userQuery, userUUID).Scan(&followedUserID, &privacy)
	if err != nil {
		log.Printf("User fetch error for user_uuid %s: %v", userUUID, err)
		utils.SendErrorResponse(w, http.StatusNotFound, "User not found")
		return
	}

	// Prevent self-follow
	if int(currentUserID) == followedUserID {
		utils.SendErrorResponse(w, http.StatusBadRequest, "Cannot follow yourself")
		return
	}

	var status string
	if r.Method == "POST" {
		var existingStatus string
		var followID int
		checkQuery := `
			SELECT follow_id, status FROM follows
			WHERE follower_user_id = ? AND followed_user_id = ?
		`
		err = db.GetDB().QueryRow(checkQuery, currentUserID, followedUserID).Scan(&followID, &existingStatus)
		if err == nil {
			if existingStatus == "pending" || existingStatus == "accepted" {
				utils.SendErrorResponse(w, http.StatusBadRequest, "Already following or request pending")
				return
			}
			newStatus := "pending"
			if privacy == "public" {
				newStatus = "accepted"
			}
			updateQuery := `
				UPDATE follows
				SET status = ?, updated_at = datetime('now'), updater_id = ?
				WHERE follow_id = ?
			`
			_, err = db.GetDB().Exec(updateQuery, newStatus, currentUserID, followID)
			if err != nil {
				log.Printf("Follow update error: %v", err)
				utils.SendErrorResponse(w, http.StatusInternalServerError, "Failed to update follow status")
				return
			}
			status = newStatus
		} else if err == sql.ErrNoRows {
			status = "pending"
			if privacy == "public" {
				status = "accepted"
			}
			followQuery := `
				INSERT INTO follows (follower_user_id, followed_user_id, status, created_at, updated_at, updater_id)
				VALUES (?, ?, ?, datetime('now'), datetime('now'), ?)
			`
			result, err := db.GetDB().Exec(followQuery, currentUserID, followedUserID, status, currentUserID)
			if err != nil {
				log.Printf("Follow insert error: %v", err)
				utils.SendErrorResponse(w, http.StatusInternalServerError, "Failed to follow")
				return
			}
			if status == "pending" {
				followID64, err := result.LastInsertId()
				if err == nil {
					followID := int(followID64)
					var nickname string
					err = db.GetDB().QueryRow(`SELECT COALESCE(nickname, first_name) FROM users WHERE user_id = ?`, currentUserID).Scan(&nickname)
					if err != nil || nickname == "" {
						nickname = "Someone"
					}
					content := fmt.Sprintf("%s wants to follow you", nickname)
					notifyQuery := `
						INSERT INTO notifications (receiver_id, actor_id, action_type, parent_type, parent_id, content, status, created_at, updater_id)
						VALUES (?, ?, 'follow_request', 'follow', ?, ?, 'unread', datetime('now'), ?)
					`
					_, err = db.GetDB().Exec(notifyQuery, followedUserID, currentUserID, followID, content, currentUserID)
					if err != nil {
						log.Printf("Notification insert error: %v", err)
					}
				}
			}
		} else {
			log.Printf("Follow check error: %v", err)
			utils.SendErrorResponse(w, http.StatusInternalServerError, "Failed to check follow status")
			return
		}
	} else { // DELETE
		updateQuery := `
			UPDATE follows
			SET status = 'cancelled', updated_at = datetime('now'), updater_id = ?
			WHERE follower_user_id = ? AND followed_user_id = ?
		`
		result, err := db.GetDB().Exec(updateQuery, currentUserID, currentUserID, followedUserID)
		if err != nil {
			log.Printf("Follow cancel error: %v", err)
			utils.SendErrorResponse(w, http.StatusInternalServerError, "Failed to cancel follow")
			return
		}
		rowsAffected, _ := result.RowsAffected()
		if rowsAffected == 0 {
			utils.SendErrorResponse(w, http.StatusBadRequest, "No follow relationship to cancel")
			return
		}
		status = "cancelled"
	}

	utils.SendSuccessResponse(w, map[string]interface{}{
		"status": status,
	})
}

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
			utils.SendErrorResponse(w, http.StatusForbidden, "Unauthorized to manage this request")
			return
		}

		updateQuery := `
			UPDATE follows
			SET status = ?, updated_at = datetime('now'), updater_id = ?
			WHERE follow_id = ?
		`
		_, err = db.GetDB().Exec(updateQuery, newStatus, currentUserID, requestBody.FollowID)
		if err != nil {
			log.Printf("Follow update error: %v", err)
			utils.SendErrorResponse(w, http.StatusInternalServerError, fmt.Sprintf("Failed to update follow request: %v", err))
			return
		}

		_, err = db.GetDB().Exec(`
			UPDATE notifications
			SET status = 'read', updated_at = datetime('now'), updater_id = ?
			WHERE parent_type = 'follow' AND parent_id = ? AND action_type = 'follow_request'
		`, currentUserID, requestBody.FollowID)
		if err != nil {
			log.Printf("Notification update error: %v", err)
		}

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
				log.Printf("Notification insert error: %v", err)
			}
		}

		utils.SendSuccessResponse(w, map[string]interface{}{
			"status": newStatus,
		})
		return
	}

	utils.SendErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
}

// FollowStatusHandler checks if the current user is following a profile
func FollowStatusHandler(w http.ResponseWriter, r *http.Request) {
	log.Printf("FollowStatusHandler called at %s for URL %s", time.Now().Format(time.RFC3339), r.URL.Path)
	middleware.SetCORSHeaders(w)

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != "GET" {
		utils.SendErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	// Extract user_uuid from URL
	path := strings.TrimPrefix(r.URL.Path, "/api/follow/status/")
	userUUID := strings.Split(path, "/")[0]
	if userUUID == "" {
		utils.SendErrorResponse(w, http.StatusBadRequest, "Missing user UUID")
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

	// Get followed user ID from user_uuid
	var followedUserID int
	userQuery := `SELECT user_id FROM users WHERE user_uuid = ? AND status = 'active'`
	err = db.GetDB().QueryRow(userQuery, userUUID).Scan(&followedUserID)
	if err != nil {
		log.Printf("User fetch error for user_uuid %s: %v", userUUID, err)
		utils.SendErrorResponse(w, http.StatusNotFound, "User not found")
		return
	}

	// Check follow status
	var status string
	checkQuery := `
		SELECT status FROM follows
		WHERE follower_user_id = ? AND followed_user_id = ?
	`
	err = db.GetDB().QueryRow(checkQuery, currentUserID, followedUserID).Scan(&status)
	isFollowing := err == nil && (status == "pending" || status == "accepted")

	response := map[string]interface{}{
		"success":     true,
		"isFollowing": isFollowing,
		"status":      status,
	}
	if err != nil {
		response["status"] = ""
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

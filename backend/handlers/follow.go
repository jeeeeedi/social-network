package handlers

import (
	"database/sql"
	"encoding/json"
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
			followID64, err := result.LastInsertId()
			if err != nil {
				log.Printf("Failed to get follow_id: %v", err)
				utils.SendErrorResponse(w, http.StatusInternalServerError, "Failed to retrieve follow ID")
				return
			}
			followID = int(followID64)

			// Create notification using notification helpers
			notificationHelpers := dbTools.NewNotificationHelpers(db)
			if status == "accepted" {
				err = notificationHelpers.CreateFollowAcceptedNotification(currentUserID, followedUserID, followID)
			} else {
				err = notificationHelpers.CreateFollowRequestNotification(currentUserID, followedUserID, followID)
			}
			if err != nil {
				log.Printf("Notification creation error for follow_id %d: %v", followID, err)
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

package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"social_network/dbTools"
	"social_network/middleware"
	"social_network/utils"
	"strings"
)

// FollowHandler handles follow and unfollow requests
func FollowHandler(w http.ResponseWriter, r *http.Request) {
	middleware.SetCORSHeaders(w)

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Extract user_uuid from URL
	path := strings.TrimPrefix(r.URL.Path, "/api/follow/")
	userUUID := strings.Split(path, "/")[0]
	if userUUID == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "Missing user UUID"})
		return
	}

	db := &dbTools.DB{}
	db, err := db.OpenDB()
	if err != nil {
		fmt.Printf("DB connection error: %v\n", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "DB connection failed"})
		return
	}
	defer db.CloseDB()

	// Get current user ID from session using utility function
	currentUserID, err := utils.GetUserIDFromSession(db.GetDB(), r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "No active session"})
		return
	}

	// Get followed user ID from user_uuid
	var followedUserID int
	var privacy string
	userQuery := `SELECT user_id, privacy FROM users WHERE user_uuid = ? AND status = 'active'`
	err = db.QueryRow(userQuery, userUUID).Scan(&followedUserID, &privacy)
	if err != nil {
		fmt.Printf("User fetch error: %v\n", err)
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "User not found"})
		return
	}

	// Prevent self-follow
	if int(currentUserID) == followedUserID {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "Cannot follow yourself"})
		return
	}

	var status string
	if r.Method == "POST" {
		// Check if follow relationship exists
		var existingStatus string
		var followID int
		checkQuery := `
			SELECT follow_id, status FROM follows
			WHERE follower_user_id = ? AND followed_user_id = ?
		`
		err = db.QueryRow(checkQuery, currentUserID, followedUserID).Scan(&followID, &existingStatus)
		if err == nil {
			// If status is pending or accepted, prevent duplicate
			if existingStatus == "pending" || existingStatus == "accepted" {
				w.WriteHeader(http.StatusBadRequest)
				json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "Already following or request pending"})
				return
			}
			// If declined or cancelled, update to pending or accepted
			newStatus := "pending"
			if privacy == "public" {
				newStatus = "accepted"
			}
			updateQuery := `
				UPDATE follows
				SET status = ?, updated_at = datetime('now'), updater_id = ?
				WHERE follow_id = ?
			`
			_, err = db.Exec(updateQuery, newStatus, currentUserID, followID)
			if err != nil {
				fmt.Printf("Follow update error: %v\n", err)
				w.WriteHeader(http.StatusInternalServerError)
				json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "Failed to update follow status"})
				return
			}
			status = newStatus
		} else {
			// No existing follow, create new
			status = "pending"
			if privacy == "public" {
				status = "accepted"
			}
			followQuery := `
				INSERT INTO follows (follower_user_id, followed_user_id, status, created_at, updater_id)
				VALUES (?, ?, ?, datetime('now'), ?)
			`
			_, err = db.Exec(followQuery, currentUserID, followedUserID, status, currentUserID)
			if err != nil {
				fmt.Printf("Follow insert error: %v\n", err)
				w.WriteHeader(http.StatusInternalServerError)
				json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "Failed to follow"})
				return
			}
		}
	} else if r.Method == "DELETE" {
		// Update status to cancelled instead of deleting
		updateQuery := `
			UPDATE follows
			SET status = 'cancelled', updated_at = datetime('now'), updater_id = ?
			WHERE follower_user_id = ? AND followed_user_id = ?
		`
		result, err := db.Exec(updateQuery, currentUserID, currentUserID, followedUserID)
		if err != nil {
			fmt.Printf("Follow cancel error: %v\n", err)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "Failed to cancel follow"})
			return
		}
		rowsAffected, _ := result.RowsAffected()
		if rowsAffected == 0 {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "No follow relationship to cancel"})
			return
		}
		status = "cancelled"
	} else {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "Method not allowed"})
		return
	}

	response := map[string]interface{}{
		"success": true,
		"status":  status,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// FollowStatusHandler checks if the current user is following a profile
func FollowStatusHandler(w http.ResponseWriter, r *http.Request) {
	middleware.SetCORSHeaders(w)

	if r.Method != "GET" {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "Method not allowed"})
		return
	}

	// Extract user_uuid from URL
	path := strings.TrimPrefix(r.URL.Path, "/api/follow/status/")
	userUUID := strings.Split(path, "/")[0]
	if userUUID == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "Missing user UUID"})
		return
	}

	db := &dbTools.DB{}
	db, err := db.OpenDB()
	if err != nil {
		fmt.Printf("DB connection error: %v\n", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "DB connection failed"})
		return
	}
	defer db.CloseDB()

	// Get current user ID from session using utility function
	currentUserID, err := utils.GetUserIDFromSession(db.GetDB(), r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "No active session"})
		return
	}

	// Get followed user ID from user_uuid
	var followedUserID int
	userQuery := `SELECT user_id FROM users WHERE user_uuid = ? AND status = 'active'`
	err = db.QueryRow(userQuery, userUUID).Scan(&followedUserID)
	if err != nil {
		fmt.Printf("User fetch error: %v\n", err)
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "User not found"})
		return
	}

	// Check follow status
	var status string
	checkQuery := `
		SELECT status FROM follows
		WHERE follower_user_id = ? AND followed_user_id = ?
	`
	err = db.QueryRow(checkQuery, currentUserID, followedUserID).Scan(&status)
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

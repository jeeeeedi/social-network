package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"social_network/dbTools"
	"social_network/middleware"
)

func FollowRequestHandler(w http.ResponseWriter, r *http.Request) {
	middleware.SetCORSHeaders(w)

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	cookie, err := r.Cookie("session_id")
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "No active session"})
		return
	}

	db := &dbTools.DB{}
	db, err = db.OpenDB()
	if err != nil {
		fmt.Printf("DB connection error: %v\n", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "DB connection failed"})
		return
	}
	defer db.CloseDB()

	var currentUserID int
	sessionQuery := `
		SELECT u.user_id
		FROM users u
		JOIN sessions s ON u.user_id = s.user_id
		WHERE s.session_uuid = ? AND s.status = 'active' AND s.expires_at > datetime('now')
	`
	err = db.QueryRow(sessionQuery, cookie.Value).Scan(&currentUserID)
	if err != nil {
		fmt.Printf("Session check error: %v\n", err)
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "Invalid session"})
		return
	}

	if r.Method == "GET" {
		rows, err := db.Query(`
			SELECT f.follow_id, u.user_uuid, COALESCE(u.nickname, u.first_name) as nickname
			FROM follows f
			JOIN users u ON f.follower_user_id = u.user_id
			WHERE f.followed_user_id = ? AND f.status = 'pending'
		`, currentUserID)
		if err != nil {
			fmt.Printf("Query error: %v\n", err)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "Failed to fetch requests"})
			return
		}
		defer rows.Close()

		requests := []map[string]interface{}{}
		for rows.Next() {
			var followID int
			var userUUID, nickname string
			if err := rows.Scan(&followID, &userUUID, &nickname); err != nil {
				fmt.Printf("Row scan error: %v\n", err)
				continue
			}
			requests = append(requests, map[string]interface{}{
				"follow_id": followID,
				"user_uuid": userUUID,
				"nickname":  nickname,
			})
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success":  true,
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
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "Invalid request body"})
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
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "Invalid action: must be 'accept' or 'decline'"})
			return
		}

		var followedUserID, followerUserID int
		var status string
		checkQuery := `
			SELECT followed_user_id, follower_user_id, status
			FROM follows
			WHERE follow_id = ? AND status = 'pending'
		`
		err = db.QueryRow(checkQuery, requestBody.FollowID).Scan(&followedUserID, &followerUserID, &status)
		if err != nil {
			fmt.Printf("Follow request fetch error: %v\n", err)
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "Follow request not found or not pending"})
			return
		}
		if followedUserID != currentUserID {
			w.WriteHeader(http.StatusForbidden)
			json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "Unauthorized to manage this request"})
			return
		}

		updateQuery := `
			UPDATE follows
			SET status = ?, updated_at = datetime('now'), updater_id = ?
			WHERE follow_id = ?
		`
		_, err = db.Exec(updateQuery, newStatus, currentUserID, requestBody.FollowID)
		if err != nil {
			fmt.Printf("Follow update error: %v\n", err)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": fmt.Sprintf("Failed to update follow request: %v", err)})
			return
		}

		_, err = db.Exec(`
			UPDATE notifications
			SET status = 'read', updated_at = datetime('now'), updater_id = ?
			WHERE parent_type = 'follow' AND parent_id = ? AND action_type = 'follow_request'
		`, currentUserID, requestBody.FollowID)
		if err != nil {
			fmt.Printf("Notification update error: %v\n", err)
		}

		if newStatus == "accepted" {
			var nickname string
			err = db.QueryRow(`SELECT COALESCE(nickname, first_name) FROM users WHERE user_id = ?`, currentUserID).Scan(&nickname)
			if err != nil || nickname == "" {
				nickname = "Someone"
			}
			content := fmt.Sprintf("%s accepted your follow request", nickname)
			notifyQuery := `
				INSERT INTO notifications (receiver_id, actor_id, action_type, parent_type, parent_id, content, status, created_at, updater_id)
				VALUES (?, ?, 'follow_accepted', 'follow', ?, ?, 'unread', datetime('now'), ?)
			`
			_, err = db.Exec(notifyQuery, followerUserID, currentUserID, requestBody.FollowID, content, currentUserID)
			if err != nil {
				fmt.Printf("Notification insert error: %v\n", err)
			}
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"status":  newStatus,
		})
		return
	}

	w.WriteHeader(http.StatusMethodNotAllowed)
	json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "Method not allowed"})
}

package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"social_network/dbTools"
	"social_network/middleware"
	"strings"
	"time"
)

// PrivacyRequest represents a privacy update request
type PrivacyRequest struct {
	Privacy string `json:"privacy"`
}

// ProfileHandler fetches user profile data
func ProfileHandler(w http.ResponseWriter, r *http.Request) {
	log.Printf("ProfileHandler called at %s for URL %s", time.Now().Format(time.RFC3339), r.URL.Path)
	middleware.SetCORSHeaders(w)
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != "GET" {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "Method not allowed"})
		return
	}

	// Extract user_uuid from URL
	path := strings.TrimPrefix(r.URL.Path, "/api/profile/")
	userUUID := strings.Split(path, "/")[0]
	if userUUID == "" || userUUID == "me" || userUUID == "privacy" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "Missing user UUID"})
		return
	}

	db := &dbTools.DB{}
	db, err := db.OpenDB()
	if err != nil {
		log.Printf("DB connection error: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "DB connection failed"})
		return
	}
	defer db.CloseDB()

	// Fetch limited profile data
	var profile dbTools.User
	query := `
        SELECT user_id, user_uuid, COALESCE(nickname, '') as nickname, COALESCE(avatar, '') as avatar, privacy
        FROM users
        WHERE user_uuid = ? AND status = 'active'
    `
	err = db.QueryRow(query, userUUID).Scan(
		&profile.UserID, &profile.UserUUID, &profile.Nickname, &profile.Avatar, &profile.Privacy,
	)
	if err != nil {
		log.Printf("Profile fetch error for user_uuid %s: %v", userUUID, err)
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "User not found"})
		return
	}

	// Prepare response
	response := struct {
		Success   bool         `json:"success"`
		Profile   dbTools.User `json:"profile"`
		Followers []struct {
			UserUUID  string `json:"user_uuid"`
			FirstName string `json:"first_name"`
			LastName  string `json:"last_name"`
		} `json:"followers"`
		Following []struct {
			UserUUID  string `json:"user_uuid"`
			FirstName string `json:"first_name"`
			LastName  string `json:"last_name"`
		} `json:"following"`
	}{
		Success: true,
		Profile: profile,
	}

	// Check authorization
	isAuthorized := false
	var currentUserID int
	cookie, err := r.Cookie("session_id")
	if err == nil {
		sessionQuery := `
            SELECT u.user_id
            FROM users u
            JOIN sessions s ON u.user_id = s.user_id
            WHERE s.session_uuid = ? AND s.status = 'active' AND s.expires_at > datetime('now')
        `
		err = db.QueryRow(sessionQuery, cookie.Value).Scan(&currentUserID)
		if err != nil {
			log.Printf("Session query error for session_uuid %s: %v", cookie.Value, err)
		} else {
			if currentUserID == profile.UserID {
				isAuthorized = true
				log.Println("Authorized: Own profile")
			} else if profile.Privacy == "public" {
				isAuthorized = true
				log.Println("Authorized: Public profile")
			} else {
				followerQuery := `
                    SELECT COUNT(*)
                    FROM follows
                    WHERE follower_user_id = ? AND followed_user_id = ? AND status = 'accepted'
                `
				var followerCount int
				err = db.QueryRow(followerQuery, currentUserID, profile.UserID).Scan(&followerCount)
				if err != nil {
					log.Printf("Follower query error: %v", err)
				} else if followerCount > 0 {
					isAuthorized = true
					log.Println("Authorized: Accepted follower")
				}
			}
		}
	} else if profile.Privacy == "public" {
		isAuthorized = true
		log.Println("Authorized: Public profile, no login")
	}

	// Fetch full profile and followers if authorized
	if isAuthorized {
		query = `
            SELECT user_id, user_uuid, email, first_name, last_name, date_of_birth,
                   COALESCE(nickname, '') as nickname, COALESCE(about_me, '') as about_me,
                   COALESCE(avatar, '') as avatar, privacy, role, created_at, updated_at
            FROM users
            WHERE user_uuid = ? AND status = 'active'
        `
		var dob sql.NullTime
		err = db.QueryRow(query, userUUID).Scan(
			&profile.UserID, &profile.UserUUID, &profile.Email, &profile.FirstName,
			&profile.LastName, &dob, &profile.Nickname, &profile.AboutMe,
			&profile.Avatar, &profile.Privacy, &profile.Role, &profile.CreatedAt, &profile.UpdatedAt,
		)
		if err != nil {
			log.Printf("Full profile fetch error for user_uuid %s: %v", userUUID, err)
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "User not found"})
			return
		}
		if dob.Valid {
			profile.DateOfBirth = dob.Time
		}
		response.Profile = profile

		// Fetch followers
		log.Printf("Querying followers for user_id %d", profile.UserID)
		rows, err := db.Query(`
            SELECT u.user_uuid, COALESCE(u.first_name, '') as first_name, COALESCE(u.last_name, '') as last_name
            FROM follows f
            JOIN users u ON f.follower_user_id = u.user_id
            WHERE f.followed_user_id = ? AND f.status = 'accepted'
        `, profile.UserID)
		if err != nil {
			log.Printf("Followers query error for user_id %d: %v", profile.UserID, err)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "Failed to fetch followers"})
			return
		}
		defer rows.Close()

		followerCount := 0
		for rows.Next() {
			var follower struct {
				UserUUID  string `json:"user_uuid"`
				FirstName string `json:"first_name"`
				LastName  string `json:"last_name"`
			}
			if err := rows.Scan(&follower.UserUUID, &follower.FirstName, &follower.LastName); err != nil {
				log.Printf("Follower scan error for user_id %d: %v", profile.UserID, err)
				continue
			}
			response.Followers = append(response.Followers, follower)
			followerCount++
			log.Printf("Added follower: %s %s (%s)", follower.FirstName, follower.LastName, follower.UserUUID)
		}
		log.Printf("Found %d followers for user_id %d", followerCount, profile.UserID)
		if err = rows.Err(); err != nil {
			log.Printf("Followers rows error for user_id %d: %v", profile.UserID, err)
		}

		// Fetch following
		log.Printf("Querying following for user_id %d", profile.UserID)
		rows, err = db.Query(`
            SELECT u.user_uuid, COALESCE(u.first_name, '') as first_name, COALESCE(u.last_name, '') as last_name
            FROM follows f
            JOIN users u ON f.followed_user_id = u.user_id
            WHERE f.follower_user_id = ? AND f.status = 'accepted'
        `, profile.UserID)
		if err != nil {
			log.Printf("Following query error for user_id %d: %v", profile.UserID, err)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "Failed to fetch following"})
			return
		}
		defer rows.Close()

		followingCount := 0
		for rows.Next() {
			var following struct {
				UserUUID  string `json:"user_uuid"`
				FirstName string `json:"first_name"`
				LastName  string `json:"last_name"`
			}
			if err := rows.Scan(&following.UserUUID, &following.FirstName, &following.LastName); err != nil {
				log.Printf("Following scan error for user_id %d: %v", profile.UserID, err)
				continue
			}
			response.Following = append(response.Following, following)
			followingCount++
			log.Printf("Added following: %s %s (%s)", following.FirstName, following.LastName, following.UserUUID)
		}
		log.Printf("Found %d following for user_id %d", followingCount, profile.UserID)
		if err = rows.Err(); err != nil {
			log.Printf("Following rows error for user_id %d: %v", profile.UserID, err)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// PrivacyHandler updates user privacy setting
func PrivacyHandler(w http.ResponseWriter, r *http.Request) {
	middleware.SetCORSHeaders(w)
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != "POST" {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "Method not allowed"})
		return
	}

	cookie, err := r.Cookie("session_id")
	if err != nil {
		fmt.Printf("No session cookie: %v\n", err)
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "No active session"})
		return
	}

	var req PrivacyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		fmt.Printf("Invalid request body: %v\n", err)
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "Invalid input"})
		return
	}

	if req.Privacy != "public" && req.Privacy != "private" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "Invalid privacy setting"})
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

	var userID int
	sessionQuery := `
        SELECT u.user_id
        FROM users u
        JOIN sessions s ON u.user_id = s.user_id
        WHERE s.session_uuid = ? AND s.status = 'active' AND s.expires_at > datetime('now')
    `
	err = db.QueryRow(sessionQuery, cookie.Value).Scan(&userID)
	if err != nil {
		fmt.Printf("Session check error: %v\n", err)
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "Invalid session"})
		return
	}

	// Update privacy and auto-accept follows in a transaction
	err = db.WithTransaction(func(tx *sql.Tx) error {
		query := `UPDATE users SET privacy = ?, updated_at = datetime('now') WHERE user_id = ? AND status = 'active'`
		_, err := tx.Exec(query, req.Privacy, userID)
		if err != nil {
			return fmt.Errorf("privacy update error: %v", err)
		}

		if req.Privacy == "public" {
			followQuery := `
                UPDATE follows
                SET status = 'accepted', updated_at = datetime('now'), updater_id = ?
                WHERE followed_user_id = ? AND status = 'pending'
            `
			result, err := tx.Exec(followQuery, userID, userID)
			if err != nil {
				return fmt.Errorf("auto-accept follows error: %v", err)
			}

			// Create follow_accepted notifications
			rowsAffected, _ := result.RowsAffected()
			if rowsAffected > 0 {
				rows, err := tx.Query(`
                    SELECT follow_id, follower_user_id
                    FROM follows
                    WHERE followed_user_id = ? AND status = 'accepted'
                `, userID)
				if err != nil {
					return fmt.Errorf("fetch accepted follows error: %v", err)
				}
				defer rows.Close()

				var nickname string
				err = tx.QueryRow(`SELECT COALESCE(nickname, '') FROM users WHERE user_id = ?`, userID).Scan(&nickname)
				if err != nil || nickname == "" {
					nickname = "Someone"
				}

				for rows.Next() {
					var followID, followerUserID int
					if err := rows.Scan(&followID, &followerUserID); err != nil {
						continue
					}
					content := fmt.Sprintf("%s accepted your follow request", nickname)
					notifyQuery := `
                        INSERT INTO notifications (receiver_id, actor_id, action_type, parent_type, parent_id, content, status, created_at, updater_id)
                        VALUES (?, ?, 'follow_accepted', 'follow', ?, ?, 'unread', datetime('now'), ?)
                    `
					_, err = tx.Exec(notifyQuery, followerUserID, userID, followID, content, userID)
					if err != nil {
						fmt.Printf("Notification insert error: %v\n", err)
					}
				}
				if err = rows.Err(); err != nil {
					return fmt.Errorf("accepted follows rows error: %v", err)
				}
			}
		}
		return nil
	})
	if err != nil {
		fmt.Printf("Transaction error: %v\n", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "Failed to update privacy"})
		return
	}

	response := struct {
		Success bool   `json:"success"`
		Message string `json:"message"`
	}{
		Success: true,
		Message: "Privacy updated successfully",
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// ProfileMeHandler fetches the current user's profile
func ProfileMeHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Println("ProfileMeHandler called")
	middleware.SetCORSHeaders(w)
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != "GET" {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "Method not allowed"})
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

	cookie, err := r.Cookie("session_id")
	if err != nil {
		fmt.Printf("No session cookie: %v\n", err)
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "No active session"})
		return
	}

	var currentUserID int
	sessionQuery := `
        SELECT u.user_id
        FROM users u
        JOIN sessions s ON u.user_id = s.user_id
        WHERE s.session_uuid = ? AND s.status = 'active' AND s.expires_at > datetime('now')
    `
	err = db.QueryRow(sessionQuery, cookie.Value).Scan(&currentUserID)
	if err != nil {
		fmt.Printf("Session query error for session_uuid %s: %v\n", cookie.Value, err)
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "Invalid session"})
		return
	}
	fmt.Printf("Session validated for user_id %d\n", currentUserID)

	var profile dbTools.User
	query := `
        SELECT user_id, user_uuid, email, first_name, last_name, date_of_birth,
               COALESCE(nickname, '') as nickname, COALESCE(about_me, '') as about_me,
               COALESCE(avatar, '') as avatar, privacy, role, created_at, updated_at
        FROM users
        WHERE user_id = ? AND status = 'active'
    `
	var dob sql.NullTime
	err = db.QueryRow(query, currentUserID).Scan(
		&profile.UserID, &profile.UserUUID, &profile.Email, &profile.FirstName,
		&profile.LastName, &dob, &profile.Nickname, &profile.AboutMe,
		&profile.Avatar, &profile.Privacy, &profile.Role, &profile.CreatedAt, &profile.UpdatedAt,
	)
	if err != nil {
		fmt.Printf("Profile fetch error for user_id %d: %v\n", currentUserID, err)
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "User not found"})
		return
	}
	if dob.Valid {
		profile.DateOfBirth = dob.Time
	}

	response := struct {
		Success   bool         `json:"success"`
		Profile   dbTools.User `json:"profile"`
		Followers []struct {
			UserUUID  string `json:"user_uuid"`
			FirstName string `json:"first_name"`
			LastName  string `json:"last_name"`
		} `json:"followers"`
		Following []struct {
			UserUUID  string `json:"user_uuid"`
			FirstName string `json:"first_name"`
			LastName  string `json:"last_name"`
		} `json:"following"`
	}{
		Success: true,
		Profile: profile,
	}

	// Fetch followers
	fmt.Printf("Fetching followers for user_id %d\n", currentUserID)
	rows, err := db.Query(`
        SELECT u.user_uuid, COALESCE(u.first_name, '') as first_name, COALESCE(u.last_name, '') as last_name
        FROM follows f
        JOIN users u ON f.follower_user_id = u.user_id
        WHERE f.followed_user_id = ? AND f.status = 'accepted'
    `, currentUserID)
	if err != nil {
		fmt.Printf("Followers query error for user_id %d: %v\n", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "Failed to fetch followers"})
		return
	}
	defer rows.Close()

	followerCount := 0
	for rows.Next() {
		var follower struct {
			UserUUID  string `json:"user_uuid"`
			FirstName string `json:"first_name"`
			LastName  string `json:"last_name"`
		}
		if err := rows.Scan(&follower.UserUUID, &follower.FirstName, &follower.LastName); err != nil {
			fmt.Printf("Follower scan error: %v\n", err)
			continue
		}
		response.Followers = append(response.Followers, follower)
		followerCount++
	}
	fmt.Printf("Found %d followers for user_id %d\n", followerCount, currentUserID)
	if err = rows.Err(); err != nil {
		fmt.Printf("Followers rows error: %v\n", err)
	}

	// Fetch following
	fmt.Printf("Fetching following for user_id %d\n", currentUserID)
	rows, err = db.Query(`
        SELECT u.user_uuid, COALESCE(u.first_name, '') as first_name, COALESCE(u.last_name, '') as last_name
        FROM follows f
        JOIN users u ON f.followed_user_id = u.user_id
        WHERE f.follower_user_id = ? AND f.status = 'accepted'
    `, currentUserID)
	if err != nil {
		fmt.Printf("Following query error for user_id %d: %v\n", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "Failed to fetch following"})
		return
	}
	defer rows.Close()

	followingCount := 0
	for rows.Next() {
		var following struct {
			UserUUID  string `json:"user_uuid"`
			FirstName string `json:"first_name"`
			LastName  string `json:"last_name"`
		}
		if err := rows.Scan(&following.UserUUID, &following.FirstName, &following.LastName); err != nil {
			fmt.Printf("Following scan error: %v\n", err)
			continue
		}
		response.Following = append(response.Following, following)
		followingCount++
	}
	fmt.Printf("Found %d following for user_id %d\n", followingCount, currentUserID)
	if err = rows.Err(); err != nil {
		fmt.Printf("Following rows error: %v\n", err)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

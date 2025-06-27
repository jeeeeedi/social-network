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

// PrivacyRequest represents a privacy update request
type PrivacyRequest struct {
	Privacy string `json:"privacy"`
}

// ProfileHandler fetches user profile data
func ProfileHandler(db *dbTools.DB, w http.ResponseWriter, r *http.Request) {
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

	// Extract user_uuid from URL path
	path := strings.TrimPrefix(r.URL.Path, "/api/profile/")
	userUUID := strings.Split(path, "/")[0]
	if userUUID == "" || userUUID == "me" || userUUID == "privacy" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "Missing user UUID"})
		return
	}

	// Fetch limited profile data
	var profile dbTools.User
	query := `
        SELECT user_id, user_uuid, COALESCE(first_name, '') as first_name, COALESCE(last_name, '') as last_name,
               COALESCE(nickname, '') as nickname, COALESCE(avatar, '') as avatar, privacy
        FROM users
        WHERE user_uuid = ? AND status = 'active'
    `
	err := db.QueryRow(query, userUUID).Scan(
		&profile.UserID, &profile.UserUUID, &profile.FirstName, &profile.LastName,
		&profile.Nickname, &profile.Avatar, &profile.Privacy,
	)
	if err != nil {
		log.Printf("Profile fetch error for user_uuid %s: %v", userUUID, err)
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "User not found"})
		return
	}

	// Prepare response
	response := struct {
		Success bool          `json:"success"`
		Profile dbTools.User  `json:"profile"`
		Posts   []interface{} `json:"posts"`
	}{
		Success: true,
		Profile: profile,
		Posts:   []interface{}{},
	}

	// Check authorization
	isAuthorized := false
	currentUserID, err := utils.GetUserIDFromSession(db.GetDB(), r)
	if err == nil {
		if int(currentUserID) == profile.UserID {
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
				w.WriteHeader(http.StatusInternalServerError)
				json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "Follower check error"})
				return
			}
			if followerCount > 0 {
				isAuthorized = true
				log.Println("Authorized: Accepted follower")
			}
		}
	} else if profile.Privacy == "public" {
		isAuthorized = true
		log.Println("Authorized: Public profile, no login")
	}

	// Fetch full profile if authorized
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
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// PrivacyHandler updates user privacy setting
func PrivacyHandler(db *dbTools.DB, w http.ResponseWriter, r *http.Request) {
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

	// Verify session and get user ID
	userID, err := utils.GetUserIDFromSession(db.GetDB(), r)
	if err != nil {
		log.Printf("No session cookie: %v", err)
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "No active session"})
		return
	}

	// Parse request body
	var req PrivacyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("Invalid request body: %v", err)
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "Invalid input"})
		return
	}

	if req.Privacy != "public" && req.Privacy != "private" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "Invalid privacy setting"})
		return
	}

	// Update privacy and auto-accept follows in a transaction
	err = db.WithTransaction(func(tx *sql.Tx) error {
		query := `UPDATE users SET privacy = ?, updated_at = datetime('now') WHERE user_id = ? AND status = 'active'`
		_, err := tx.Exec(query, req.Privacy, int(userID))
		if err != nil {
			return fmt.Errorf("privacy update error: %v", err)
		}

		if req.Privacy == "public" {
			followQuery := `
                UPDATE follows
                SET status = 'accepted', updated_at = datetime('now'), updater_id = ?
                WHERE followed_user_id = ? AND status = 'pending'
            `
			result, err := tx.Exec(followQuery, int(userID), int(userID))
			if err != nil {
				return fmt.Errorf("auto-accept follows error: %v", err)
			}

			// Create follow_accepted notifications for auto-accepted follows
			rowsAffected, _ := result.RowsAffected()
			if rowsAffected > 0 {
				rows, err := tx.Query(`
                    SELECT follow_id, follower_user_id
                    FROM follows
                    WHERE followed_user_id = ? AND status = 'accepted' AND updated_at >= datetime('now', '-1 minute')
                `, int(userID))
				if err != nil {
					return fmt.Errorf("fetch accepted follows error: %v", err)
				}
				defer rows.Close()

				// Create notifications for each auto-accepted follow
				for rows.Next() {
					var followID, followerUserID int
					if err := rows.Scan(&followID, &followerUserID); err != nil {
						continue
					}

					// Use notification helpers outside transaction for now
					// Note: This creates a temporary inconsistency but avoids transaction complexity
					go func(fID, followerID, userID int) {
						db := &dbTools.DB{}
						if db, err := db.OpenDB(); err == nil {
							defer db.CloseDB()
							notificationHelpers := dbTools.NewNotificationHelpers(db)
							err = notificationHelpers.CreateFollowAcceptedNotification(followerID, userID, fID)
							if err != nil {
								log.Printf("Notification creation error: %v", err)
							}
						}
					}(followID, followerUserID, int(userID))
				}
				if err = rows.Err(); err != nil {
					return fmt.Errorf("accepted follows rows error: %v", err)
				}
			}
		}
		return nil
	})
	if err != nil {
		log.Printf("Transaction error: %v", err)
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
func ProfileMeHandler(db *dbTools.DB, w http.ResponseWriter, r *http.Request) {
	log.Println("ProfileMeHandler called")
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

	currentUserID, err := utils.GetUserIDFromSession(db.GetDB(), r)
	if err != nil {
		log.Printf("No session cookie: %v", err)
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "No active session"})
		return
	}
	log.Printf("Session validated for user_id %d", currentUserID)

	var profile dbTools.User
	query := `
        SELECT user_id, user_uuid, email, first_name, last_name, date_of_birth,
               COALESCE(nickname, '') as nickname, COALESCE(about_me, '') as about_me,
               COALESCE(avatar, '') as avatar, privacy, role, created_at, updated_at
        FROM users
        WHERE user_id = ? AND status = 'active'
    `
	var dob sql.NullTime
	err = db.QueryRow(query, int(currentUserID)).Scan(
		&profile.UserID, &profile.UserUUID, &profile.Email, &profile.FirstName,
		&profile.LastName, &dob, &profile.Nickname, &profile.AboutMe,
		&profile.Avatar, &profile.Privacy, &profile.Role, &profile.CreatedAt, &profile.UpdatedAt,
	)
	if err != nil {
		log.Printf("Profile fetch error for user_id %d: %v", currentUserID, err)
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "User not found"})
		return
	}
	if dob.Valid {
		profile.DateOfBirth = dob.Time
	}

	response := struct {
		Success bool          `json:"success"`
		Profile dbTools.User  `json:"profile"`
		Posts   []interface{} `json:"posts"`
	}{
		Success: true,
		Profile: profile,
		Posts:   []interface{}{},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

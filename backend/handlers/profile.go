package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"social_network/dbTools"
	"social_network/middleware"
	"strings"
)

// PrivacyRequest represents a privacy update request
type PrivacyRequest struct {
	Privacy string `json:"privacy"`
}

// ProfileHandler fetches user profile data
func ProfileHandler(w http.ResponseWriter, r *http.Request) {
	middleware.SetCORSHeaders(w)
	if r.Method != "GET" {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "message": "Method not allowed"})
		return
	}

	// Extract user_uuid from URL path
	path := strings.TrimPrefix(r.URL.Path, "/api/profile/")
	userUUID := strings.Split(path, "/")[0]
	if userUUID == "" || userUUID == "me" || userUUID == "privacy" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "message": "Missing user UUID"})
		return
	}

	db := &dbTools.DB{}
	var err error
	db, err = db.OpenDB()
	if err != nil {
		fmt.Printf("DB connection error: %v\n", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "message": "DB connection failed"})
		return
	}
	defer db.CloseDB()

	// Fetch limited profile data (always accessible)
	var profile dbTools.User
	query := `
        SELECT user_id, user_uuid, first_name, last_name, COALESCE(avatar, '') as avatar, privacy
        FROM users
        WHERE user_uuid = ? AND status = 'active'
    `
	err = db.QueryRow(query, userUUID).Scan(
		&profile.UserID, &profile.UserUUID, &profile.FirstName, &profile.LastName,
		&profile.Avatar, &profile.Privacy,
	)
	if err != nil {
		fmt.Printf("Profile fetch error: %v\n", err)
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "message": "User not found"})
		return
	}

	// Prepare response with limited data
	response := struct {
		Success   bool          `json:"success"`
		Profile   dbTools.User  `json:"profile"`
		Posts     []interface{} `json:"posts"`     // Placeholder
		Followers []interface{} `json:"followers"` // Placeholder
		Following []interface{} `json:"following"` // Placeholder
	}{
		Success:   true,
		Profile:   profile,
		Posts:     []interface{}{},
		Followers: []interface{}{},
		Following: []interface{}{},
	}

	// Check if full profile access is allowed
	isAuthorized := false
	cookie, err := r.Cookie("session_id")
	if err == nil {
		var currentUserID int
		sessionQuery := `
            SELECT u.user_id
            FROM users u
            JOIN sessions s ON u.user_id = s.user_id
            WHERE s.session_uuid = ? AND s.status = 'active' AND s.expires_at > datetime('now')
        `
		err = db.QueryRow(sessionQuery, cookie.Value).Scan(&currentUserID) // Fixed: Scan(&currentUserID)
		if err != nil {
			fmt.Printf("Session query error: %v\n", err)
		} else {
			fmt.Printf("currentUserID: %d, profile.UserID: %d\n", currentUserID, profile.UserID)
			if currentUserID == profile.UserID {
				isAuthorized = true // Own profile
				fmt.Println("Authorized: Own profile")
			} else if profile.Privacy == "public" {
				isAuthorized = true // Public profile
				fmt.Println("Authorized: Public profile")
			} else {
				// Check if current user is an accepted follower
				followerQuery := `
                    SELECT COUNT(*)
                    FROM follows
                    WHERE follower_user_id = ? AND followed_user_id = ? AND status = 'accepted'
                `
				var followerCount int
				err = db.QueryRow(followerQuery, currentUserID, profile.UserID).Scan(&followerCount)
				if err != nil {
					fmt.Printf("Follower query error: %v\n", err)
					w.WriteHeader(http.StatusInternalServerError)
					json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "message": "Follower check error"})
					return
				}
				if followerCount > 0 {
					isAuthorized = true
					fmt.Println("Authorized: Accepted follower")
				}
			}
		}
	} else if profile.Privacy == "public" {
		isAuthorized = true // Public profile, no login needed
		fmt.Println("Authorized: Public profile, no login")
	}

	// If authorized, fetch full profile data
	if isAuthorized {
		query = `
            SELECT user_id, user_uuid, email, first_name, last_name, date_of_birth,
                   COALESCE(nickname, '') as nickname, COALESCE(about_me, '') as about_me,
                   COALESCE(avatar, '') as avatar, privacy, role, created_at, updated_at
            FROM users
            WHERE user_uuid = ? AND status = 'active'
        `
		err = db.QueryRow(query, userUUID).Scan(
			&profile.UserID, &profile.UserUUID, &profile.Email, &profile.FirstName,
			&profile.LastName, &profile.DateOfBirth, &profile.Nickname, &profile.AboutMe,
			&profile.Avatar, &profile.Privacy, &profile.Role, &profile.CreatedAt, &profile.UpdatedAt,
		)
		if err != nil {
			fmt.Printf("Full profile fetch error: %v\n", err)
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "message": "User not found"})
			return
		}
		response.Profile = profile
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

	// Get session cookie
	cookie, err := r.Cookie("session_id")
	if err != nil {
		fmt.Printf("No session cookie: %v\n", err)
		//w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "No active session"})
		return
	}

	// Parse request body
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

	// Verify session and get user ID
	var userID int
	sessionQuery := `
		SELECT u.user_id
		FROM users u
		JOIN sessions s ON u.user_id = s.user_id
		WHERE s.session_uuid = ? AND s.status = 'active' AND s.expires_at > CURRENT_TIMESTAMP
	`
	err = db.QueryRow(sessionQuery, cookie.Value).Scan(&userID)
	if err != nil {
		fmt.Printf("Session check error: %v\n", err)
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "Invalid session"})
		return
	}

	// Update privacy
	query := `UPDATE users SET privacy = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND status = 'active'`
	_, err = db.Exec(query, req.Privacy, userID)
	if err != nil {
		fmt.Printf("Privacy update error: %v\n", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "Failed to update privacy"})
		return
	}

	// Auto-accept pending follows if privacy is set to public
	if req.Privacy == "public" {
		followQuery := `
			UPDATE follows
			SET status = 'accepted', updated_at = CURRENT_TIMESTAMP, updater_id = ?
			WHERE followed_user_id = ? AND status = 'pending'
		`
		_, err = db.Exec(followQuery, userID, userID)
		if err != nil {
			fmt.Printf("Auto-accept follows error: %v\n", err)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "Failed to auto-accept follows"})
			return
		}
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
	if r.Method != "GET" {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "Method not allowed"})
		return
	}

	db := &dbTools.DB{}
	var err error
	db, err = db.OpenDB()
	if err != nil {
		fmt.Printf("DB connection error: %v\n", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "DB connection failed"})
		return
	}
	defer db.CloseDB()

	cookie, err := r.Cookie("session_id")
	if err != nil {
		fmt.Println("No session cookie found")
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
	err = db.QueryRow(sessionQuery, cookie.Value).Scan(&currentUserID) // Fixed: Scan(&currentUserID)
	if err != nil {
		fmt.Printf("Session query error: %v\n", err)
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "Invalid session"})
		return
	}

	var profile dbTools.User
	query := `
        SELECT user_id, user_uuid, email, first_name, last_name, date_of_birth,
               COALESCE(nickname, '') as nickname, COALESCE(about_me, '') as about_me,
               COALESCE(avatar, '') as avatar, privacy, role, created_at, updated_at
        FROM users
        WHERE user_id = ? AND status = 'active'
    `
	err = db.QueryRow(query, currentUserID).Scan(
		&profile.UserID, &profile.UserUUID, &profile.Email, &profile.FirstName,
		&profile.LastName, &profile.DateOfBirth, &profile.Nickname, &profile.AboutMe,
		&profile.Avatar, &profile.Privacy, &profile.Role, &profile.CreatedAt, &profile.UpdatedAt,
	)
	if err != nil {
		fmt.Printf("Profile fetch error: %v\n", err)
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "User not found"})
		return
	}

	response := struct {
		Success bool         `json:"success"`
		Profile dbTools.User `json:"profile"`
	}{
		Success: true,
		Profile: profile,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

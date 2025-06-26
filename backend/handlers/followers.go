package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"social_network/dbTools"
	"social_network/middleware"
	"social_network/utils"
	"strings"
	"time"
)

// GetFollowersHandler fetches the list of followers for a user
func GetFollowersHandler(db *dbTools.DB, w http.ResponseWriter, r *http.Request) {
	log.Printf("GetFollowersHandler called at %s for URL %s", time.Now().Format(time.RFC3339), r.URL.Path)
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
	path := strings.TrimPrefix(r.URL.Path, "/api/followers/")
	userUUID := strings.Split(path, "/")[0]
	if userUUID == "" || userUUID == "me" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "Missing user UUID"})
		return
	}

	// Fetch user_id and privacy for authorization
	var userID int
	var privacy string
	query := `
        SELECT user_id, privacy
        FROM users
        WHERE user_uuid = ? AND status = 'active'
    `
	err := db.QueryRow(query, userUUID).Scan(&userID, &privacy)
	if err != nil {
		log.Printf("User fetch error for user_uuid %s: %v", userUUID, err)
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "User not found"})
		return
	}

	// Check authorization
	isAuthorized := false
	currentUserID, err := utils.GetUserIDFromSession(db.GetDB(), r)
	if err == nil {
		if int(currentUserID) == userID {
			isAuthorized = true
			log.Println("Authorized: Own profile")
		} else if privacy == "public" {
			isAuthorized = true
			log.Println("Authorized: Public profile")
		} else {
			followerQuery := `
                SELECT COUNT(*)
                FROM follows
                WHERE follower_user_id = ? AND followed_user_id = ? AND status = 'accepted'
            `
			var followerCount int
			err = db.QueryRow(followerQuery, currentUserID, userID).Scan(&followerCount)
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
	} else if privacy == "public" {
		isAuthorized = true
		log.Println("Authorized: Public profile, no login")
	}

	// Prepare response
	response := struct {
		Success   bool               `json:"success"`
		Followers []dbTools.Follower `json:"followers"`
	}{
		Success:   true,
		Followers: []dbTools.Follower{},
	}

	// Fetch followers if authorized
	if isAuthorized {
		log.Printf("Querying followers for user_id %d", userID)
		rows, err := db.Query(`
            SELECT u.user_uuid, COALESCE(u.first_name, '') as first_name, COALESCE(u.last_name, '') as last_name
            FROM follows f
            JOIN users u ON f.follower_user_id = u.user_id
            WHERE f.followed_user_id = ? AND f.status = 'accepted' AND u.status = 'active'
        `, userID)
		if err != nil {
			log.Printf("Followers query error for user_id %d: %v", userID, err)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "Failed to fetch followers"})
			return
		}
		defer rows.Close()

		followerCount := 0
		for rows.Next() {
			var follower dbTools.Follower
			if err := rows.Scan(&follower.UserUUID, &follower.FirstName, &follower.LastName); err != nil {
				log.Printf("Follower scan error for user_id %d: %v", userID, err)
				continue
			}
			response.Followers = append(response.Followers, follower)
			followerCount++
			log.Printf("Added follower: %s %s (%s)", follower.FirstName, follower.LastName, follower.UserUUID)
		}
		log.Printf("Found %d followers for user_id %d", followerCount, userID)
		if err = rows.Err(); err != nil {
			log.Printf("Followers rows error for user_id %d: %v", userID, err)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetFollowingHandler fetches the list of users a user is following
func GetFollowingHandler(db *dbTools.DB, w http.ResponseWriter, r *http.Request) {
	log.Printf("GetFollowingHandler called at %s for URL %s", time.Now().Format(time.RFC3339), r.URL.Path)
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
	path := strings.TrimPrefix(r.URL.Path, "/api/following/")
	userUUID := strings.Split(path, "/")[0]
	if userUUID == "" || userUUID == "me" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "Missing user UUID"})
		return
	}

	// Fetch user_id and privacy for authorization
	var userID int
	var privacy string
	query := `
        SELECT user_id, privacy
        FROM users
        WHERE user_uuid = ? AND status = 'active'
    `
	err := db.QueryRow(query, userUUID).Scan(&userID, &privacy)
	if err != nil {
		log.Printf("User fetch error for user_uuid %s: %v", userUUID, err)
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "User not found"})
		return
	}

	// Check authorization
	isAuthorized := false
	currentUserID, err := utils.GetUserIDFromSession(db.GetDB(), r)
	if err == nil {
		if int(currentUserID) == userID {
			isAuthorized = true
			log.Println("Authorized: Own profile")
		} else if privacy == "public" {
			isAuthorized = true
			log.Println("Authorized: Public profile")
		} else {
			followerQuery := `
                SELECT COUNT(*)
                FROM follows
                WHERE follower_user_id = ? AND followed_user_id = ? AND status = 'accepted'
            `
			var followerCount int
			err = db.QueryRow(followerQuery, currentUserID, userID).Scan(&followerCount)
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
	} else if privacy == "public" {
		isAuthorized = true
		log.Println("Authorized: Public profile, no login")
	}

	// Prepare response
	response := struct {
		Success   bool               `json:"success"`
		Following []dbTools.Follower `json:"following"`
	}{
		Success:   true,
		Following: []dbTools.Follower{},
	}

	// Fetch following if authorized
	if isAuthorized {
		log.Printf("Querying following for user_id %d", userID)
		rows, err := db.Query(`
            SELECT u.user_uuid, COALESCE(u.first_name, '') as first_name, COALESCE(u.last_name, '') as last_name
            FROM follows f
            JOIN users u ON f.followed_user_id = u.user_id
            WHERE f.follower_user_id = ? AND f.status = 'accepted' AND u.status = 'active'
        `, userID)
		if err != nil {
			log.Printf("Following query error for user_id %d: %v", userID, err)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "Failed to fetch following"})
			return
		}
		defer rows.Close()

		followingCount := 0
		for rows.Next() {
			var following dbTools.Follower
			if err := rows.Scan(&following.UserUUID, &following.FirstName, &following.LastName); err != nil {
				log.Printf("Following scan error for user_id %d: %v", userID, err)
				continue
			}
			response.Following = append(response.Following, following)
			followingCount++
			log.Printf("Added following: %s %s (%s)", following.FirstName, following.LastName, following.UserUUID)
		}
		log.Printf("Found %d following for user_id %d", followingCount, userID)
		if err = rows.Err(); err != nil {
			log.Printf("Following rows error for user_id %d: %v", userID, err)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

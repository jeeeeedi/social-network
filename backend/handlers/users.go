package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"social_network/dbTools"
	"social_network/middleware"
	"social_network/utils"
	"time"
)

// UsersHandler fetches all active users except the logged-in user
func UsersHandler(w http.ResponseWriter, r *http.Request) {
	log.Printf("UsersHandler called at %s for URL %s", time.Now().Format(time.RFC3339), r.URL.Path)
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
	var err error
	db, err = db.OpenDB()
	if err != nil {
		log.Printf("DB connection error: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "DB connection failed"})
		return
	}
	defer db.CloseDB()

	// Get the logged-in user's ID from session
	currentUserID, err := utils.GetUserIDFromSession(db.GetDB(), r)
	if err != nil {
		log.Printf("No session found: %v", err)
		// Allow unauthenticated users to see the list, or return unauthorized if required
		currentUserID = 0 // Use 0 to indicate no logged-in user
	}

	// Query for all active users except the logged-in user
	query := `
		SELECT user_id, user_uuid, COALESCE(first_name, '') as first_name, 
		       COALESCE(last_name, '') as last_name, COALESCE(nickname, '') as nickname,
		       COALESCE(avatar, '') as avatar
		FROM users
		WHERE status = 'active' AND user_id != ?
	`
	rows, err := db.Query(query, currentUserID)
	if err != nil {
		log.Printf("Users fetch error: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "Failed to fetch users"})
		return
	}
	defer rows.Close()

	var users []dbTools.User
	for rows.Next() {
		var user dbTools.User
		err := rows.Scan(
			&user.UserID, &user.UserUUID, &user.FirstName,
			&user.LastName, &user.Nickname, &user.Avatar,
		)
		if err != nil {
			log.Printf("Row scan error: %v", err)
			continue
		}
		users = append(users, user)
	}
	if err = rows.Err(); err != nil {
		log.Printf("Rows iteration error: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "Failed to fetch users"})
		return
	}

	response := struct {
		Success bool           `json:"success"`
		Users   []dbTools.User `json:"users"`
	}{
		Success: true,
		Users:   users,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

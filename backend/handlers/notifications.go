package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"social_network/dbTools"
	"social_network/middleware"
	"strings"
)

// Notification represents a notification response
type Notification struct {
	NotificationID int    `json:"notification_id"`
	ReceiverID     int    `json:"receiver_id"`
	ActorID        int    `json:"actor_id"`
	ActionType     string `json:"action_type"`
	ParentType     string `json:"parent_type"`
	ParentID       int    `json:"parent_id"`
	Content        string `json:"content"`
	Status         string `json:"status"`
	CreatedAt      string `json:"created_at"`
	Nickname       string `json:"nickname"`
	Avatar         string `json:"avatar"`
}

// NotificationHandler manages user notifications
func NotificationHandler(w http.ResponseWriter, r *http.Request) {
	middleware.SetCORSHeaders(w)
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
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

	switch r.Method {
	case "GET":
		// List notifications
		rows, err := db.Query(`
            SELECT n.notification_id, n.receiver_id, n.actor_id, n.action_type, n.parent_type, n.parent_id, 
                   n.content, n.status, n.created_at, COALESCE(u.nickname, '') as nickname, COALESCE(u.avatar, '') as avatar
            FROM notifications n
            JOIN users u ON n.actor_id = u.user_id
            WHERE n.receiver_id = ? AND n.status != 'inactive'
            ORDER BY n.created_at DESC
        `, userID)
		if err != nil {
			fmt.Printf("Notifications query error: %v\n", err)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "Failed to fetch notifications"})
			return
		}
		defer rows.Close()

		notifications := []Notification{}
		for rows.Next() {
			var n Notification
			err = rows.Scan(&n.NotificationID, &n.ReceiverID, &n.ActorID, &n.ActionType, &n.ParentType,
				&n.ParentID, &n.Content, &n.Status, &n.CreatedAt, &n.Nickname, &n.Avatar)
			if err == nil {
				notifications = append(notifications, n)
			}
		}
		if err = rows.Err(); err != nil {
			fmt.Printf("Notifications rows error: %v\n", err)
		}

		response := struct {
			Success       bool           `json:"success"`
			Notifications []Notification `json:"notifications"`
		}{
			Success:       true,
			Notifications: notifications,
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)

	case "POST":
		// Mark notification as read
		path := strings.TrimPrefix(r.URL.Path, "/api/notifications/")
		notificationID := strings.TrimSpace(path)
		if notificationID == "" {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "Missing notification ID"})
			return
		}

		query := `
            UPDATE notifications 
            SET status = 'read', updated_at = datetime('now') 
            WHERE notification_id = ? AND receiver_id = ? AND status = 'unread'
        `
		result, err := db.Exec(query, notificationID, userID)
		if err != nil {
			fmt.Printf("Update notification error: %v\n", err)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "Failed to update notification"})
			return
		}

		rowsAffected, _ := result.RowsAffected()
		if rowsAffected == 0 {
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "Notification not found or already read"})
			return
		}

		response := struct {
			Success bool   `json:"success"`
			Message string `json:"message"`
		}{
			Success: true,
			Message: "Notification marked as read",
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)

	case "DELETE":
		// Clear all read notifications
		query := `
            UPDATE notifications 
            SET status = 'inactive', updated_at = datetime('now') 
            WHERE receiver_id = ? AND status = 'read'
        `
		_, err := db.Exec(query, userID)
		if err != nil {
			fmt.Printf("Clear notifications error: %v\n", err)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "Failed to clear notifications"})
			return
		}

		response := struct {
			Success bool   `json:"success"`
			Message string `json:"message"`
		}{
			Success: true,
			Message: "Read notifications cleared",
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)

	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "Method not allowed"})
	}
}

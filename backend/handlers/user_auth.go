package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"social_network/db/dbTools"
	"social_network/middleware"
	"social_network/utils"
	"time"

	"github.com/gofrs/uuid"
	"golang.org/x/crypto/bcrypt"
)

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Success bool   `json:"success"`
	User    User   `json:"user,omitempty"`
	Message string `json:"message,omitempty"`
}

type User struct {
	UserID    int    `json:"user_id"`
	UserUUID  string `json:"user_uuid"`
	Email     string `json:"email"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Nickname  string `json:"nickname,omitempty"`
	Privacy   string `json:"privacy"`
}

// LoginHandler handles user login
func LoginHandler(w http.ResponseWriter, r *http.Request) {
	middleware.SetCORSHeaders(w)

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var loginReq LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&loginReq); err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	if err := utils.ValidateEmail(loginReq.Email); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if err := utils.ValidatePassword(loginReq.Password); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	db := &dbTools.DB{}
	if err := db.OpenDBWithMigration(); err != nil {
		fmt.Printf("DB connection error: %v\n", err)
		http.Error(w, "DB connection failed", http.StatusInternalServerError)
		return
	}

	// Find user by email
	var user User
	var hashedPassword string
	query := `SELECT user_id, user_uuid, email, password, first_name, last_name, 
	          COALESCE(nickname, '') as nickname, privacy 
	          FROM users WHERE email = ? AND status = 'active'`

	err := db.QueryRow(query, loginReq.Email).Scan(
		&user.UserID, &user.UserUUID, &user.Email, &hashedPassword,
		&user.FirstName, &user.LastName, &user.Nickname, &user.Privacy,
	)

	if err != nil {
		fmt.Printf("User lookup error: %v\n", err)
		http.Error(w, "Invalid email or password", http.StatusUnauthorized)
		return
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(loginReq.Password)); err != nil {
		fmt.Printf("Password verification failed: %v\n", err)
		http.Error(w, "Invalid email or password", http.StatusUnauthorized)
		return
	}

	// Create session
	sessionUUID, err := uuid.NewV4()
	if err != nil {
		fmt.Printf("Session UUID generation error: %v\n", err)
		http.Error(w, "Session creation failed", http.StatusInternalServerError)
		return
	}

	// Insert session into database
	expiresAt := time.Now().Add(24 * time.Hour) // 24 hour session
	sessionQuery := `INSERT INTO sessions (session_uuid, user_id, status, created_at, expires_at) 
	                 VALUES (?, ?, 'active', CURRENT_TIMESTAMP, ?)`

	_, err = db.Exec(sessionQuery, sessionUUID.String(), user.UserID, expiresAt)
	if err != nil {
		fmt.Printf("Session creation error: %v\n", err)
		http.Error(w, "Session creation failed", http.StatusInternalServerError)
		return
	}

	// Set session cookie
	cookie := &http.Cookie{
		Name:     "session_id",
		Value:    sessionUUID.String(),
		Expires:  expiresAt,
		HttpOnly: true,
		Secure:   false, // Set to true in production with HTTPS
		SameSite: http.SameSiteLaxMode,
		Path:     "/",
	}
	http.SetCookie(w, cookie)

	// Return success response
	response := LoginResponse{
		Success: true,
		User:    user,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// RegisterHandler handles user registration
func RegisterHandler(w http.ResponseWriter, r *http.Request) {
	middleware.SetCORSHeaders(w)
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	fmt.Fprintf(w, `{"message": "Register endpoint - ready for implementation"}`)
}

// LogoutHandler handles user logout
func LogoutHandler(w http.ResponseWriter, r *http.Request) {
	middleware.SetCORSHeaders(w)
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	fmt.Fprintf(w, `{"message": "Logout endpoint - ready for implementation"}`)
}

// SessionCheckHandler checks if user is logged in
func SessionCheckHandler(w http.ResponseWriter, r *http.Request) {
	middleware.SetCORSHeaders(w)
	if r.Method != "GET" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	fmt.Fprintf(w, `{"message": "Session check endpoint - ready for implementation"}`)
}

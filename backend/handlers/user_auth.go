package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"social_network/dbTools"
	"social_network/middleware"
	"social_network/utils"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
)

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Success bool         `json:"success"`
	User    dbTools.User `json:"user,omitempty"`
}

type SessionResponse struct {
	Success bool          `json:"success"`
	User    *dbTools.User `json:"user,omitempty"`
}

// LoginHandler handles user login
func LoginHandler(db *dbTools.DB, w http.ResponseWriter, r *http.Request) {
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
	// Find user by email
	var user dbTools.User
	var hashedPassword string
	query := `SELECT user_id, user_uuid, email, password, first_name, last_name, date_of_birth,
	          COALESCE(nickname, '') as nickname, COALESCE(about_me, '') as about_me,
	          COALESCE(avatar, '') as avatar, privacy, role, created_at, updated_at
	          FROM users WHERE email = ? AND status = 'active'`

	err := db.QueryRow(query, loginReq.Email).Scan(
		&user.UserID, &user.UserUUID, &user.Email, &hashedPassword,
		&user.FirstName, &user.LastName, &user.DateOfBirth, &user.Nickname,
		&user.AboutMe, &user.Avatar, &user.Privacy, &user.Role, &user.CreatedAt, &user.UpdatedAt,
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
	_, err = utils.CreateSession(db.GetDB(), w, int64(user.UserID))
	if err != nil {
		fmt.Printf("Session creation error: %v\n", err)
		http.Error(w, "Session creation failed", http.StatusInternalServerError)
		return
	}

	// Return success response
	response := LoginResponse{
		Success: true,
		User:    user,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// RegisterHandler handles user registration
func RegisterHandler(db *dbTools.DB, w http.ResponseWriter, r *http.Request) {
	middleware.SetCORSHeaders(w)

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse multipart form data
	err := r.ParseMultipartForm(10 << 20) // 10MB max
	if err != nil {
		http.Error(w, "Failed to parse form data", http.StatusBadRequest)
		return
	}

	// Extract form fields
	registerReq := struct {
		Email     string
		Password  string
		FirstName string
		LastName  string
		DOB       string
		Nickname  string
		AboutMe   string
		Avatar    string
	}{
		Email:     strings.TrimSpace(r.FormValue("email")),
		Password:  strings.TrimSpace(r.FormValue("password")),
		FirstName: strings.TrimSpace(r.FormValue("firstName")),
		LastName:  strings.TrimSpace(r.FormValue("lastName")),
		DOB:       strings.TrimSpace(r.FormValue("dob")),
		Nickname:  strings.TrimSpace(r.FormValue("nickname")),
		AboutMe:   strings.TrimSpace(r.FormValue("aboutMe")),
	}

	// Validate required fields
	if registerReq.Email == "" || registerReq.Password == "" || registerReq.FirstName == "" ||
		registerReq.LastName == "" || registerReq.DOB == "" {
		http.Error(w, "Missing required fields", http.StatusBadRequest)
		return
	}

	// Validate email and password
	if err := utils.ValidateEmail(registerReq.Email); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if err := utils.ValidatePassword(registerReq.Password); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Validate DOB format (YYYY-MM-DD)
	if _, err := time.Parse("2006-01-02", registerReq.DOB); err != nil {
		http.Error(w, "Invalid date of birth format (use YYYY-MM-DD)", http.StatusBadRequest)
		return
	}

	// Check if email already exists
	var count int
	query := `SELECT COUNT(*) FROM users WHERE email = ? AND status = 'active'`
	err = db.QueryRow(query, registerReq.Email).Scan(&count)
	if err != nil {
		fmt.Printf("Email check error: %v\n", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	if count > 0 {
		http.Error(w, "Email already registered", http.StatusBadRequest)
		return
	}

	// Check if nick name already exists
	query = `SELECT COUNT(*) FROM users WHERE nickname = ? AND status = 'active'`
	err = db.QueryRow(query, registerReq.Nickname).Scan(&count)
	if err != nil {
		fmt.Printf("Nickname check error: %v\n", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	if count > 0 {
		http.Error(w, "Nickname already registered", http.StatusBadRequest)
		return
	}

	// Handle avatar upload
	file, handler, err := r.FormFile("avatar")
	if err == nil {
		// Create upload directory if it doesn't exist
		uploadDir := "public/uploads"
		if err := os.MkdirAll(uploadDir, 0755); err != nil {
			fmt.Printf("Failed to create upload directory: %v\n", err)
			http.Error(w, "Failed to save avatar", http.StatusInternalServerError)
			return
		}

		defer file.Close()
		ext := strings.ToLower(filepath.Ext(handler.Filename))
		if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".gif" {
			http.Error(w, "Invalid file type. Only JPEG, PNG, and GIF are allowed", http.StatusBadRequest)
			return
		}
		avatarUUID, err := utils.GenerateUUID()
		if err != nil {
			fmt.Printf("Avatar upload error: %v\n", err)
			http.Error(w, "Failed to process avatar", http.StatusInternalServerError)
			return
		}
		filename := avatarUUID + ext
		dst, err := os.Create(filepath.Join(uploadDir, filename))
		if err != nil {
			fmt.Printf("Avatar save error: %v\n", err)
			http.Error(w, "Failed to save avatar", http.StatusInternalServerError)
			return
		}
		defer dst.Close()
		if _, err := io.Copy(dst, file); err != nil {
			fmt.Printf("Avatar copy error: %v\n", err)
			http.Error(w, "Failed to save avatar", http.StatusInternalServerError)
			return
		}
		registerReq.Avatar = "/uploads/" + filename
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(registerReq.Password), bcrypt.DefaultCost)
	if err != nil {
		fmt.Printf("Password hashing error: %v\n", err)
		http.Error(w, "Failed to process password", http.StatusInternalServerError)
		return
	}

	// Generate user UUID
	userUUID, err := utils.GenerateUUID()
	if err != nil {
		fmt.Printf("User UUID generation error: %v\n", err)
		http.Error(w, "Failed to create user", http.StatusInternalServerError)
		return
	}

	// Insert user into database
	currentTime := time.Now()
	query = `
		INSERT INTO users (
			user_uuid, email, password, first_name, last_name, date_of_birth,
			nickname, about_me, avatar, privacy, role, status, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'private', 'user', 'active', ?, ?)`
	result, err := db.Exec(
		query,
		userUUID, registerReq.Email, string(hashedPassword),
		registerReq.FirstName, registerReq.LastName, registerReq.DOB,
		utils.NullIfEmpty(registerReq.Nickname), utils.NullIfEmpty(registerReq.AboutMe), utils.NullIfEmpty(registerReq.Avatar),
		currentTime, currentTime,
	)
	if err != nil {
		fmt.Printf("User insertion error: %v\n", err)
		http.Error(w, "Failed to register user", http.StatusInternalServerError)
		return
	}

	// Get the inserted user ID
	userID, err := result.LastInsertId()
	if err != nil {
		fmt.Printf("Failed to get user ID: %v\n", err)
		http.Error(w, "Failed to register user", http.StatusInternalServerError)
		return
	}

	// Create session
	_, err = utils.CreateSession(db.GetDB(), w, int64(userID))
	if err != nil {
		fmt.Printf("Session creation error: %v\n", err)
		http.Error(w, "Session creation failed", http.StatusInternalServerError)
		return
	}

	// Prepare user response
	// Parse DOB string to time.Time
	parsedDOB, _ := time.Parse("2006-01-02", registerReq.DOB)
	user := dbTools.User{
		UserID:      int(userID),
		UserUUID:    userUUID,
		Email:       registerReq.Email,
		FirstName:   registerReq.FirstName,
		LastName:    registerReq.LastName,
		DateOfBirth: parsedDOB,
		Nickname:    registerReq.Nickname,
		AboutMe:     registerReq.AboutMe,
		Avatar:      registerReq.Avatar,
		Privacy:     "private",
		Role:        "user",
		CreatedAt:   currentTime.Format(time.RFC3339),
		UpdatedAt:   currentTime.Format(time.RFC3339),
	}

	// Return success response
	response := LoginResponse{
		Success: true,
		User:    user,
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

// LogoutHandler handles user logout
func LogoutHandler(db *dbTools.DB, w http.ResponseWriter, r *http.Request) {
	middleware.SetCORSHeaders(w)
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	err := utils.ClearSession(db.GetDB(), w, r)
	if err != nil {
		http.Error(w, "Failed to logout", http.StatusInternalServerError)
		return
	}

	fmt.Fprintf(w, `{"success": true, "message": "Logged out successfully"}`)
}

// SessionCheckHandler checks if user is logged in
func SessionCheckHandler(db *dbTools.DB, w http.ResponseWriter, r *http.Request) {
	middleware.SetCORSHeaders(w)
	if r.Method != "GET" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Use utility function to get user ID from session
	userID, err := utils.GetUserIDFromSession(db.GetDB(), r)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		// Always return 200 OK for session check
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"message": "No active session",
		})
		return
	}

	// Fetch user details based on userID
	var user dbTools.User
	query := `
		SELECT user_id, user_uuid, email, first_name, last_name, date_of_birth,
		       COALESCE(nickname, '') as nickname, COALESCE(about_me, '') as about_me,
		       COALESCE(avatar, '') as avatar, privacy, role, created_at, updated_at
		FROM users
		WHERE user_id = ? AND status = 'active'
	`

	err = db.QueryRow(query, userID).Scan(
		&user.UserID, &user.UserUUID, &user.Email, &user.FirstName, &user.LastName,
		&user.DateOfBirth, &user.Nickname, &user.AboutMe, &user.Avatar, &user.Privacy,
		&user.Role, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		fmt.Printf("User fetch error: %v\n", err)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"message": "User not found or inactive",
		})
		return
	}

	response := SessionResponse{
		Success: true,
		User:    &user,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// CurrentUserIDHandler returns the user ID of the currently authenticated user based on the session cookie
func CurrentUserIDHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := utils.GetUserIDFromSession(db, r)
		if err != nil {
			http.Error(w, fmt.Sprintf("Failed to get user ID: %v", err), http.StatusUnauthorized)
			return
		}
		response := map[string]interface{}{
			"success": true,
			"user_id": userID,
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	}
}

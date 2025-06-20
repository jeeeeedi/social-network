package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"social_network/dbTools"
	"social_network/middleware"
	"social_network/utils"
	"strconv"
	"strings"
)

// BatchUserRequest represents a request for multiple users
type BatchUserRequest struct {
	UserIDs []int `json:"user_ids"`
}

// UserByIDHandler fetches a user by user_id
func UserByIDHandler(w http.ResponseWriter, r *http.Request) {
	middleware.SetCORSHeaders(w)
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != "GET" {
		utils.SendErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	// Extract user_id from URL path
	path := strings.TrimPrefix(r.URL.Path, "/api/users/")
	userIDStr := strings.Split(path, "/")[0]
	if userIDStr == "" || userIDStr == "batch" {
		utils.SendErrorResponse(w, http.StatusBadRequest, "Missing user ID")
		return
	}

	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	db := &dbTools.DB{}
	db, err = db.OpenDB()
	if err != nil {
		log.Printf("DB connection error: %v", err)
		utils.SendErrorResponse(w, http.StatusInternalServerError, "DB connection failed")
		return
	}
	defer db.CloseDB()

	// Verify session for access control
	_, err = utils.GetUserIDFromSession(db.GetDB(), r)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	// Fetch user data
	user, err := db.FetchUserByID(userID)
	if err != nil {
		log.Printf("User fetch error for user_id %d: %v", userID, err)
		utils.SendErrorResponse(w, http.StatusNotFound, "User not found")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

// BatchUsersHandler fetches multiple users by their IDs
func BatchUsersHandler(w http.ResponseWriter, r *http.Request) {
	middleware.SetCORSHeaders(w)
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != "POST" {
		utils.SendErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	db := &dbTools.DB{}
	db, err := db.OpenDB()
	if err != nil {
		log.Printf("DB connection error: %v", err)
		utils.SendErrorResponse(w, http.StatusInternalServerError, "DB connection failed")
		return
	}
	defer db.CloseDB()

	// Verify session for access control
	_, err = utils.GetUserIDFromSession(db.GetDB(), r)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	// Parse request body
	var req BatchUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("Invalid request body: %v", err)
		utils.SendErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if len(req.UserIDs) == 0 {
		utils.SendErrorResponse(w, http.StatusBadRequest, "No user IDs provided")
		return
	}

	if len(req.UserIDs) > 100 {
		utils.SendErrorResponse(w, http.StatusBadRequest, "Too many user IDs (max 100)")
		return
	}

	// Fetch users
	users, err := db.FetchUsersByIDs(req.UserIDs)
	if err != nil {
		log.Printf("Batch user fetch error: %v", err)
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Failed to fetch users")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}

package main

import (
	"log"
	"net/http"
	"social_network/dbTools"
	"social_network/handlers"
	"social_network/middleware"
)

// setHandlers sets up all route handlers
func setHandlers() {
	// Static file serving for uploads
	http.Handle("/uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir("public/uploads"))))

	// API routes
	http.HandleFunc("/api/groups/", handlers.GroupsHandler)
	http.HandleFunc("/", handlers.HomeHandler)
	http.HandleFunc("/api/login", handlers.LoginHandler)
	http.HandleFunc("/api/register", handlers.RegisterHandler)
	http.HandleFunc("/api/logout", handlers.LogoutHandler)
	http.HandleFunc("/api/session-check", handlers.SessionCheckHandler)
	http.HandleFunc("/api/profile/me", handlers.ProfileMeHandler)
	http.HandleFunc("/api/profile/", handlers.ProfileHandler) // Will handle /api/profile/{uuid}
	http.HandleFunc("/api/profile/privacy", handlers.PrivacyHandler)
	http.HandleFunc("/api/follow/", handlers.FollowHandler)
	http.HandleFunc("/api/follow/status/", handlers.FollowStatusHandler)
	http.HandleFunc("/api/upload", handlers.UploadFileHandler)
}

func main() {
	// Initialize database
	db := &dbTools.DB{}
	conn, err := db.OpenDB()
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	log.Println("Database connection established successfully", conn)
	defer db.CloseDB()

	// Set up routes
	setHandlers()

	log.Println("Social Network Server starting on :8080")
	if err := http.ListenAndServe(":8080", middleware.CORSMiddleware(http.DefaultServeMux)); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}

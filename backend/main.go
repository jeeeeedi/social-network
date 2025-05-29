package main

import (
	"log"
	"net/http"
	"social_network/dbTools"
	"social_network/handlers"
)

// setHandlers sets up all route handlers
func setHandlers() {
	// API routes
	http.HandleFunc("/", handlers.HomeHandler)
	http.HandleFunc("/api/login", handlers.LoginHandler)
	http.HandleFunc("/api/register", handlers.RegisterHandler)
	http.HandleFunc("/api/logout", handlers.LogoutHandler)
	http.HandleFunc("/api/session-check", handlers.SessionCheckHandler)
}

func main() {
	// Initialize database
	db := &dbTools.DB{}
	if err := db.OpenDBWithMigration(); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.CloseDB()

	// Set up routes
	setHandlers()

	log.Println("Social Network Server starting on :8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}

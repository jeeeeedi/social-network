package main

import (
	"log"
	"net/http"
	"social_network/handlers"
)

// setHandlers sets up all route handlers
func setHandlers() {
	// API routes
	http.HandleFunc("/", handlers.HomeHandler)
	http.HandleFunc("/api/login", handlers.LoginHandler)
	http.HandleFunc("/api/register", handlers.RegisterHandler)
	http.HandleFunc("/api/logout", handlers.LogoutHandler)
	http.HandleFunc("/api/session", handlers.SessionCheckHandler)
}

func main() {
	// TODO: Initialize database
	// db.ExecuteSQLFile("db/migrations/001_initial.sql")

	// Set up routes
	setHandlers()

	log.Println("Social Network Server starting on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

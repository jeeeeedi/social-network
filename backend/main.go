package main

import (
	"log"
	"net/http"
	"social_network/dbTools"
	"social_network/handlers"
	"social_network/middleware"

	"github.com/gorilla/mux"
)

// setHandlers sets up all route handlers
func setHandlers(router *mux.Router) {
	// Static file serving for uploads
	router.PathPrefix("/uploads/").Handler(http.StripPrefix("/uploads/", http.FileServer(http.Dir("public/uploads"))))

	// API routes
	router.HandleFunc("/", handlers.HomeHandler).Methods("GET", "OPTIONS")
	router.HandleFunc("/api/login", handlers.LoginHandler).Methods("POST", "OPTIONS")
	router.HandleFunc("/api/register", handlers.RegisterHandler).Methods("POST", "OPTIONS")
	router.HandleFunc("/api/logout", handlers.LogoutHandler).Methods("POST", "OPTIONS")
	router.HandleFunc("/api/session-check", handlers.SessionCheckHandler).Methods("GET", "OPTIONS")
	router.HandleFunc("/api/profile/me", handlers.ProfileMeHandler).Methods("GET", "OPTIONS")
	router.HandleFunc("/api/profile/{user_uuid}", handlers.ProfileHandler).Methods("GET", "OPTIONS")
	router.HandleFunc("/api/profile/privacy", handlers.PrivacyHandler).Methods("POST", "OPTIONS")
}

func main() {
	// Initialize database
	db := &dbTools.DB{}
	if err := db.OpenDBWithMigration(); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.CloseDB()

	// Set up router
	router := mux.NewRouter()
	router.Use(middleware.CORSMiddleware) // Apply CORS globally
	setHandlers(router)

	log.Println("Social Network Server starting on :8080")
	if err := http.ListenAndServe(":8080", router); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}

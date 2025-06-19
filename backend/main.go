package main

import (
	"log"
	"net/http"
	"social_network/dbTools"
	"social_network/handlers"
	"social_network/middleware"
)

// setHandlers sets up all route handlers
func setHandlers(db *dbTools.DB) {
	// Static file serving for uploads
	http.Handle("/uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir("public/uploads"))))

	// API routes
	http.HandleFunc("/", handlers.HomeHandler)
	http.HandleFunc("/api/login", handlers.LoginHandler)
	http.HandleFunc("/api/register", handlers.RegisterHandler)
	http.HandleFunc("/api/logout", handlers.LogoutHandler)
	http.HandleFunc("/api/session-check", handlers.SessionCheckHandler)
	http.HandleFunc("/api/profile/me", handlers.ProfileMeHandler)
	http.HandleFunc("/api/profile/", handlers.ProfileHandler) // Will handle /api/profile/{uuid}
	http.HandleFunc("/api/profile/privacy", handlers.PrivacyHandler)
	http.HandleFunc("/api/groups", handlers.GroupsHandler)  // Adding route for groups
	http.HandleFunc("/api/groups/", handlers.GroupsHandler) // Handle subroutes under groups

	// Routes for POSTS and COMMENTS
	http.HandleFunc("/api/createposts", func(w http.ResponseWriter, r *http.Request) {
		handlers.CreatePostHandler(db, w, r)
	})
	http.HandleFunc("/api/getfeedposts", func(w http.ResponseWriter, r *http.Request) {
		handlers.GetFeedPostsHandler(db, w, r)
	})
	http.HandleFunc("/api/getmyposts", func(w http.ResponseWriter, r *http.Request) {
		handlers.GetMyPostsHandler(db, w, r)
	})
	http.HandleFunc("/api/createcomment", func(w http.ResponseWriter, r *http.Request) {
		handlers.CreateCommentHandler(db, w, r)
	})

	// Routes for FOLLOWS and NOTIFICATIONS
	http.HandleFunc("/api/followers/", handlers.GetFollowersHandler)
	http.HandleFunc("/api/following/", handlers.GetFollowingHandler)
	http.HandleFunc("/api/follow/", handlers.FollowHandler)
	http.HandleFunc("/api/follow/status/", handlers.FollowStatusHandler)
	http.HandleFunc("/api/follows", handlers.FollowRequestHandler)       // Added for follow request operations
	http.HandleFunc("/api/notifications/", handlers.NotificationHandler) // Added for notifications
}

func main() {
	// Initialize database
	db := &dbTools.DB{}
	if _, err := db.OpenDB(); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.CloseDB()

	// Set up routes
	setHandlers(db)

	log.Println("Social Network Server starting on :8080")
	if err := http.ListenAndServe(":8080", middleware.CORSMiddleware(http.DefaultServeMux)); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}

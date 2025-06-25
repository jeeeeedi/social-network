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
	http.HandleFunc("/api/login", func(w http.ResponseWriter, r *http.Request) {
		handlers.LoginHandler(db, w, r)
	})
	http.HandleFunc("/api/register", func(w http.ResponseWriter, r *http.Request) {
		handlers.RegisterHandler(db, w, r)
	})
	http.HandleFunc("/api/logout", func(w http.ResponseWriter, r *http.Request) {
		handlers.LogoutHandler(db, w, r)
	})
	http.HandleFunc("/api/session-check", func(w http.ResponseWriter, r *http.Request) {
		handlers.SessionCheckHandler(db, w, r)
	})
	http.HandleFunc("/api/profile/me", func(w http.ResponseWriter, r *http.Request) {
		handlers.ProfileMeHandler(db, w, r)
	})
	http.HandleFunc("/api/profile/", func(w http.ResponseWriter, r *http.Request) {
		handlers.ProfileHandler(db, w, r)
	}) // Will handle /api/profile/{uuid}
	http.HandleFunc("/api/profile/privacy", func(w http.ResponseWriter, r *http.Request) {
		handlers.PrivacyHandler(db, w, r)
	})
	http.HandleFunc("/api/groups", func(w http.ResponseWriter, r *http.Request) {
		handlers.GroupsHandler(db, w, r)
	})
	http.HandleFunc("/api/events", func(w http.ResponseWriter, r *http.Request) {
		handlers.EventsHandler(db, w, r)
	})
	http.HandleFunc("/api/events/", func(w http.ResponseWriter, r *http.Request) {
		handlers.EventsHandler(db, w, r)
	}) // Handle event subroutes
	http.HandleFunc("/api/groups/", func(w http.ResponseWriter, r *http.Request) {
		handlers.GroupsHandler(db, w, r)
	}) // Handle subroutes under groups (must be last)

	// User API routes
	http.HandleFunc("/api/users/", func(w http.ResponseWriter, r *http.Request) {
		handlers.UserByIDHandler(db, w, r)
	})        // Handle /api/users/{id}
	http.HandleFunc("/api/users/batch", func(w http.ResponseWriter, r *http.Request) {
		handlers.BatchUsersHandler(db, w, r)
	}) // Handle batch user requests
	http.HandleFunc("/api/ws", func(w http.ResponseWriter, r *http.Request) {
		handlers.WebSocketsHandler(db, w, r)
	})

	// Routes for POSTS and COMMENTS
	http.HandleFunc("/api/createposts", func(w http.ResponseWriter, r *http.Request) {
		handlers.CreatePostHandler(db, w, r)
	})
	http.HandleFunc("/api/getfeedposts", func(w http.ResponseWriter, r *http.Request) {
		handlers.GetFeedPostsHandler(db, w, r)
	})
	http.HandleFunc("/api/getprofileposts/", func(w http.ResponseWriter, r *http.Request) {
		handlers.GetProfilePostsHandler(db, w, r)
	})
	http.HandleFunc("/api/createcomment", func(w http.ResponseWriter, r *http.Request) {
		handlers.CreateCommentHandler(db, w, r)
	})
	http.HandleFunc("/api/getgroupposts/", func(w http.ResponseWriter, r *http.Request) {
		handlers.GetGroupPostsHandler(db, w, r)
	})

	// Routes for FOLLOWS and NOTIFICATIONS
	http.HandleFunc("/api/followers/", func(w http.ResponseWriter, r *http.Request) {
		handlers.GetFollowersHandler(db, w, r)
	})
	http.HandleFunc("/api/following/", func(w http.ResponseWriter, r *http.Request) {
		handlers.GetFollowingHandler(db, w, r)
	})
	http.HandleFunc("/api/follow/", func(w http.ResponseWriter, r *http.Request) {
		handlers.FollowHandler(db, w, r)
	})
	http.HandleFunc("/api/follow/status/", func(w http.ResponseWriter, r *http.Request) {
		handlers.FollowStatusHandler(db, w, r)
	})
	http.HandleFunc("/api/follow_requests", func(w http.ResponseWriter, r *http.Request) {
		handlers.FollowRequestHandler(db, w, r)
	})
	http.HandleFunc("/api/notifications/", func(w http.ResponseWriter, r *http.Request) {
		handlers.NotificationHandler(db, w, r)
	})
	http.HandleFunc("/api/users", func(w http.ResponseWriter, r *http.Request) {
		handlers.UsersHandler(db, w, r)
	})
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

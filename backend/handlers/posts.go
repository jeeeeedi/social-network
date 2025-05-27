package handlers

import (
	"fmt"
	"net/http"
	"social_network/middleware"
)

// GetPostsHandler handles getting user feed/posts
func GetPostsHandler(w http.ResponseWriter, r *http.Request) {
	middleware.SetCORSHeaders(w)
	if r.Method != "GET" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	fmt.Fprintf(w, `{"message": "Posts endpoint - ready for implementation"}`)
}

// CreatePostHandler handles creating new posts
func CreatePostHandler(w http.ResponseWriter, r *http.Request) {
	middleware.SetCORSHeaders(w)
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	fmt.Fprintf(w, `{"message": "Create post endpoint - ready for implementation"}`)
}
 
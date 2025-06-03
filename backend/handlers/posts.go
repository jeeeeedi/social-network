package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"social_network/dbTools"
	"social_network/middleware"
	"sync"
	"time"
)

var (
	posts      []dbTools.Post
	comments   []dbTools.Comment
	postID     = 1
	commentID  = 1
	storeMutex sync.Mutex
)

/* TODOs:
- Implement a proper database connection and use it instead of in-memory storage
- Check frontend and backend integration for creating posts and comments
- Implement error handling for file uploads
- Add validation for post content (no empty posts, sanitize chars/scripts) and privacy settings
- Validate active session before doing anything
-

*/

//TODO: Probably make an error handler func that gracefully routes to an error page

// GetPostsHandler handles getting user feed/posts
func GetPostsHandler(w http.ResponseWriter, r *http.Request) {
	middleware.SetCORSHeaders(w)
	if r.Method != "GET" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	storeMutex.Lock()
	defer storeMutex.Unlock()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(posts)
}

// CreatePostHandler handles creating new posts
func CreatePostHandler(w http.ResponseWriter, r *http.Request) {
	middleware.SetCORSHeaders(w)
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	err := r.ParseMultipartForm(10 << 20) // 10MB max
	if err != nil {
		http.Error(w, "Could not parse form", http.StatusBadRequest)
		return
	}

	content := r.FormValue("content")
	privacy := r.FormValue("privacy")
	//var imageURL string

	file, handler, err := r.FormFile("file")
	if err == nil {
		defer file.Close()
		uploadDir := "./uploads"
		os.MkdirAll(uploadDir, os.ModePerm)
		filePath := filepath.Join(uploadDir, fmt.Sprintf("%d_%s", time.Now().UnixNano(), handler.Filename))
		dst, err := os.Create(filePath)
		if err != nil {
			http.Error(w, "Could not save file", http.StatusInternalServerError)
			return
		}
		defer dst.Close()
		io.Copy(dst, file)
		//imageURL = filePath
	}

	storeMutex.Lock()
	defer storeMutex.Unlock()
	post := dbTools.Post{
		PostID:    postID,
		Content:   content,
		Privacy:   privacy,
		CreatedAt: time.Now(),
	}
	comments = []dbTools.Comment{}
	/* 	if imageURL != "" {
		var uploadedFile *dbTools.File
		// You can store uploadedFile somewhere if needed
		uploadedFile = &dbTools.File{Filename: filepath.Base(imageURL)}
	} */

	postID++
	posts = append(posts, post)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(post)
}

// CreateCommentHandler handles creating new comments
func CreateCommentHandler(w http.ResponseWriter, r *http.Request) {
	middleware.SetCORSHeaders(w)
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	postIDParam := r.URL.Query().Get("postId")
	var postIDInt int
	fmt.Sscanf(postIDParam, "%d", &postIDInt)

	var req struct {
		Content string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}

	storeMutex.Lock()
	defer storeMutex.Unlock()
	comment := dbTools.Comment{
		CommentID: commentID,
		PostID:    postIDInt,
		Content:   req.Content,
		CreatedAt: time.Now(),
	}
	commentID++
	comments = append(comments, comment)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(comment)
}

//TODO: GetCommnentsHandler to get comments for a post

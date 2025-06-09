package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"social_network/dbTools"
	"social_network/middleware"
	"social_network/utils"
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
	//TODO: Replace with actual database query to get posts
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(posts)
}

// CreatePostHandler handles creating new posts
func CreatePostHandler(db *dbTools.DB, w http.ResponseWriter, r *http.Request) {
	log.Println("CreatePostHandler called")
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

	timeNow := time.Now()
	content := r.FormValue("content")
	privacy := r.FormValue("privacy")

	// Validate content
	if len(content) == 0 {
		http.Error(w, "Content cannot be empty", http.StatusBadRequest)
		return
	}
	if len(content) > 3000 {
		http.Error(w, "Content too long", http.StatusBadRequest)
		return
	}
	content = utils.Sanitize(content)

	// Validate privacy
	validPrivacy := map[string]bool{"public": true, "semiprivate": true, "private": true}
	if !validPrivacy[privacy] {
		http.Error(w, "Invalid privacy setting", http.StatusBadRequest)
		return
	}

	// Get current user ID from session
	currentUserID, err := utils.GetUserIDFromSession(db.GetDB(), r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	post := dbTools.Post{
		PosterID:  currentUserID,
		GroupID:   nil, // Regular posts (not group)
		Content:   content,
		Privacy:   privacy,
		CreatedAt: timeNow,
	}
	postID, err = db.InsertPost(&post)
	if err != nil {
		http.Error(w, "Failed to InsertPost in DB", http.StatusInternalServerError)
		return
	}

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
		_, err = io.Copy(dst, file)
		if err != nil {
			http.Error(w, "Could not save file", http.StatusInternalServerError)
			return
		}
		imageURL := filePath
		fileStruct := dbTools.File{
			UploaderID: currentUserID,
			Filename:   imageURL,
			ParentType: "post",
			ParentID:   postID,
			CreatedAt:  timeNow,
		}
		_, err = db.InsertFile(&fileStruct)
		if err != nil {
			http.Error(w, "Failed to InsertPost in DB", http.StatusInternalServerError)
			return
		}
	} // else: no file uploaded, that's OK

	//TODO: Should return the post ID/UUID or the created post object?
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

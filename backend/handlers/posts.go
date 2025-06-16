package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"social_network/dbTools"
	"social_network/middleware"
	"social_network/utils"
	"strings"
	"sync"
	"time"
)

var (
	comments   []dbTools.Comment
	postID     int
	commentID  int
	storeMutex sync.Mutex
)

/* TODOs:
- Implement a proper database connection and use it instead of in-memory storage
- Check frontend and backend integration for creating posts and comments
- Implement error handling for file uploads
- Validate active session before doing anything
-

*/

//TODO: Probably make an error handler func that gracefully routes to an error page

// GetFeedPostsHandler handles getting user feed/posts
func GetFeedPostsHandler(db *dbTools.DB, w http.ResponseWriter, r *http.Request) error {
	middleware.SetCORSHeaders(w)
	if r.Method != "GET" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return fmt.Errorf("method not allowed")
	}

	// Get the current user ID from the session
	userID, err := utils.GetUserIDFromSession(db.GetDB(), r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return err
	}

	// Get all public posts and all posts from the current user
	posts, err := db.GetFeedPosts(userID)
	if err != nil {
		http.Error(w, "Failed to retrieve posts", http.StatusInternalServerError)
		return err
	}

	// Return the posts as JSON
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(posts)
	return nil
}

// GetMyPostsHandler handles getting my/user posts
func GetMyPostsHandler(db *dbTools.DB, w http.ResponseWriter, r *http.Request) error {
	middleware.SetCORSHeaders(w)
	if r.Method != "GET" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return fmt.Errorf("method not allowed")
	}

	// Get the current user ID from the session
	userID, err := utils.GetUserIDFromSession(db.GetDB(), r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return err
	}

	// Get all public posts and all posts from the current user
	posts, err := db.GetMyPosts(userID)
	if err != nil {
		http.Error(w, "Failed to retrieve posts", http.StatusInternalServerError)
		return err
	}

	// Return the posts as JSON
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(posts)
	return nil
}

// CreatePostHandler handles creating new posts
func CreatePostHandler(db *dbTools.DB, w http.ResponseWriter, r *http.Request) error {
	middleware.SetCORSHeaders(w)
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return fmt.Errorf("method not allowed")
	}
	err := r.ParseMultipartForm(10 << 20) // 10MB max
	if err != nil {
		http.Error(w, "Could not parse form", http.StatusBadRequest)
		return err
	}

	timeNow := time.Now()
	content := r.FormValue("content")
	privacy := r.FormValue("privacy")

	// Validate content
	if len(content) == 0 {
		http.Error(w, "Content cannot be empty", http.StatusBadRequest)
		return err
	}
	if len(content) > 3000 {
		http.Error(w, "Content too long", http.StatusBadRequest)
		return err
	}
	content = utils.Sanitize(content)

	// Validate privacy
	validPrivacy := map[string]bool{"public": true, "semiprivate": true, "private": true}
	if !validPrivacy[privacy] {
		http.Error(w, "Invalid privacy setting", http.StatusBadRequest)
		return err
	}

	// Get current user ID from session
	currentUserID, err := utils.GetUserIDFromSession(db.GetDB(), r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return err
	}

	post := dbTools.Post{
		PosterID:  currentUserID,
		GroupID:   nil, // Regular posts (not group)
		Content:   content,
		Privacy:   privacy,
		CreatedAt: timeNow,
	}
	postID, err = db.InsertPostToDB(&post)
	if err != nil {
		http.Error(w, "Failed InsertPostToDB", http.StatusInternalServerError)
		return err
	}

	file, handler, err := r.FormFile("file")
	if err == nil {
		defer file.Close()
		fileMeta := &dbTools.File{
			UploaderID:   currentUserID,
			FilenameOrig: handler.Filename,
			ParentType:   "post",
			ParentID:     postID,
			CreatedAt:    timeNow,
		}
		uploadErr := db.FileUpload(file, fileMeta, r, w)
		if uploadErr != nil {
			http.Error(w, "Failed to upload file", http.StatusInternalServerError)
			return uploadErr
		}
	} else if err != http.ErrMissingFile {
		http.Error(w, "Failed to get file from form", http.StatusBadRequest)
		return err
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(post)
	return nil
}

// CreateCommentHandler handles creating new comments
func CreateCommentHandler(db *dbTools.DB, w http.ResponseWriter, r *http.Request) error {
	log.Println("CreateCommentHandler called")
	middleware.SetCORSHeaders(w)
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return fmt.Errorf("method not allowed")
	}
	err := r.ParseMultipartForm(10 << 20) // 10MB max
	if err != nil {
		http.Error(w, "Could not parse form", http.StatusBadRequest)
		log.Println("Error parsing form:", err)
		return err
	}

	timeNow := time.Now()
	content := r.FormValue("content")
	log.Print("Content:", content)
	postUUID := r.FormValue("post_uuid")
	log.Print("Post UUID:", postUUID)
	if postUUID == "" {
		http.Error(w, "Missing post UUID", http.StatusBadRequest)
		log.Println("Missing post UUID")
		return fmt.Errorf("missing post UUID")
	}

	// Validate content
	if len(content) == 0 {
		http.Error(w, "Content cannot be empty", http.StatusBadRequest)
		return err
	}
	if len(content) > 3000 {
		http.Error(w, "Content too long", http.StatusBadRequest)
		return err
	}
	content = utils.Sanitize(content)

	// Fetch the post by UUID to get its ID
	post, err := db.GetPostByUUID(r.Context(), postUUID)
	if err != nil {
		http.Error(w, "Post not found", http.StatusBadRequest)
		return err
	}

	// Get current user ID from session
	currentUserID, err := utils.GetUserIDFromSession(db.GetDB(), r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return err
	}

	comment := dbTools.Comment{
		CommenterID: currentUserID,
		PostID:      post.PostID,
		GroupID:     nil, // Regular posts (not group)
		Content:     content,
		CreatedAt:   timeNow,
	}
	commentID, err := db.InsertCommentToDB(&comment)
	if err != nil {
		http.Error(w, "Failed InsertCommentToDB", http.StatusInternalServerError)
		return err
	}

	file, handler, err := r.FormFile("file")
	if err == nil {
		defer file.Close()
		fileMeta := &dbTools.File{
			UploaderID:   currentUserID,
			FilenameOrig: handler.Filename,
			ParentType:   "comment",
			ParentID:     commentID,
			CreatedAt:    timeNow,
		}
		uploadErr := db.FileUpload(file, fileMeta, r, w)
		if uploadErr != nil {
			http.Error(w, "Failed to upload file", http.StatusInternalServerError)
			return uploadErr
		}
	} else if err != http.ErrMissingFile {
		http.Error(w, "Failed to get file from form", http.StatusBadRequest)
		return err
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(comment)
	return nil
}

// GetCommentsHandler for a specific post
func GetCommentsHandler(db *dbTools.DB, w http.ResponseWriter, r *http.Request) error {
	log.Println("GetCommentsHandler called")
	middleware.SetCORSHeaders(w)
	if r.Method != "GET" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return fmt.Errorf("method not allowed")
	}

	// Extract postUUID from URL path
	// Example: /api/getcomments/abc-123
	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 4 || parts[3] == "" {
		http.Error(w, "Missing post UUID", http.StatusBadRequest)
		log.Print("Missing post UUID")
		return fmt.Errorf("missing post UUID")
	}
	postUUID := parts[3]
	log.Print("postUUID:", postUUID)

	// Get all comments for the post
	comments, err := db.GetCommentsForPost(r.Context(), postUUID)
	if err != nil {
		http.Error(w, "Failed to retrieve comments", http.StatusInternalServerError)
		log.Print("Failed to retrieve comments:", err)
		return err
	}
	log.Print("Context: ", r.Context(), "| Retrieved comments:", comments)

	// Return the comments as JSON
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(comments)
	return nil
}

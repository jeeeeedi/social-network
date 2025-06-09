package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"social_network/dbTools"
	"social_network/middleware"
	"social_network/utils"
	"sync"
	"time"
)

var (
	//posts      []dbTools.Post
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

// GetPostsHandler handles getting user feed/posts
func GetPostsHandler(db *dbTools.DB, w http.ResponseWriter, r *http.Request) error {
	log.Println("GetPostsHandler called")
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
	log.Print("Retrieved posts:", posts)

	// Return the posts as JSON
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(posts)
	return nil
}

// CreatePostHandler handles creating new posts
func CreatePostHandler(db *dbTools.DB, w http.ResponseWriter, r *http.Request) error {
	log.Println("CreatePostHandler called")
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
	postID, err = db.InsertPost(&post)
	if err != nil {
		http.Error(w, "Failed to InsertPost in DB", http.StatusInternalServerError)
		return err
	}

	file, handler, err := r.FormFile("file")
	if err == nil {
		defer file.Close()
		fileMeta := &dbTools.File{
			UploaderID: currentUserID,
			Filename:   handler.Filename,
			ParentType: "post",
			ParentID:   postID,
			CreatedAt:  timeNow,
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
func CreateCommentHandler(w http.ResponseWriter, r *http.Request) error {
	middleware.SetCORSHeaders(w)
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return fmt.Errorf("method not allowed")
	}
	postIDParam := r.URL.Query().Get("postId")
	var postIDInt int
	fmt.Sscanf(postIDParam, "%d", &postIDInt)

	var req struct {
		Content string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return err
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
	return nil
}

//TODO: GetCommnentsHandler to get comments for a post

package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"social_network/dbTools"
	"social_network/middleware"
	"social_network/utils"
	"strings"
	"time"
)

var (
	postID int
)

/* TODOs:
- Probably make an error handler func that gracefully routes to an error page
- Validate active session before doing anything
*/

// GetFeedPostsHandler handles getting user feed/posts
func GetFeedPostsHandler(db *dbTools.DB, w http.ResponseWriter, r *http.Request) error {
	// log.Print("GetFeedPostsHandler called")
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
		// log.Print("GetFeedPostsHandler: Error retrieving posts:", err)
		return err
	}

	// log.Print("GetFeedPosts: ", userID, posts)

	// Return the posts as JSON
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(posts)
	return nil
}

// GetProfilePostsHandler handles getting my/user posts
func GetProfilePostsHandler(db *dbTools.DB, w http.ResponseWriter, r *http.Request) error {
	// log.Print("GetProfilePostsHandler called")
	middleware.SetCORSHeaders(w)
	if r.Method != "GET" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return fmt.Errorf("method not allowed")
	}

	// Get the current user ID from the session
	currentUserID, err := utils.GetUserIDFromSession(db.GetDB(), r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return err
	}

	// Extract user UUID from URL path: /api/getprofileposts/{user_uuid}
	pathParts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	var targetUserUUID string
	if len(pathParts) >= 3 {
		targetUserUUID = pathParts[2]
	}

	// Get all the targetUser's viewable posts
	posts, err := db.GetProfilePosts(currentUserID, targetUserUUID)
	if err != nil {
		http.Error(w, "Failed to retrieve posts", http.StatusInternalServerError)
		// log.Print("GetProfilePostsHandler: Error retrieving posts:", err)
		return err
	}

	// log.Print("GetProfilePosts: ", targetUserUUID, posts)

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
	//logs
	/* for key, values := range r.MultipartForm.Value {
		log.Printf("Form value: %s = %v", key, values)
	}
	for key, files := range r.MultipartForm.File {
		log.Printf("Form file: %s = %v", key, files)
	} */

	timeNow := time.Now()
	content := r.FormValue("content")
	privacy := r.FormValue("privacy")

	// Read selectedFollowers field (for private and semi-private)
	selectedFollowersStr := r.FormValue("selectedFollowers")
	var selectedFollowersUUIDs []string
	if (privacy == "semi-private" || privacy == "private") && selectedFollowersStr != "" {
		if err := json.Unmarshal([]byte(selectedFollowersStr), &selectedFollowersUUIDs); err != nil {
			http.Error(w, "Invalid selectedFollowers format", http.StatusBadRequest)
			return err
		}
	}

	// Validate content
	if len(content) == 0 {
		http.Error(w, "Content cannot be empty", http.StatusBadRequest)
		return err
	}
	if len(content) > 1100 {
		http.Error(w, "Content too long", http.StatusBadRequest)
		return err
	}
	content = utils.Sanitize(content)

	// Validate privacy
	validPrivacy := map[string]bool{"public": true, "semi-private": true, "private": true}
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
		// log.Print("CreatePostHandler: Error inserting post:", err)
		return err
	}

	// Store selected followers for semi-private and private posts
	if (privacy == "semi-private" || privacy == "private") && len(selectedFollowersUUIDs) > 0 {
		if err := db.InsertSelectedFollowers(postID, selectedFollowersUUIDs); err != nil {
			http.Error(w, "Failed to save selected followers", http.StatusInternalServerError)
			// log.Print("CreatePostHandler: Error inserting selected followers:", err)
			return err
		}
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

	// log.Print("CreatePostHandler with postID, content, privacy, selectedFollowersUUIDs: ", postID, content, privacy, selectedFollowersUUIDs)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(post)
	return nil
}

// CreateCommentHandler handles creating new comments
func CreateCommentHandler(db *dbTools.DB, w http.ResponseWriter, r *http.Request) error {
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
	postUUID := r.FormValue("post_uuid")
	if postUUID == "" {
		http.Error(w, "Missing post UUID", http.StatusBadRequest)
		return fmt.Errorf("missing post UUID")
	}

	// Validate content
	if len(content) == 0 {
		http.Error(w, "Content cannot be empty", http.StatusBadRequest)
		return err
	}
	if len(content) > 1100 {
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
		PostPrivacy: post.Privacy,
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

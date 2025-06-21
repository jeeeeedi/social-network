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
	"time"
)

var (
	postID int
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
	log.Print("GetMyPostsHandler called", r)
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

	// Extract user UUID from URL path: /api/getmyposts/{user_uuid}
	pathParts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	var targetUserUUID string
	if len(pathParts) >= 3 {
		targetUserUUID = pathParts[2]
	}

	// Get all posts from the user
	posts, err := db.GetMyPosts(currentUserID, targetUserUUID)
	if err != nil {
		http.Error(w, "Failed to retrieve posts", http.StatusInternalServerError)
		log.Print("GetMyPostsHandler: Error retrieving posts:", err)
		return err
	}

	log.Print("GetMyPosts: ", targetUserUUID, posts)

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

    // Read selectedFollowers field (for private and almost private)
    selectedFollowersStr := r.FormValue("selectedFollowers")
    var selectedFollowersIDs []int
    if (privacy == "semiprivate" || privacy == "private") && selectedFollowersStr != "" {
        if err := json.Unmarshal([]byte(selectedFollowersStr), &selectedFollowersIDs); err != nil {
            http.Error(w, "Invalid selectedFollowers format", http.StatusBadRequest)
            return err
        }
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

    // Store selected followers for semiprivate (almost private) and private posts
    if (privacy == "semiprivate" || privacy == "private") && len(selectedFollowersIDs) > 0 {
        if err := db.InsertSelectedFollowers(postID, selectedFollowersIDs); err != nil {
            http.Error(w, "Failed to save selected followers", http.StatusInternalServerError)
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

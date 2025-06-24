package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"social_network/dbTools"
	"social_network/middleware"
	"social_network/utils"
	"strconv"
	"strings"
	"time"
)

// getSubscribedGroups retrieves all groups a user is subscribed to

// GroupsHandler handles requests related to groups
func GroupsHandler(w http.ResponseWriter, r *http.Request) {
	defer func() {
		if rec := recover(); rec != nil {
			log.Println("Panic recovered in GroupsHandler:", rec)
			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		}
	}()

	middleware.SetCORSHeaders(w)
	db := &dbTools.DB{}
	var err error
	db, err = db.OpenDB()
	if err != nil {
		log.Println("Failed to open database connection:", err)
		http.Error(w, "Database unavailable", http.StatusInternalServerError)
		return
	}
	defer db.CloseDB()

	path := r.URL.Path
	segments := strings.Split(strings.Trim(path, "/"), "/")

	// Remove "api" from the path if it exists
	if len(segments) > 0 && segments[0] == "api" {
		segments = segments[1:]
	}

	// Handle my-groups endpoint
	if len(segments) == 2 && segments[0] == "groups" && segments[1] == "my-groups" {
		if r.Method == http.MethodGet {
			getMyGroups(w, r, db)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
		return
	}

	// Handle other endpoints
	if len(segments) == 1 && segments[0] == "groups" {
		switch r.Method {
		case http.MethodPost:
			createGroup(w, r, db)
		case http.MethodGet:
			getAllGroups(w, r, db)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	} else if len(segments) == 2 && segments[0] == "groups" {
		groupID, err := strconv.Atoi(segments[1])
		if err != nil {
			http.Error(w, "Invalid group ID", http.StatusBadRequest)
			return
		}
		switch r.Method {
		case http.MethodGet:
			getGroupByID(w, db, groupID)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	} else if len(segments) == 3 && segments[0] == "groups" && segments[2] == "invite" {
		groupID, err := strconv.Atoi(segments[1])
		if err != nil {
			http.Error(w, "Invalid group ID", http.StatusBadRequest)
			return
		}
		if r.Method == http.MethodPost {
			inviteToGroup(w, r, db, groupID)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	} else if len(segments) == 3 && segments[0] == "groups" && segments[2] == "request-join" {
		groupID, err := strconv.Atoi(segments[1])
		if err != nil {
			http.Error(w, "Invalid group ID", http.StatusBadRequest)
			return
		}
		if r.Method == http.MethodPost {
			requestToJoinGroup(w, r, db, groupID)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	} else if len(segments) == 4 && segments[0] == "groups" && segments[2] == "membership" {
		groupID, err := strconv.Atoi(segments[1])
		if err != nil {
			http.Error(w, "Invalid group ID", http.StatusBadRequest)
			return
		}
		userID, err := strconv.Atoi(segments[3])
		if err != nil {
			http.Error(w, "Invalid user ID", http.StatusBadRequest)
			return
		}
		if r.Method == http.MethodPost {
			updateMembershipStatus(w, r, db, groupID, userID)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	} else if len(segments) == 3 && segments[0] == "groups" && segments[2] == "members" {
		groupID, err := strconv.Atoi(segments[1])
		if err != nil {
			http.Error(w, "Invalid group ID", http.StatusBadRequest)
			return
		}
		if r.Method == http.MethodGet {
			getGroupMembers(w, r, db, groupID)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	} else if len(segments) == 1 && segments[0] == "invitations" {
		if r.Method == http.MethodGet {
			getInvitations(w, r, db)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	} else if len(segments) == 3 && segments[0] == "groups" && segments[2] == "requests" {
		groupID, err := strconv.Atoi(segments[1])
		if err != nil {
			http.Error(w, "Invalid group ID", http.StatusBadRequest)
			return
		}
		if r.Method == http.MethodGet {
			getJoinRequests(w, r, db, groupID)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	} else if len(segments) == 3 && segments[0] == "groups" && segments[2] == "events" {
		// Handle group events
		groupID, err := strconv.Atoi(segments[1])
		if err != nil {
			http.Error(w, "Invalid group ID", http.StatusBadRequest)
			return
		}
		switch r.Method {
		case http.MethodGet:
			getGroupEvents(w, db, groupID)
		case http.MethodPost:
			createGroupEvent(w, r, db, groupID)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
		return
	} else {
		http.Error(w, "Not found", http.StatusNotFound)
	}
}

func createGroup(w http.ResponseWriter, r *http.Request, db *dbTools.DB) {
	// Temporary placeholder for user ID retrieval until middleware is implemented
	userID := getUserIDFromContext(r, db)
	if userID == 0 {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Parse multipart form data for file upload support
	err := r.ParseMultipartForm(10 << 20) // 10MB max
	if err != nil {
		http.Error(w, "Could not parse form", http.StatusBadRequest)
		return
	}

	// Extract form values
	title := r.FormValue("title")
	description := r.FormValue("description")

	// Validate required fields
	if title == "" || description == "" {
		http.Error(w, "Title and description are required", http.StatusBadRequest)
		return
	}

	// Create group struct
	group := dbTools.Group{
		Title:       title,
		Description: description,
		CreatorID:   userID,
	}

	// Create the group first to get the group ID
	createdGroup, err := db.CreateGroup(&group)
	if err != nil {
		http.Error(w, "Failed to create group", http.StatusInternalServerError)
		return
	}

	// Handle avatar upload if provided
	file, handler, err := r.FormFile("avatar")
	if err == nil {
		defer file.Close()
		fileMeta := &dbTools.File{
			UploaderID:   userID,
			FilenameOrig: handler.Filename,
			ParentType:   "group",
			ParentID:     createdGroup.GroupID,
			CreatedAt:    time.Now(),
		}
		uploadErr := db.FileUpload(file, fileMeta, r, w)
		if uploadErr != nil {
			// Log error but don't fail group creation
			log.Printf("Failed to upload group avatar: %v", uploadErr)
		} else {
			// Set avatar path for response
			createdGroup.Avatar = "/uploads/" + fileMeta.FilenameNew
		}
	} else if err != http.ErrMissingFile {
		log.Printf("Error getting avatar file: %v", err)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(createdGroup)
}

func getAllGroups(w http.ResponseWriter, r *http.Request, db *dbTools.DB) {
	if db == nil {
		log.Println("Database connection is nil")
		http.Error(w, "Database unavailable", http.StatusInternalServerError)
		return
	}

	// Get userID if authenticated (optional)
	userID := getUserIDFromContext(r, db)

	log.Println("Calling db.GetAllGroups() with userID:", userID)
	groups, err := db.GetAllGroups(userID)

	if err != nil {
		log.Println("Error retrieving groups:", err)
		http.Error(w, "Failed to retrieve groups", http.StatusInternalServerError)
		return
	}
	log.Println("Groups retrieved successfully")
	if groups == nil {
		log.Println("Groups result is nil, initializing empty slice")
		groups = []map[string]interface{}{}
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(groups)
}

func getMyGroups(w http.ResponseWriter, r *http.Request, db *dbTools.DB) {
	// Temporary placeholder for user ID retrieval until middleware is implemented
	userID := getUserIDFromContext(r, db)
	if userID == 0 {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	groups, err := db.GetGroupsByUserID(userID)
	if err != nil {
		http.Error(w, "Failed to retrieve groups", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(groups)
}

func getGroupByID(w http.ResponseWriter, db *dbTools.DB, groupID int) {
	group, err := db.GetGroupByID(groupID)
	if err != nil {
		http.Error(w, "Failed to retrieve group", http.StatusInternalServerError)
		return
	}
	if group == nil {
		http.Error(w, "Group not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(group)
}

func inviteToGroup(w http.ResponseWriter, r *http.Request, db *dbTools.DB, groupID int) {
	// Temporary placeholder for user ID retrieval until middleware is implemented
	userID := getUserIDFromContext(r, db)
	if userID == 0 {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	isMember, err := db.IsGroupMember(groupID, userID)
	if err != nil {
		http.Error(w, "Failed to check permissions", http.StatusInternalServerError)
		return
	}
	if !isMember {
		http.Error(w, "Forbidden: Only group members can invite", http.StatusForbidden)
		return
	}

	var invite struct {
		InviteeID int `json:"invitee_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&invite); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	err = db.InviteToGroup(groupID, userID, invite.InviteeID)
	if err != nil {
		http.Error(w, "Failed to send invitation", http.StatusInternalServerError)
		return
	}

	// Create group invitation notification
	group, err := db.GetGroupByID(groupID)
	if err != nil {
		log.Printf("Failed to get group details for notification: %v", err)
	} else {
		notificationHelpers := dbTools.NewNotificationHelpers(db)
		err = notificationHelpers.CreateGroupInvitationNotification(userID, invite.InviteeID, groupID, group.Title)
		if err != nil {
			log.Printf("Failed to create notification for group invitation: %v", err)
			// Don't fail the request if notification creation fails
		}
	}

	w.WriteHeader(http.StatusOK)
}

func requestToJoinGroup(w http.ResponseWriter, r *http.Request, db *dbTools.DB, groupID int) {
	// Temporary placeholder for user ID retrieval until middleware is implemented
	userID := getUserIDFromContext(r, db)
	if userID == 0 {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Get group details to find the creator
	group, err := db.GetGroupByID(groupID)
	if err != nil {
		http.Error(w, "Failed to retrieve group", http.StatusInternalServerError)
		return
	}
	if group == nil {
		http.Error(w, "Group not found", http.StatusNotFound)
		return
	}

	// Get requester details for notification content
	var requesterName string
	query := `SELECT COALESCE(nickname, first_name) as name FROM users WHERE user_id = ?`
	err = db.QueryRow(query, userID).Scan(&requesterName)
	if err != nil {
		http.Error(w, "Failed to get user details", http.StatusInternalServerError)
		return
	}

	// Create the join request
	err = db.RequestToJoinGroup(groupID, userID)
	if err != nil {
		http.Error(w, "Failed to request join", http.StatusInternalServerError)
		return
	}

	// Create notification for group creator
	notificationHelpers := dbTools.NewNotificationHelpers(db)
	err = notificationHelpers.CreateGroupJoinRequestNotification(userID, group.CreatorID, groupID, group.Title)
	if err != nil {
		log.Printf("Failed to create notification: %v", err)
		// Don't fail the request if notification creation fails
	}

	w.WriteHeader(http.StatusOK)
}

func updateMembershipStatus(w http.ResponseWriter, r *http.Request, db *dbTools.DB, groupID, targetUserID int) {
	// Temporary placeholder for user ID retrieval until middleware is implemented
	userID := getUserIDFromContext(r, db)
	if userID == 0 {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var request struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if request.Status != "accepted" && request.Status != "declined" {
		http.Error(w, "Invalid status", http.StatusBadRequest)
		return
	}

	// Check if the user is the creator (for approving requests) or the target user (for responding to invitations)
	isCreator, err := db.IsGroupCreator(groupID, userID)
	if err != nil {
		http.Error(w, "Failed to check permissions", http.StatusInternalServerError)
		return
	}

	if isCreator && (request.Status == "accepted" || request.Status == "declined") {
		// Creator approving or declining a join request
		err = db.UpdateMembershipStatus(groupID, targetUserID, request.Status)
		if err != nil {
			http.Error(w, "Failed to update membership", http.StatusInternalServerError)
			return
		}

		// Update the original join request notification status
		notificationHelpers := dbTools.NewNotificationHelpers(db)
		notificationStatus := "read"
		if request.Status == "declined" {
			notificationStatus = "declined"
		}
		err = notificationHelpers.UpdateGroupJoinRequestNotificationStatus(groupID, targetUserID, userID, notificationStatus)
		if err != nil {
			log.Printf("Failed to update group join request notification status: %v", err)
			// Don't fail the request if notification update fails
		}

		// Create notification for the user whose request was processed
		group, err := db.GetGroupByID(groupID)
		if err != nil {
			log.Printf("Failed to get group details for notification: %v", err)
		} else {
			accepted := request.Status == "accepted"
			err = notificationHelpers.CreateGroupRequestResponseNotification(userID, targetUserID, groupID, group.Title, accepted)
			if err != nil {
				log.Printf("Failed to create notification for join request response: %v", err)
				// Don't fail the request if notification creation fails
			}
		}
	} else if userID == targetUserID && (request.Status == "accepted" || request.Status == "declined") {
		// User responding to an invitation
		err = db.UpdateMembershipStatus(groupID, userID, request.Status)
		if err != nil {
			http.Error(w, "Failed to update membership", http.StatusInternalServerError)
			return
		}

		// Update the notification status when user responds to group invitation
		notificationHelpers := dbTools.NewNotificationHelpers(db)
		notificationStatus := "read"
		if request.Status == "declined" {
			notificationStatus = "declined"
		}
		err = notificationHelpers.UpdateGroupInvitationNotificationStatus(groupID, userID, notificationStatus)
		if err != nil {
			log.Printf("Failed to update group invitation notification status: %v", err)
			// Don't fail the request if notification update fails
		}
	} else {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func getGroupMembers(w http.ResponseWriter, r *http.Request, db *dbTools.DB, groupID int) {
	members, err := db.GetGroupMembers(groupID)
	if err != nil {
		http.Error(w, "Failed to retrieve members", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(members)
}

func getInvitations(w http.ResponseWriter, r *http.Request, db *dbTools.DB) {
	// Temporary placeholder for user ID retrieval until middleware is implemented
	userID := getUserIDFromContext(r, db)
	if userID == 0 {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	invitations, err := db.GetInvitationsByUserID(userID)
	if err != nil {
		http.Error(w, "Failed to retrieve invitations", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(invitations)
}

func getJoinRequests(w http.ResponseWriter, r *http.Request, db *dbTools.DB, groupID int) {
	// Temporary placeholder for user ID retrieval until middleware is implemented
	userID := getUserIDFromContext(r, db)
	if userID == 0 {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	isCreator, err := db.IsGroupCreator(groupID, userID)
	if err != nil {
		http.Error(w, "Failed to check permissions", http.StatusInternalServerError)
		return
	}
	if !isCreator {
		http.Error(w, "Forbidden: Only group creator can view requests", http.StatusForbidden)
		return
	}

	requests, err := db.GetRequestsByGroupID(groupID)
	if err != nil {
		http.Error(w, "Failed to retrieve join requests", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(requests)
}

// getUserIDFromContext retrieves the user ID from the session cookie using the utils package
func getUserIDFromContext(r *http.Request, db *dbTools.DB) int {
	userID, err := utils.GetUserIDFromSession(db.GetDB(), r)
	if err != nil {
		return 0
	}
	return int(userID)
}

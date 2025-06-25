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

// GroupsHandler handles requests related to groups
func GroupsHandler(db *dbTools.DB, w http.ResponseWriter, r *http.Request) {
	defer func() {
		if rec := recover(); rec != nil {
			log.Println("Panic recovered in GroupsHandler:", rec)
			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		}
	}()

	middleware.SetCORSHeaders(w)

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
		// Handle /api/groups/{id}/events - group events
		groupID, err := strconv.Atoi(segments[1])
		if err != nil {
			http.Error(w, "Invalid group ID", http.StatusBadRequest)
			return
		}
		switch r.Method {
		case http.MethodPost:
			createGroupEventInGroups(w, r, db, groupID)
		case http.MethodGet:
			getGroupEventsInGroups(w, r, db, groupID)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	} else {
		http.Error(w, "Not found", http.StatusNotFound)
	}
}

func createGroup(w http.ResponseWriter, r *http.Request, db *dbTools.DB) {
	userID, err := utils.GetUserIDFromSession(db.GetDB(), r)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusUnauthorized, "Invalid session")
		return
	}

	// Parse multipart form data for file upload support
	err = r.ParseMultipartForm(10 << 20) // 10MB max
	if err != nil {
		utils.SendErrorResponse(w, http.StatusBadRequest, "Could not parse form")
		return
	}

	// Extract form values
	title := r.FormValue("title")
	description := r.FormValue("description")

	// Validate required fields
	if title == "" || description == "" {
		utils.SendErrorResponse(w, http.StatusBadRequest, "Title and description are required")
		return
	}

	// Create group struct
	group := dbTools.Group{
		Title:       title,
		Description: description,
		CreatorID:   int(userID),
	}

	// Create the group first to get the group ID
	createdGroup, err := db.CreateGroup(&group)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Failed to create group")
		return
	}

	// Handle avatar upload if provided
	file, handler, err := r.FormFile("avatar")
	if err == nil {
		defer file.Close()
		fileMeta := &dbTools.File{
			UploaderID:   int(userID),
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
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Database unavailable")
		return
	}

	// Get userID if authenticated (optional)
	userID, _ := utils.GetUserIDFromSession(db.GetDB(), r)

	log.Println("Calling db.GetAllGroups() with userID:", userID)
	groups, err := db.GetAllGroups(int(userID))

	if err != nil {
		log.Println("Error retrieving groups:", err)
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Failed to retrieve groups")
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
	userID, err := utils.GetUserIDFromSession(db.GetDB(), r)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusUnauthorized, "Invalid session")
		return
	}

	groups, err := db.GetGroupsByUserID(int(userID))
	if err != nil {
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Failed to retrieve groups")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(groups)
}

func getGroupByID(w http.ResponseWriter, db *dbTools.DB, groupID int) {
	group, err := db.GetGroupByID(groupID)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Failed to retrieve group")
		return
	}
	if group == nil {
		utils.SendErrorResponse(w, http.StatusNotFound, "Group not found")
		return
	}

	utils.SendSuccessResponse(w, map[string]interface{}{"group": group})
}

func inviteToGroup(w http.ResponseWriter, r *http.Request, db *dbTools.DB, groupID int) {
	userID, err := utils.GetUserIDFromSession(db.GetDB(), r)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusUnauthorized, "Invalid session")
		return
	}

	isMember, err := db.IsGroupMember(groupID, int(userID))
	if err != nil {
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Failed to check permissions")
		return
	}
	if !isMember {
		utils.SendErrorResponse(w, http.StatusForbidden, "Only group members can invite")
		return
	}

	var invite struct {
		InviteeID int `json:"invitee_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&invite); err != nil {
		utils.SendErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	err = db.InviteToGroup(groupID, int(userID), invite.InviteeID)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Failed to send invitation")
		return
	}

	// Create group invitation notification
	group, err := db.GetGroupByID(groupID)
	if err != nil {
		log.Printf("Failed to get group details for notification: %v", err)
	} else {
		notificationHelpers := dbTools.NewNotificationHelpers(db)
		err = notificationHelpers.CreateGroupInvitationNotification(int(userID), invite.InviteeID, groupID, group.Title)
		if err != nil {
			log.Printf("Failed to create notification for group invitation: %v", err)
			// Don't fail the request if notification creation fails
		}
	}

	utils.SendSuccessResponse(w, map[string]interface{}{"message": "Invitation sent"})
}

func requestToJoinGroup(w http.ResponseWriter, r *http.Request, db *dbTools.DB, groupID int) {
	userID, err := utils.GetUserIDFromSession(db.GetDB(), r)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusUnauthorized, "Invalid session")
		return
	}

	// Get group details to find the creator
	group, err := db.GetGroupByID(groupID)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Failed to retrieve group")
		return
	}
	if group == nil {
		utils.SendErrorResponse(w, http.StatusNotFound, "Group not found")
		return
	}

	// Create the join request
	err = db.RequestToJoinGroup(groupID, int(userID))
	if err != nil {
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Failed to request join")
		return
	}

	// Create notification for group creator
	notificationHelpers := dbTools.NewNotificationHelpers(db)
	err = notificationHelpers.CreateGroupJoinRequestNotification(int(userID), group.CreatorID, groupID, group.Title)
	if err != nil {
		log.Printf("Failed to create notification: %v", err)
		// Don't fail the request if notification creation fails
	}

	utils.SendSuccessResponse(w, map[string]interface{}{"message": "Join request sent"})
}

func updateMembershipStatus(w http.ResponseWriter, r *http.Request, db *dbTools.DB, groupID, targetUserID int) {
	userID, err := utils.GetUserIDFromSession(db.GetDB(), r)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusUnauthorized, "Invalid session")
		return
	}

	var request struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		utils.SendErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if request.Status != "accepted" && request.Status != "declined" {
		utils.SendErrorResponse(w, http.StatusBadRequest, "Invalid status")
		return
	}

	// Check if the user is the creator (for approving requests) or the target user (for responding to invitations)
	isCreator, err := db.IsGroupCreator(groupID, int(userID))
	if err != nil {
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Failed to check permissions")
		return
	}

	if isCreator && (request.Status == "accepted" || request.Status == "declined") {
		// Creator approving or declining a join request
		err = db.UpdateMembershipStatus(groupID, targetUserID, request.Status)
		if err != nil {
			utils.SendErrorResponse(w, http.StatusInternalServerError, "Failed to update membership")
			return
		}

		// Update the original join request notification status
		notificationHelpers := dbTools.NewNotificationHelpers(db)
		notificationStatus := utils.GetNotificationStatus(request.Status)
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
			err = notificationHelpers.CreateGroupRequestResponseNotification(int(userID), targetUserID, groupID, group.Title, accepted)
			if err != nil {
				log.Printf("Failed to create notification for join request response: %v", err)
				// Don't fail the request if notification creation fails
			}
		}
	} else if int(userID) == targetUserID && (request.Status == "accepted" || request.Status == "declined") {
		// User responding to an invitation
		err = db.UpdateMembershipStatus(groupID, int(userID), request.Status)
		if err != nil {
			utils.SendErrorResponse(w, http.StatusInternalServerError, "Failed to update membership")
			return
		}

		// Update the notification status when user responds to group invitation
		notificationHelpers := dbTools.NewNotificationHelpers(db)
		notificationStatus := utils.GetNotificationStatus(request.Status)
		err = notificationHelpers.UpdateGroupInvitationNotificationStatus(groupID, int(userID), notificationStatus)
		if err != nil {
			log.Printf("Failed to update group invitation notification status: %v", err)
			// Don't fail the request if notification update fails
		}
	} else {
		utils.SendErrorResponse(w, http.StatusForbidden, "Forbidden")
		return
	}

	utils.SendSuccessResponse(w, map[string]interface{}{"message": "Membership updated"})
}

func getGroupMembers(w http.ResponseWriter, r *http.Request, db *dbTools.DB, groupID int) {
	members, err := db.GetGroupMembers(groupID)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Failed to retrieve members")
		return
	}

	utils.SendSuccessResponse(w, map[string]interface{}{"members": members})
}

func getInvitations(w http.ResponseWriter, r *http.Request, db *dbTools.DB) {
	userID, err := utils.GetUserIDFromSession(db.GetDB(), r)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusUnauthorized, "Invalid session")
		return
	}

	invitations, err := db.GetInvitationsByUserID(int(userID))
	if err != nil {
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Failed to retrieve invitations")
		return
	}

	utils.SendSuccessResponse(w, map[string]interface{}{"invitations": invitations})
}

func getJoinRequests(w http.ResponseWriter, r *http.Request, db *dbTools.DB, groupID int) {
	userID, err := utils.GetUserIDFromSession(db.GetDB(), r)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusUnauthorized, "Invalid session")
		return
	}

	isCreator, err := db.IsGroupCreator(groupID, int(userID))
	if err != nil {
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Failed to check permissions")
		return
	}
	if !isCreator {
		utils.SendErrorResponse(w, http.StatusForbidden, "Only group creator can view requests")
		return
	}

	requests, err := db.GetRequestsByGroupID(groupID)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Failed to retrieve join requests")
		return
	}

	utils.SendSuccessResponse(w, map[string]interface{}{"requests": requests})
}

func createGroupEventInGroups(w http.ResponseWriter, r *http.Request, db *dbTools.DB, groupID int) {
	userID, err := utils.GetUserIDFromSession(db.GetDB(), r)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusUnauthorized, "Invalid session")
		return
	}

	isMember, err := db.IsGroupMember(groupID, int(userID))
	if err != nil {
		log.Printf("Error checking membership for user %d in group %d: %v", userID, groupID, err)
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Failed to check membership")
		return
	}
	if !isMember {
		log.Printf("User %d is not a member of group %d", userID, groupID)
		utils.SendErrorResponse(w, http.StatusForbidden, "Only group members can create events")
		return
	}

	var event dbTools.Event
	if err := json.NewDecoder(r.Body).Decode(&event); err != nil {
		log.Printf("Error decoding request body: %v", err)
		utils.SendErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	log.Printf("Decoded event: %+v", event)

	event.GroupID = groupID
	event.CreatorID = int(userID)
	event.Status = "upcoming" // Set default status

	log.Printf("Final event before DB insert: %+v", event)

	createdEvent, err := db.CreateEvent(&event)
	if err != nil {
		log.Printf("Error creating event in database: %v", err)
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Failed to create event")
		return
	}

	log.Printf("Successfully created event: %+v", createdEvent)

	// Create notifications for all group members
	group, err := db.GetGroupByID(groupID)
	if err != nil {
		log.Printf("Failed to get group details for event notification: %v", err)
	} else {
		notificationHelpers := dbTools.NewNotificationHelpers(db)
		err = notificationHelpers.CreateGroupEventNotification(int(userID), groupID, createdEvent.EventID, group.Title, createdEvent.Title)
		if err != nil {
			log.Printf("Failed to create event notifications: %v", err)
			// Don't fail the request if notification creation fails
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(createdEvent)
}

func getGroupEventsInGroups(w http.ResponseWriter, r *http.Request, db *dbTools.DB, groupID int) {
	events, err := db.GetEventsByGroupID(groupID)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Failed to retrieve events")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(events)
}

package handlers

import (
	"encoding/json"
	"errors"
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

	// Route based on path pattern
	switch {
	case matchRoute(segments, "groups", "my-groups"):
		handleMethodRoute(w, r, map[string]func(){
			http.MethodGet: func() { getMyGroups(w, r, db) },
		})

	case matchRoute(segments, "groups"):
		handleMethodRoute(w, r, map[string]func(){
			http.MethodPost: func() { createGroup(w, r, db) },
			http.MethodGet:  func() { getAllGroups(w, r, db) },
		})

	case matchRoute(segments, "groups", "*"):
		groupID := parseGroupID(w, segments[1])
		if groupID == -1 {
			return
		}
		handleMethodRoute(w, r, map[string]func(){
			http.MethodGet: func() { getGroupByID(w, db, groupID) },
		})

	case matchRoute(segments, "groups", "*", "invite"):
		groupID := parseGroupID(w, segments[1])
		if groupID == -1 {
			return
		}
		handleMethodRoute(w, r, map[string]func(){
			http.MethodPost: func() { inviteToGroup(w, r, db, groupID) },
		})

	case matchRoute(segments, "groups", "*", "request-join"):
		groupID := parseGroupID(w, segments[1])
		if groupID == -1 {
			return
		}
		handleMethodRoute(w, r, map[string]func(){
			http.MethodPost: func() { requestToJoinGroup(w, r, db, groupID) },
		})

	case matchRoute(segments, "groups", "*", "membership", "*"):
		groupID := parseGroupID(w, segments[1])
		userID := parseUserID(w, segments[3])
		if groupID == -1 || userID == -1 {
			return
		}
		handleMethodRoute(w, r, map[string]func(){
			http.MethodPost: func() { updateMembershipStatus(w, r, db, groupID, userID) },
		})

	case matchRoute(segments, "groups", "*", "members"):
		groupID := parseGroupID(w, segments[1])
		if groupID == -1 {
			return
		}
		handleMethodRoute(w, r, map[string]func(){
			http.MethodGet: func() { getGroupMembers(w, db, groupID) },
		})

	case matchRoute(segments, "invitations"):
		handleMethodRoute(w, r, map[string]func(){
			http.MethodGet: func() { getInvitations(w, r, db) },
		})

	case matchRoute(segments, "groups", "*", "requests"):
		groupID := parseGroupID(w, segments[1])
		if groupID == -1 {
			return
		}
		handleMethodRoute(w, r, map[string]func(){
			http.MethodGet: func() { getJoinRequests(w, r, db, groupID) },
		})

	case matchRoute(segments, "groups", "*", "events"):
		groupID := parseGroupID(w, segments[1])
		if groupID == -1 {
			return
		}
		handleMethodRoute(w, r, map[string]func(){
			http.MethodPost: func() { createGroupEventInGroups(w, r, db, groupID) },
			http.MethodGet:  func() { getGroupEventsInGroups(w, db, groupID) },
		})

	default:
		http.Error(w, "Not found", http.StatusNotFound)
	}
}

// Helper functions for cleaner routing
func matchRoute(segments []string, pattern ...string) bool {
	if len(segments) != len(pattern) {
		return false
	}
	for i, part := range pattern {
		if part != "*" && segments[i] != part {
			return false
		}
	}
	return true
}

func handleMethodRoute(w http.ResponseWriter, r *http.Request, handlers map[string]func()) {
	if handler, exists := handlers[r.Method]; exists {
		handler()
	} else {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func parseGroupID(w http.ResponseWriter, idStr string) int {
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid group ID", http.StatusBadRequest)
		return -1
	}
	return id
}

func parseUserID(w http.ResponseWriter, idStr string) int {
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return -1
	}
	return id
}

func createGroup(w http.ResponseWriter, r *http.Request, db *dbTools.DB) {
	userID, err := utils.GetUserIDFromSession(db.GetDB(), r)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusUnauthorized, "Invalid session")
		return
	}

	// Parse multipart form data for file upload support
	if err = r.ParseMultipartForm(10 << 20); err != nil { // 10MB max
		utils.SendErrorResponse(w, http.StatusBadRequest, "Could not parse form")
		return
	}

	// Extract and validate form values
	title := r.FormValue("title")
	description := r.FormValue("description")
	if title == "" || description == "" {
		utils.SendErrorResponse(w, http.StatusBadRequest, "Title and description are required")
		return
	}

	// Create group
	group := dbTools.Group{
		Title:       title,
		Description: description,
		CreatorID:   int(userID),
	}

	createdGroup, err := db.CreateGroup(&group)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Failed to create group")
		return
	}

	// Handle optional avatar upload
	handleAvatarUpload(r, db, createdGroup, int(userID))

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(createdGroup)
}

func handleAvatarUpload(r *http.Request, db *dbTools.DB, group *dbTools.Group, userID int) {
	file, handler, err := r.FormFile("avatar")
	if err == http.ErrMissingFile {
		return // No file uploaded, which is fine
	}
	if err != nil {
		log.Printf("Error getting avatar file: %v", err)
		return
	}
	defer file.Close()

	fileMeta := &dbTools.File{
		UploaderID:   userID,
		FilenameOrig: handler.Filename,
		ParentType:   "group",
		ParentID:     group.GroupID,
		CreatedAt:    time.Now(),
	}

	if uploadErr := db.FileUpload(file, fileMeta, r, nil); uploadErr != nil {
		log.Printf("Failed to upload group avatar: %v", uploadErr)
	} else {
		group.Avatar = "/uploads/" + fileMeta.FilenameNew
	}
}

func getAllGroups(w http.ResponseWriter, r *http.Request, db *dbTools.DB) {
	userID, _ := utils.GetUserIDFromSession(db.GetDB(), r)

	groups, err := db.GetAllGroups(int(userID))
	if err != nil {
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Failed to retrieve groups")
		return
	}

	if groups == nil {
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

	// Check membership permission
	if !checkGroupMembership(w, db, groupID, int(userID), "Only group members can invite") {
		return
	}

	var invite struct {
		InviteeID int `json:"invitee_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&invite); err != nil {
		utils.SendErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if err = db.InviteToGroup(groupID, int(userID), invite.InviteeID); err != nil {
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Failed to send invitation")
		return
	}

	// Create notification
	createGroupInviteNotification(db, int(userID), invite.InviteeID, groupID)

	utils.SendSuccessResponse(w, map[string]interface{}{"message": "Invitation sent"})
}

func requestToJoinGroup(w http.ResponseWriter, r *http.Request, db *dbTools.DB, groupID int) {
	userID, err := utils.GetUserIDFromSession(db.GetDB(), r)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusUnauthorized, "Invalid session")
		return
	}

	// Get group details
	group, err := db.GetGroupByID(groupID)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Failed to retrieve group")
		return
	}
	if group == nil {
		utils.SendErrorResponse(w, http.StatusNotFound, "Group not found")
		return
	}

	if err = db.RequestToJoinGroup(groupID, int(userID)); err != nil {
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Failed to request join")
		return
	}

	// Create notification for group creator
	createGroupJoinRequestNotification(db, int(userID), group.CreatorID, groupID, group.Title)

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

	// Check permissions and update accordingly
	if err = handleMembershipUpdate(db, groupID, int(userID), targetUserID, request.Status); err != nil {
		utils.SendErrorResponse(w, http.StatusForbidden, "Forbidden")
		return
	}

	utils.SendSuccessResponse(w, map[string]interface{}{"message": "Membership updated"})
}

func getGroupMembers(w http.ResponseWriter, db *dbTools.DB, groupID int) {
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

	// Check creator permission
	if !checkGroupCreator(w, db, groupID, int(userID), "Only group creator can view requests") {
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

	// Check membership permission
	if !checkGroupMembership(w, db, groupID, int(userID), "Only group members can create events") {
		return
	}

	var event dbTools.Event
	if err := json.NewDecoder(r.Body).Decode(&event); err != nil {
		utils.SendErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	event.GroupID = groupID
	event.CreatorID = int(userID)
	event.Status = "upcoming"

	createdEvent, err := db.CreateEvent(&event)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Failed to create event")
		return
	}

	// Create notifications for group members
	createGroupEventNotification(db, int(userID), groupID, createdEvent.EventID, createdEvent.Title)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(createdEvent)
}

func getGroupEventsInGroups(w http.ResponseWriter, db *dbTools.DB, groupID int) {
	events, err := db.GetEventsByGroupID(groupID)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Failed to retrieve events")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(events)
}

// Helper functions to reduce repetition
func checkGroupMembership(w http.ResponseWriter, db *dbTools.DB, groupID, userID int, errorMsg string) bool {
	isMember, err := db.IsGroupMember(groupID, userID)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Failed to check permissions")
		return false
	}
	if !isMember {
		utils.SendErrorResponse(w, http.StatusForbidden, errorMsg)
		return false
	}
	return true
}

func checkGroupCreator(w http.ResponseWriter, db *dbTools.DB, groupID, userID int, errorMsg string) bool {
	isCreator, err := db.IsGroupCreator(groupID, userID)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Failed to check permissions")
		return false
	}
	if !isCreator {
		utils.SendErrorResponse(w, http.StatusForbidden, errorMsg)
		return false
	}
	return true
}

func handleMembershipUpdate(db *dbTools.DB, groupID, userID, targetUserID int, status string) error {
	isCreator, err := db.IsGroupCreator(groupID, userID)
	if err != nil {
		return err
	}

	if isCreator || userID == targetUserID {
		return db.UpdateMembershipStatus(groupID, targetUserID, status)
	}

	return errors.New("Forbidden")
}

// Notification helper functions
func createGroupInviteNotification(db *dbTools.DB, inviterID, inviteeID, groupID int) {
	if group, err := db.GetGroupByID(groupID); err == nil {
		notificationHelpers := dbTools.NewNotificationHelpers(db)
		if err := notificationHelpers.CreateGroupInvitationNotification(inviterID, inviteeID, groupID, group.Title); err != nil {
			log.Printf("Failed to create notification for group invitation: %v", err)
		}
	}
}

func createGroupJoinRequestNotification(db *dbTools.DB, requesterID, creatorID, groupID int, groupTitle string) {
	notificationHelpers := dbTools.NewNotificationHelpers(db)
	if err := notificationHelpers.CreateGroupJoinRequestNotification(requesterID, creatorID, groupID, groupTitle); err != nil {
		log.Printf("Failed to create notification: %v", err)
	}
}

func createGroupEventNotification(db *dbTools.DB, creatorID, groupID, eventID int, eventTitle string) {
	if group, err := db.GetGroupByID(groupID); err == nil {
		notificationHelpers := dbTools.NewNotificationHelpers(db)
		if err := notificationHelpers.CreateGroupEventNotification(creatorID, groupID, eventID, group.Title, eventTitle); err != nil {
			log.Printf("Failed to create event notifications: %v", err)
		}
	}
}

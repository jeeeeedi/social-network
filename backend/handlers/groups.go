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
)

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

	if len(segments) == 1 && segments[0] == "groups" {
		switch r.Method {
		case http.MethodPost:
			createGroup(w, r, db)
		case http.MethodGet:
			getAllGroups(w, db)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	} else if len(segments) == 2 && segments[0] == "groups" && segments[1] == "my-groups" {
		if r.Method == http.MethodGet {
			getMyGroups(w, r, db)
		} else {
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
		groupID, err := strconv.Atoi(segments[1])
		if err != nil {
			http.Error(w, "Invalid group ID", http.StatusBadRequest)
			return
		}
		switch r.Method {
		case http.MethodPost:
			createGroupEvent(w, r, db, groupID)
		case http.MethodGet:
			getGroupEvents(w, r, db, groupID)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	} else if len(segments) == 2 && segments[0] == "events" && segments[1] != "" {
		eventID, err := strconv.Atoi(segments[1])
		if err != nil {
			http.Error(w, "Invalid event ID", http.StatusBadRequest)
			return
		}
		if r.Method == http.MethodGet {
			getEventByID(w, r, db, eventID)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	} else if len(segments) == 3 && segments[0] == "events" && segments[2] == "rsvp" {
		eventID, err := strconv.Atoi(segments[1])
		if err != nil {
			http.Error(w, "Invalid event ID", http.StatusBadRequest)
			return
		}
		if r.Method == http.MethodPost {
			respondToEvent(w, r, db, eventID)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	} else if len(segments) == 3 && segments[0] == "events" && segments[2] == "rsvps" {
		eventID, err := strconv.Atoi(segments[1])
		if err != nil {
			http.Error(w, "Invalid event ID", http.StatusBadRequest)
			return
		}
		if r.Method == http.MethodGet {
			getEventRSVPs(w, r, db, eventID)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	} else {
		http.Error(w, "Not found", http.StatusNotFound)
	}
}

func createGroup(w http.ResponseWriter, r *http.Request, db *dbTools.DB) {
	// Temporary placeholder for user ID retrieval until middleware is implemented
	userID := getUserIDFromContext(r)
	if userID == 0 {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var group dbTools.Group
	if err := json.NewDecoder(r.Body).Decode(&group); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	group.CreatorID = userID
	createdGroup, err := db.CreateGroup(&group)
	if err != nil {
		http.Error(w, "Failed to create group", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(createdGroup)
}

func getAllGroups(w http.ResponseWriter, db *dbTools.DB) {
	if db == nil {
		log.Println("Database connection is nil")
		http.Error(w, "Database unavailable", http.StatusInternalServerError)
		return
	}
	log.Println("Calling db.GetAllGroups()")
	groups, err := db.GetAllGroups()
	if err != nil {
		log.Println("Error retrieving groups:", err)
		http.Error(w, "Failed to retrieve groups", http.StatusInternalServerError)
		return
	}
	log.Println("db.GetAllGroups() returned successfully")
	if groups == nil {
		log.Println("Groups result is nil, initializing empty slice")
		groups = []*dbTools.Group{}
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(groups)
}

func getMyGroups(w http.ResponseWriter, r *http.Request, db *dbTools.DB) {
	// Temporary placeholder for user ID retrieval until middleware is implemented
	userID := getUserIDFromContext(r)
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
	userID := getUserIDFromContext(r)
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
		http.Error(w, "Forbidden: Only group creator can invite", http.StatusForbidden)
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

	w.WriteHeader(http.StatusOK)
}

func requestToJoinGroup(w http.ResponseWriter, r *http.Request, db *dbTools.DB, groupID int) {
	// Temporary placeholder for user ID retrieval until middleware is implemented
	userID := getUserIDFromContext(r)
	if userID == 0 {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	err := db.RequestToJoinGroup(groupID, userID)
	if err != nil {
		http.Error(w, "Failed to request join", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func updateMembershipStatus(w http.ResponseWriter, r *http.Request, db *dbTools.DB, groupID, targetUserID int) {
	// Temporary placeholder for user ID retrieval until middleware is implemented
	userID := getUserIDFromContext(r)
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

	if isCreator && request.Status == "accepted" || request.Status == "declined" {
		// Creator approving or declining a join request
		err = db.UpdateMembershipStatus(groupID, targetUserID, request.Status)
		if err != nil {
			http.Error(w, "Failed to update membership", http.StatusInternalServerError)
			return
		}
	} else if userID == targetUserID && request.Status == "accepted" || request.Status == "declined" {
		// User responding to an invitation
		err = db.UpdateMembershipStatus(groupID, userID, request.Status)
		if err != nil {
			http.Error(w, "Failed to update membership", http.StatusInternalServerError)
			return
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
	userID := getUserIDFromContext(r)
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
	userID := getUserIDFromContext(r)
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

func createGroupEvent(w http.ResponseWriter, r *http.Request, db *dbTools.DB, groupID int) {
	// Temporary placeholder for user ID retrieval until middleware is implemented
	userID := getUserIDFromContext(r)
	if userID == 0 {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	isMember, err := db.IsGroupMember(groupID, userID)
	if err != nil {
		http.Error(w, "Failed to check membership", http.StatusInternalServerError)
		return
	}
	if !isMember {
		http.Error(w, "Forbidden: Only group members can create events", http.StatusForbidden)
		return
	}

	var event dbTools.Event
	if err := json.NewDecoder(r.Body).Decode(&event); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	event.GroupID = groupID
	event.CreatorID = userID
	createdEvent, err := db.CreateEvent(&event)
	if err != nil {
		http.Error(w, "Failed to create event", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(createdEvent)
}

func getGroupEvents(w http.ResponseWriter, r *http.Request, db *dbTools.DB, groupID int) {
	events, err := db.GetEventsByGroupID(groupID)
	if err != nil {
		http.Error(w, "Failed to retrieve events", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(events)
}

func getEventByID(w http.ResponseWriter, r *http.Request, db *dbTools.DB, eventID int) {
	event, err := db.GetEventByID(eventID)
	if err != nil {
		http.Error(w, "Failed to retrieve event", http.StatusInternalServerError)
		return
	}
	if event == nil {
		http.Error(w, "Event not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(event)
}

func respondToEvent(w http.ResponseWriter, r *http.Request, db *dbTools.DB, eventID int) {
	// Temporary placeholder for user ID retrieval until middleware is implemented
	userID := getUserIDFromContext(r)
	if userID == 0 {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	event, err := db.GetEventByID(eventID)
	if err != nil {
		http.Error(w, "Failed to retrieve event", http.StatusInternalServerError)
		return
	}
	if event == nil {
		http.Error(w, "Event not found", http.StatusNotFound)
		return
	}

	isMember, err := db.IsGroupMember(event.GroupID, userID)
	if err != nil {
		http.Error(w, "Failed to check membership", http.StatusInternalServerError)
		return
	}
	if !isMember {
		http.Error(w, "Forbidden: Only group members can RSVP", http.StatusForbidden)
		return
	}

	var rsvp struct {
		Response string `json:"response"`
	}
	if err := json.NewDecoder(r.Body).Decode(&rsvp); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if rsvp.Response != "going" && rsvp.Response != "not_going" {
		http.Error(w, "Invalid response value", http.StatusBadRequest)
		return
	}

	err = db.RespondToEvent(eventID, userID, rsvp.Response)
	if err != nil {
		http.Error(w, "Failed to record response", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func getEventRSVPs(w http.ResponseWriter, r *http.Request, db *dbTools.DB, eventID int) {
	rsvps, err := db.GetEventRSVPs(eventID)
	if err != nil {
		http.Error(w, "Failed to retrieve RSVPs", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(rsvps)
}

// getUserIDFromContext retrieves the user ID from the session cookie using the utils package
func getUserIDFromContext(r *http.Request) int {
	db := &dbTools.DB{}
	db, err := db.OpenDB()
	if err != nil {
		return 0 // Return 0 if DB connection fails
	}
	defer db.CloseDB()
	userID, err := utils.GetUserIDFromSession(db.GetDB(), r)
	if err != nil {
		return 0 // Return 0 to indicate unauthorized if session retrieval fails
	}
	return int(userID)
}

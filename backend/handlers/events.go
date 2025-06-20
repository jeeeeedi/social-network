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

// EventsHandler handles general event-related requests (not group-specific)
func EventsHandler(w http.ResponseWriter, r *http.Request) {
	middleware.SetCORSHeaders(w)

	db := &dbTools.DB{}
	var err error
	db, err = db.OpenDB()
	if err != nil {
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

	// Handle /api/events - get all user events
	if len(segments) == 1 && segments[0] == "events" {
		if r.Method == http.MethodGet {
			getAllUserEvents(w, r, db)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	} else if len(segments) == 2 && segments[0] == "events" {
		// Handle /api/events/{id} - get specific event
		eventID, err := strconv.Atoi(segments[1])
		if err != nil {
			http.Error(w, "Invalid event ID", http.StatusBadRequest)
			return
		}
		if r.Method == http.MethodGet {
			getEventByIDGeneral(w, db, eventID)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	} else if len(segments) == 3 && segments[0] == "events" && segments[2] == "rsvp" {
		// Handle /api/events/{id}/rsvp - RSVP to event
		eventID, err := strconv.Atoi(segments[1])
		if err != nil {
			http.Error(w, "Invalid event ID", http.StatusBadRequest)
			return
		}
		if r.Method == http.MethodPost {
			respondToEventGeneral(w, r, db, eventID)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	} else if len(segments) == 3 && segments[0] == "events" && segments[2] == "rsvps" {
		// Handle /api/events/{id}/rsvps - get event RSVPs
		eventID, err := strconv.Atoi(segments[1])
		if err != nil {
			http.Error(w, "Invalid event ID", http.StatusBadRequest)
			return
		}
		if r.Method == http.MethodGet {
			getEventRSVPsGeneral(w, db, eventID)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	} else if len(segments) == 3 && segments[0] == "groups" && segments[2] == "events" {
		// Handle /api/groups/{id}/events - group-specific events
		groupID, err := strconv.Atoi(segments[1])
		if err != nil {
			http.Error(w, "Invalid group ID", http.StatusBadRequest)
			return
		}
		switch r.Method {
		case http.MethodPost:
			createGroupEvent(w, r, db, groupID)
		case http.MethodGet:
			getGroupEvents(w, db, groupID)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	} else {
		http.Error(w, "Not found", http.StatusNotFound)
	}
}

// getAllUserEvents retrieves all events from groups that the user is a member of
func getAllUserEvents(w http.ResponseWriter, r *http.Request, db *dbTools.DB) {
	userID := getUserIDFromContextEvents(r, db)
	if userID == 0 {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	events, err := db.GetUserEvents(userID)
	if err != nil {
		http.Error(w, "Failed to retrieve events", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(events)
}

// getEventByIDGeneral retrieves a specific event by ID
func getEventByIDGeneral(w http.ResponseWriter, db *dbTools.DB, eventID int) {
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

// respondToEventGeneral allows a user to RSVP to an event
func respondToEventGeneral(w http.ResponseWriter, r *http.Request, db *dbTools.DB, eventID int) {
	userID := getUserIDFromContextEvents(r, db)
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

// getEventRSVPsGeneral retrieves all RSVPs for an event
func getEventRSVPsGeneral(w http.ResponseWriter, db *dbTools.DB, eventID int) {
	rsvps, err := db.GetEventRSVPs(eventID)
	if err != nil {
		http.Error(w, "Failed to retrieve RSVPs", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(rsvps)
}

// createGroupEvent creates a new event in a specific group
func createGroupEvent(w http.ResponseWriter, r *http.Request, db *dbTools.DB, groupID int) {
	userID := getUserIDFromContextEvents(r, db)
	if userID == 0 {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	isMember, err := db.IsGroupMember(groupID, userID)
	if err != nil {
		log.Printf("Error checking membership for user %d in group %d: %v", userID, groupID, err)
		http.Error(w, "Failed to check membership", http.StatusInternalServerError)
		return
	}
	if !isMember {
		log.Printf("User %d is not a member of group %d", userID, groupID)
		http.Error(w, "Forbidden: Only group members can create events", http.StatusForbidden)
		return
	}

	var event dbTools.Event
	if err := json.NewDecoder(r.Body).Decode(&event); err != nil {
		log.Printf("Error decoding request body: %v", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	log.Printf("Decoded event: %+v", event)

	event.GroupID = groupID
	event.CreatorID = userID
	event.Status = "upcoming" // Set default status

	log.Printf("Final event before DB insert: %+v", event)

	createdEvent, err := db.CreateEvent(&event)
	if err != nil {
		log.Printf("Error creating event in database: %v", err)
		http.Error(w, "Failed to create event", http.StatusInternalServerError)
		return
	}

	log.Printf("Successfully created event: %+v", createdEvent)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(createdEvent)
}

// getGroupEvents retrieves all events for a specific group
func getGroupEvents(w http.ResponseWriter, db *dbTools.DB, groupID int) {
	events, err := db.GetEventsByGroupID(groupID)
	if err != nil {
		http.Error(w, "Failed to retrieve events", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(events)
}

// getUserIDFromContextEvents retrieves the user ID from the session cookie
func getUserIDFromContextEvents(r *http.Request, db *dbTools.DB) int {
	userID, err := utils.GetUserIDFromSession(db.GetDB(), r)
	if err != nil {
		return 0
	}
	return int(userID)
}

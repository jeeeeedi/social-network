package dbTools

import (
	"database/sql"
)

// CreateEvent creates a new event in the database for a group
func (db *DB) CreateEvent(e *Event) (*Event, error) {
	query := `INSERT INTO events (creator_id, group_id, title, description, event_date_time) VALUES (?, ?, ?, ?, ?)`
	result, err := db.db.Exec(query, e.CreatorID, e.GroupID, e.Title, e.Description, e.EventDateTime)
	if err != nil {
		return nil, err
	}
	id, err := result.LastInsertId()
	if err != nil {
		return nil, err
	}
	e.EventID = int(id)
	return e, nil
}

// GetEventByID retrieves an event by its ID
func (db *DB) GetEventByID(id int) (*Event, error) {
	query := `SELECT event_id, creator_id, group_id, title, description, event_date_time, created_at FROM events WHERE event_id = ?`
	row := db.db.QueryRow(query, id)
	e := &Event{}
	err := row.Scan(&e.EventID, &e.CreatorID, &e.GroupID, &e.Title, &e.Description, &e.EventDateTime, &e.CreatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return e, nil
}

// GetEventsByGroupID retrieves all events for a specific group
func (db *DB) GetEventsByGroupID(groupID int) ([]*Event, error) {
	query := `SELECT event_id, creator_id, group_id, title, description, event_date_time, created_at FROM events WHERE group_id = ?`
	rows, err := db.db.Query(query, groupID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	events := []*Event{}
	for rows.Next() {
		e := &Event{}
		err := rows.Scan(&e.EventID, &e.CreatorID, &e.GroupID, &e.Title, &e.Description, &e.EventDateTime, &e.CreatedAt)
		if err != nil {
			return nil, err
		}
		events = append(events, e)
	}
	return events, nil
}

// RespondToEvent allows a user to RSVP to an event
func (db *DB) RespondToEvent(eventID, userID int, response string) error {
	query := `INSERT INTO event_rsvps (event_id, responder_id, response) VALUES (?, ?, ?)
	          ON CONFLICT (event_id, responder_id) DO UPDATE SET response = ?, updated_at = CURRENT_TIMESTAMP`
	_, err := db.db.Exec(query, eventID, userID, response, response)
	return err
}

// GetEventRSVPs retrieves all RSVPs for an event
func (db *DB) GetEventRSVPs(eventID int) ([]*EventRSVP, error) {
	query := `SELECT rsvp_id, event_id, responder_id, response, created_at FROM event_rsvps WHERE event_id = ?`
	rows, err := db.db.Query(query, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	rsvps := []*EventRSVP{}
	for rows.Next() {
		r := &EventRSVP{}
		err := rows.Scan(&r.RSVPID, &r.EventID, &r.ResponderID, &r.Response, &r.CreatedAt)
		if err != nil {
			return nil, err
		}
		rsvps = append(rsvps, r)
	}
	return rsvps, nil
}

// GetUserEventResponse retrieves a user's RSVP response for a specific event
func (db *DB) GetUserEventResponse(eventID, userID int) (string, error) {
	query := `SELECT response FROM event_rsvps WHERE event_id = ? AND responder_id = ?`
	var response string
	err := db.db.QueryRow(query, eventID, userID).Scan(&response)
	if err != nil {
		if err == sql.ErrNoRows {
			return "", nil
		}
		return "", err
	}
	return response, nil
}

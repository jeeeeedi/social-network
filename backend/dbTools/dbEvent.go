package dbTools

import (
	"database/sql"
)

// CreateEvent creates a new event in the database for a group
func (db *DB) CreateEvent(e *Event) (*Event, error) {
	query := `INSERT INTO events (creator_id, group_id, title, description, event_date_time, status, updater_id) VALUES (?, ?, ?, ?, ?, ?, ?)`
	result, err := db.db.Exec(query, e.CreatorID, e.GroupID, e.Title, e.Description, e.EventDateTime, e.Status, e.CreatorID)
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
	query := `SELECT event_id, creator_id, group_id, title, description, event_date_time, status, created_at FROM events WHERE event_id = ?`
	row := db.db.QueryRow(query, id)
	e := &Event{}
	err := row.Scan(&e.EventID, &e.CreatorID, &e.GroupID, &e.Title, &e.Description, &e.EventDateTime, &e.Status, &e.CreatedAt)
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
	query := `SELECT event_id, creator_id, group_id, title, description, event_date_time, status, created_at FROM events WHERE group_id = ?`
	rows, err := db.db.Query(query, groupID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	events := []*Event{}
	for rows.Next() {
		e := &Event{}
		err := rows.Scan(&e.EventID, &e.CreatorID, &e.GroupID, &e.Title, &e.Description, &e.EventDateTime, &e.Status, &e.CreatedAt)
		if err != nil {
			return nil, err
		}
		events = append(events, e)
	}
	return events, nil
}

// RespondToEvent allows a user to RSVP to an event
func (db *DB) RespondToEvent(eventID, userID int, response string) error {
	// First, try to update existing RSVP
	updateQuery := `UPDATE event_rsvp SET response = ?, updated_at = CURRENT_TIMESTAMP, updater_id = ? 
	                WHERE event_id = ? AND responder_id = ?`
	result, err := db.db.Exec(updateQuery, response, userID, eventID, userID)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	// If no rows were updated, insert a new RSVP
	if rowsAffected == 0 {
		insertQuery := `INSERT INTO event_rsvp (event_id, responder_id, response, updater_id) VALUES (?, ?, ?, ?)`
		_, err = db.db.Exec(insertQuery, eventID, userID, response, userID)
		return err
	}

	return nil
}

// GetEventRSVPs retrieves all RSVPs for an event
func (db *DB) GetEventRSVPs(eventID int) ([]*EventRSVP, error) {
	query := `SELECT rsvp_id, event_id, responder_id, response, created_at FROM event_rsvp WHERE event_id = ?`
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
	query := `SELECT response FROM event_rsvp WHERE event_id = ? AND responder_id = ?`
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

// GetUserEvents retrieves all events from groups that a user is a member of
func (db *DB) GetUserEvents(userID int) ([]*Event, error) {
	query := `SELECT DISTINCT e.event_id, e.creator_id, e.group_id, e.title, e.description, e.event_date_time, e.status, e.created_at
	          FROM events e
	          JOIN group_members gm ON e.group_id = gm.group_id
	          WHERE gm.member_id = ? AND gm.status = 'accepted'
	          ORDER BY e.event_date_time ASC`
	rows, err := db.db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	events := []*Event{}
	for rows.Next() {
		e := &Event{}
		err := rows.Scan(&e.EventID, &e.CreatorID, &e.GroupID, &e.Title, &e.Description, &e.EventDateTime, &e.Status, &e.CreatedAt)
		if err != nil {
			return nil, err
		}
		events = append(events, e)
	}
	return events, nil
}

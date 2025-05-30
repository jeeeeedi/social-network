package dbTools

import (
	"database/sql"
	"social_network/utils"
)

func (db *DB) InsertSession(s *Session) (*Session, error) {

	// Generate UUID for the session if not already set
	if s.SessionUUID == "" {
		uuid, err := utils.GenerateUUID()
		if err != nil {
			return nil, err
		}
		s.SessionUUID = uuid
	}

	// Insert session into the database
	query := `INSERT INTO sessions (session_uuid, user_id, status, created_at, expires_at) 
	          VALUES (?, ?, ?, datetime('now'), ?)`
	_, err := db.db.Exec(query, s.SessionUUID, s.UserID, s.Status, s.CreatedAt, s.ExpiresAt)
	if err != nil {
		return nil, err
	}

	// Return the session object
	return s, nil
}

func (db *DB) GetSessionByUUID(uuid string) (*Session, error) {
	// Retrieve session from the database
	query := `SELECT session_uuid, user_id, status, created_at, expires_at
	          FROM sessions WHERE session_uuid = ?`
	row := db.db.QueryRow(query, uuid)

	s := &Session{}
	err := row.Scan(&s.SessionUUID, &s.UserID, &s.Status, &s.CreatedAt, &s.ExpiresAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil // No session found
		}
		return nil, err // Other error
	}

	// Set the user for the session
	// s.User = &User{UserID: s.UserID}

	return s, nil
}

package utils

import (
	"database/sql"
	"fmt"
	"net/http"
	"time"
)

const (
	SessionCookieName = "session_id"
	SessionDuration   = 24 * time.Hour
)

// GetUserIDFromSession retrieves the user ID from the session cookie
func GetUserIDFromSession(db *sql.DB, r *http.Request) (int, error) {
	cookie, err := r.Cookie(SessionCookieName)
	if err != nil {
		return 0, fmt.Errorf("no session cookie: %w", err)
	}

	var userID int
	query := `SELECT user_id FROM sessions WHERE session_uuid = ? AND status = 'active' AND expires_at > CURRENT_TIMESTAMP`
	err = db.QueryRow(query, cookie.Value).Scan(&userID)
	if err != nil {
		return 0, fmt.Errorf("invalid or expired session: %w", err)
	}
	return userID, nil
}

// CreateSession generates a new session for a user and sets the session cookie
func CreateSession(db *sql.DB, w http.ResponseWriter, userID int64) (string, error) {
	sessionUUID, err := GenerateUUID()
	if err != nil {
		return "", fmt.Errorf("failed to generate session UUID: %w", err)
	}

	expiresAt := time.Now().Add(SessionDuration)
	_, err = db.Exec("INSERT INTO sessions (session_uuid, user_id, status, created_at, expires_at) VALUES (?, ?, 'active', CURRENT_TIMESTAMP, ?)",
		sessionUUID, userID, expiresAt)
	if err != nil {
		return "", fmt.Errorf("failed to create session: %w", err)
	}

	SetSessionCookie(w, sessionUUID)
	return sessionUUID, nil
}

// SetSessionCookie sets the session cookie in the response
func SetSessionCookie(w http.ResponseWriter, sessionUUID string) {
	http.SetCookie(w, &http.Cookie{
		Name:     SessionCookieName,
		Value:    sessionUUID,
		Expires:  time.Now().Add(SessionDuration),
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteStrictMode,
	})
}

// ClearSession invalidates the session and clears the cookie
func ClearSession(db *sql.DB, w http.ResponseWriter, r *http.Request) error {
	cookie, err := r.Cookie(SessionCookieName)
	if err != nil {
		return nil // No session cookie, nothing to clear
	}

	_, err = db.Exec("UPDATE sessions SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE session_uuid = ?", cookie.Value)
	if err != nil {
		return fmt.Errorf("failed to invalidate session: %w", err)
	}

	http.SetCookie(w, &http.Cookie{
		Name:     SessionCookieName,
		Value:    "",
		Expires:  time.Now().Add(-time.Hour),
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteStrictMode,
	})
	return nil
}

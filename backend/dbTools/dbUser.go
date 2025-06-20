package dbTools

import (
	"social_network/utils"
	"strings"
)

func (db *DB) InsertUser(u *User) (UserID int, err error) {

	// Generate UUID for the user if not already set
	if u.UserUUID == "" {
		uuid, err := utils.GenerateUUID()
		if err != nil {
			return -1, err
		}
		u.UserUUID = uuid
	}

	query := `INSERT INTO users (uuid, email, password, firstname, lastname, dateofbirth, nickname, about_me, privacy, role, created_at, updated_at, updater_id)
			  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), ?)`

	res, err := db.db.Exec(query, u.UserUUID, u.Email, u.Password, u.FirstName, u.LastName, u.DateOfBirth, u.Nickname, u.AboutMe, u.Privacy, u.Role, u.CreatedAt, u.UpdatedAt, u.UpdaterID)
	if err != nil {
		return -1, err
	}

	id, err := res.LastInsertId()
	if err != nil {
		return -1, err
	}
	return int(id), nil
}

func (db *DB) GetUserByID(id int) (*User, error) {
	query := `SELECT user_id, user_uuid, email, password, firstname, lastname, dateofbirth, nickname, about_me, privacy, role, status
			  FROM users WHERE user_id = ?`

	row := db.db.QueryRow(query, id)
	u := &User{}
	err := row.Scan(&u.UserID, &u.UserUUID, &u.Email, &u.Password, &u.FirstName, &u.LastName,
		&u.DateOfBirth, &u.Nickname, &u.AboutMe, &u.Privacy, &u.Role, &u.Status)
	if err != nil {
		return nil, err
	}
	return u, nil
}

// UserAPI represents simplified user data for API responses
type UserAPI struct {
	UserID    int    `json:"user_id"`
	UserUUID  string `json:"user_uuid"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Nickname  string `json:"nickname,omitempty"`
	Avatar    string `json:"avatar,omitempty"`
	Status    string `json:"status"`
}

// FetchUserByID fetches a single user by ID
func (d *DB) FetchUserByID(userID int) (*UserAPI, error) {
	query := `
		SELECT user_id, user_uuid, first_name, last_name, 
		       COALESCE(nickname, '') as nickname, 
		       COALESCE(avatar, '') as avatar, 
		       status
		FROM users 
		WHERE user_id = ? AND status = 'active'
	`

	var user UserAPI
	err := d.db.QueryRow(query, userID).Scan(
		&user.UserID, &user.UserUUID, &user.FirstName, &user.LastName,
		&user.Nickname, &user.Avatar, &user.Status,
	)

	if err != nil {
		return nil, err
	}

	return &user, nil
}

// FetchUsersByIDs fetches multiple users by their IDs
func (d *DB) FetchUsersByIDs(userIDs []int) ([]UserAPI, error) {
	if len(userIDs) == 0 {
		return []UserAPI{}, nil
	}

	// Create placeholders for the IN clause
	placeholders := make([]string, len(userIDs))
	args := make([]interface{}, len(userIDs))
	for i, id := range userIDs {
		placeholders[i] = "?"
		args[i] = id
	}

	query := `
		SELECT user_id, user_uuid, first_name, last_name, 
		       COALESCE(nickname, '') as nickname, 
		       COALESCE(avatar, '') as avatar, 
		       status
		FROM users 
		WHERE user_id IN (` + strings.Join(placeholders, ",") + `) AND status = 'active'
	`

	rows, err := d.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []UserAPI
	for rows.Next() {
		var user UserAPI
		err := rows.Scan(
			&user.UserID, &user.UserUUID, &user.FirstName, &user.LastName,
			&user.Nickname, &user.Avatar, &user.Status,
		)
		if err != nil {
			return nil, err
		}
		users = append(users, user)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return users, nil
}

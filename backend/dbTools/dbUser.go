package dbTools

import "social_network/backendUtils"

func (db *DB) InsertUser(u *User) (UserID int, err error) {

	// Generate UUID for the user if not already set
	if u.UserUUID == "" {
		uuid, err := backendUtils.GenerateUUID()
		if err != nil {
			return -1, err
		}
		u.UserUUID = uuid
	}

	query := `INSERT INTO users (uuid, email, password, firstname, lastname, dateofbirth, nickname, about_me, privacy, role, created_at, updated_at, updater_id)
			  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), ?)`

	res, err := db.db.Exec(query, u.UserUUID, u.Email, u.Password, u.FirstName, u.LastName, u.DateOfBirth, u.Nickname, u.AboutMe, u.Privacy, u.Role, u.CreatedAt, u.UpdatedAt, u.Updater.UserID)
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

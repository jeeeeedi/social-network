package dbTools

import (
	"database/sql"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/sqlite3"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	_ "github.com/mattn/go-sqlite3"
)

type DB struct {
	db *sql.DB
}

func (d *DB) OpenDB() (*DB, error) {
	db, err := sql.Open("sqlite3", "./db/socnet.db")
	if err != nil {
		return nil, err
	}
	d.db = db

	err = d.RunMigration()
	if err != nil {
		d.db.Close()
	}
	return d, nil
}

func (d *DB) RunMigration() error {
	driver, err := sqlite3.WithInstance(d.db, &sqlite3.Config{})
	if err != nil {
		d.db.Close()
		return err
	}

	m, err := migrate.NewWithDatabaseInstance("file://./db/migrations", "sqlite3", driver)
	if err != nil {
		d.db.Close()
		return err
	}

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		d.db.Close()
		return err
	}
	return nil
}

func (d *DB) CloseDB() error {
	if d.db != nil {
		return d.db.Close()
	}
	return nil
}

// GetDB returns the underlying *sql.DB connection for use in other packages.
func (d *DB) GetDB() *sql.DB {
	return d.db
}

func (d *DB) WithTransaction(fn func(*sql.Tx) error) error {
	tx, err := d.db.Begin()
	if err != nil {
		return err
	}

	if err := fn(tx); err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit()
}

func (d *DB) QueryRow(query string, args ...interface{}) *sql.Row {
	return d.db.QueryRow(query, args...)
}

func (d *DB) Query(query string, args ...interface{}) (*sql.Rows, error) {
	return d.db.Query(query, args...)
}

func (d *DB) Exec(query string, args ...interface{}) (sql.Result, error) {
	return d.db.Exec(query, args...)
}

// CreateNotification creates a new notification in the database
func (d *DB) CreateNotification(receiverID, actorID int, actionType, parentType string, parentID int, content string) error {
	query := `INSERT INTO notifications (receiver_id, actor_id, action_type, parent_type, parent_id, content, status, created_at)
	          VALUES (?, ?, ?, ?, ?, ?, 'unread', datetime('now'))`
	_, err := d.db.Exec(query, receiverID, actorID, actionType, parentType, parentID, content)
	return err
}

// GetNotificationsByUserID retrieves all notifications for a user
func (d *DB) GetNotificationsByUserID(userID int) ([]Notification, error) {
	query := `SELECT n.notification_id, n.receiver_id, n.actor_id, n.action_type, n.parent_type, n.parent_id,
	                 n.content, n.status, n.created_at, COALESCE(u.nickname, u.first_name) as nickname, 
	                 COALESCE(u.avatar, '') as avatar
	          FROM notifications n
	          JOIN users u ON n.actor_id = u.user_id
	          WHERE n.receiver_id = ? AND n.status != 'inactive'
	          ORDER BY n.created_at DESC`

	rows, err := d.db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	notifications := []Notification{}
	for rows.Next() {
		var n Notification
		err := rows.Scan(&n.NotificationID, &n.ReceiverID, &n.ActorID, &n.ActionType, &n.ParentType,
			&n.ParentID, &n.Content, &n.Status, &n.CreatedAt, &n.Nickname, &n.Avatar)
		if err != nil {
			return nil, err
		}
		notifications = append(notifications, n)
	}
	return notifications, nil
}

// UpdateNotificationStatus updates a notification's status
func (d *DB) UpdateNotificationStatus(notificationID int, status string, updaterID int) error {
	query := `UPDATE notifications SET status = ?, updated_at = datetime('now'), updater_id = ?
	          WHERE notification_id = ?`
	_, err := d.db.Exec(query, status, updaterID, notificationID)
	return err
}

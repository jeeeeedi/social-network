package dbTools

import (
	"database/sql"
	"log"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/sqlite3"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	_ "github.com/mattn/go-sqlite3"
)

type DB struct {
	db *sql.DB
}

func (d *DB) OpenDB() (*DB, error) {
	log.Println("[DB] Opening database at ./db/socnet.db ...")
	db, err := sql.Open("sqlite3", "./db/socnet.db")
	if err != nil {
		log.Printf("[DB] sql.Open error: %v", err)
		return nil, err
	}
	d.db = db

	err = d.RunMigration()
	if err != nil {
		log.Printf("[DB] Migration error: %v", err)
		d.db.Close()
	}
	return d, nil
}

func (d *DB) RunMigration() error {
	log.Println("[DB] Running migrations from ./db/migrations ...")
	driver, err := sqlite3.WithInstance(d.db, &sqlite3.Config{})
	if err != nil {
		log.Printf("[DB] sqlite3.WithInstance error: %v", err)
		d.db.Close()
		return err
	}

	m, err := migrate.NewWithDatabaseInstance("file://./db/migrations", "sqlite3", driver)
	if err != nil {
		log.Printf("[DB] migrate.NewWithDatabaseInstance error: %v", err)
		d.db.Close()
		return err
	}

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		log.Printf("[DB] m.Up() error: %v", err)
		d.db.Close()
		return err
	}
	log.Println("[DB] Migration complete.")
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

// Legacy notification functions - DEPRECATED
// Use NotificationService from dbNotification.go instead

// CreateNotification creates a new notification in the database
// DEPRECATED: Use NotificationService.CreateNotification instead
func (d *DB) CreateNotification(receiverID, actorID int, actionType, parentType string, parentID int, content string) error {
	service := NewNotificationService(d)
	return service.CreateNotification(receiverID, actorID, actionType, parentType, parentID, content)
}

// GetNotificationsByUserID retrieves all notifications for a user
// DEPRECATED: Use NotificationService.GetNotificationsByUserID instead
func (d *DB) GetNotificationsByUserID(userID int) ([]Notification, error) {
	service := NewNotificationService(d)
	return service.GetNotificationsByUserID(userID)
}

// UpdateNotificationStatus updates a notification's status
// DEPRECATED: Use NotificationService.UpdateNotificationStatus instead
func (d *DB) UpdateNotificationStatus(notificationID int, status string, updaterID int) error {
	service := NewNotificationService(d)
	return service.UpdateNotificationStatus(notificationID, status, updaterID)
}

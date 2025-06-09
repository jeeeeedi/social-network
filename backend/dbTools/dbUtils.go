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
	return d, nil
}

func (d *DB) OpenDBWithMigration() error {
	db, err := sql.Open("sqlite3", "./db/socnet.db")
	if err != nil {
		return err
	}

	driver, err := sqlite3.WithInstance(db, &sqlite3.Config{})
	if err != nil {
		db.Close()
		return err
	}

	m, err := migrate.NewWithDatabaseInstance("file://./db/migrations", "sqlite3", driver)
	if err != nil {
		db.Close()
		return err
	}

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		db.Close()
		return err
	}

	d.db = db
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

func (d *DB) Exec(query string, args ...interface{}) (sql.Result, error) {
	return d.db.Exec(query, args...)
}

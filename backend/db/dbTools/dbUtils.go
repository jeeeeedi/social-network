package dbTools

import (
	"database/sql"
	"fmt"
	"os"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/sqlite3"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	_ "github.com/mattn/go-sqlite3"
)

type DB struct {
	db *sql.DB
}

func (d *DB) OpenDBWithMigration() error {
	cwd, _ := os.Getwd()
	fmt.Printf("Current working directory: %s\n", cwd)
	db, err := sql.Open("sqlite3", "db/socnet.db")
	if err != nil {
		return err
	}
	// defer db.Close() // Commented out for debugging: keep DB connection open

	driver, err := sqlite3.WithInstance(db, &sqlite3.Config{})
	if err != nil {
		return err
	}

	m, err := migrate.NewWithDatabaseInstance("file://db/migrations", "sqlite3", driver)
	if err != nil {
		return err
	}

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return err
	}

	d.db = db
	return nil
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

package dbTools

import (
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"social_network/utils"
	"strings"
)

// FileUpload handles file uploads and saves them to the db
func (d *DB) FileUpload(file multipart.File, f *File, r *http.Request, w http.ResponseWriter) error {
	uploadDir := "public/uploads"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		fmt.Printf("Failed to create upload directory: %v\n", err)
		return err
	}

	defer file.Close()
	ext := strings.ToLower(filepath.Ext(f.Filename))
	if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".gif" {
		return fmt.Errorf("invalid file type: %s", ext)
	}
	if f.FileUUID == "" {
		fileUUID, err := utils.GenerateUUID()
		if err != nil {
			fmt.Printf("File upload error: %v\n", err)
			return err
		}
		f.FileUUID = fileUUID
	}
	filename := f.FileUUID + ext
	dst, err := os.Create(filepath.Join(uploadDir, filename))
	if err != nil {
		fmt.Printf("File save error: %v\n", err)
		return err
	}
	defer dst.Close()
	if _, err := io.Copy(dst, file); err != nil {
		fmt.Printf("File copy error: %v\n", err)
		return err
	}
	f.FileID, err = d.InsertFile(f)
	if err != nil {
		return err
	}
	return nil
}

// InsertFile inserts a new file into the database and sets the FileID on success.
func (d *DB) InsertFile(f *File) (int, error) {
	log.Printf("Inserting file: %+v\n", f)

	// Generate UUID for the file if not already set
	if f.FileUUID == "" {
		uuid, err := utils.GenerateUUID()
		if err != nil {
			return -1, err
		}
		f.FileUUID = uuid
	}

	query := `
        INSERT INTO files
			(file_uuid, uploader_id, filename, parent_type, parent_id, created_at) 
        VALUES (?, ?, ?, ?, ?, ?)
    `
	result, err := d.Exec(
		query,
		f.FileUUID,
		f.UploaderID,
		f.Filename,
		f.ParentType,
		f.ParentID,
		f.CreatedAt,
	)
	if err != nil {
		log.Printf("InsertFile Exec error: %v", err)
		return -1, err
	}
	id, err := result.LastInsertId()
	if err != nil {
		return -1, err
	}
	f.FileID = int(id)
	return f.FileID, nil
}

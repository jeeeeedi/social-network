package dbTools

// InsertPost inserts a new post into the database and sets the PostID on success.

func (d *DB) InsertFile(f *File) (int, error) {

	query := `
        INSERT INTO files
			(uploader_id, filename, parent_type, parent_id, created_at) 
        VALUES (?, ?, ?, ?, ?)
    `
	result, err := d.Exec(
		query,
		f.UploaderID,
		f.Filename,
		f.ParentType,
		f.ParentID,
		f.CreatedAt,
	)
	if err != nil {
		return -1, err
	}
	id, err := result.LastInsertId()
	if err != nil {
		return -1, err
	}
	f.FileID = int(id)
	return f.FileID, nil
}

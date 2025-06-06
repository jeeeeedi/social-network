package dbTools

// InsertPost inserts a new post into the database and sets the PostID on success.

func (d *DB) InsertPost(post *Post) error {
	query := `
        INSERT INTO posts 
            (post_uuid, poster_id, group_id, content, privacy, status, created_at, updater_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
	result, err := d.Exec(
		query,
		post.PostUUID,
		post.PosterID,
		post.GroupID,
		post.Content,
		post.Privacy,
		post.Status,
		post.CreatedAt,
		post.UpdaterID,
	)
	if err != nil {
		return err
	}
	id, err := result.LastInsertId()
	if err != nil {
		return err
	}
	post.PostID = int(id)
	return nil
}

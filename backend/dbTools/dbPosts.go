package dbTools

import "social_network/utils"

// InsertPost inserts a new post into the database and sets the PostID on success.

func (d *DB) InsertPost(p *Post) error {

	// Generate UUID for the post if not already set
	if p.PostUUID == "" {
		uuid, err := utils.GenerateUUID()
		if err != nil {
			return err
		}
		p.PostUUID = uuid
	}

	query := `
        INSERT INTO posts 
            (post_uuid, poster_id, group_id, content, privacy, updated_at, updater_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `
	result, err := d.Exec(
		query,
		p.PostUUID,
		p.PosterID,
		p.GroupID,
		p.Content,
		p.Privacy,
		p.Status,
		p.UpdatedAt,
		p.UpdaterID,
	)
	if err != nil {
		return err
	}
	id, err := result.LastInsertId()
	if err != nil {
		return err
	}
	p.PostID = int(id)
	return nil
}

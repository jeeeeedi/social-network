package dbTools

import (
	"database/sql"
	"social_network/utils"
)

// InsertPost inserts a new post into the database and sets the PostID on success.

func (d *DB) InsertPost(p *Post) (int, error) {

	// Generate UUID for the post if not already set
	if p.PostUUID == "" {
		uuid, err := utils.GenerateUUID()
		if err != nil {
			return -1, err
		}
		p.PostUUID = uuid
	}

	query := `
        INSERT INTO posts 
            (post_uuid, poster_id, group_id, content, privacy, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    `
	result, err := d.Exec(
		query,
		p.PostUUID,
		p.PosterID,
		p.GroupID,
		p.Content,
		p.Privacy,
		p.CreatedAt,
	)
	if err != nil {
		return -1, err
	}
	id, err := result.LastInsertId()
	if err != nil {
		return -1, err
	}
	p.PostID = int(id)
	return p.PostID, nil
}

// GetFeedPosts retrieves all public posts and all posts from the specified user
// TODO: Add logic for semiprivate posts
func (d *DB) GetFeedPosts(userID int) ([]PostWithUserAndFile, error) {
	rows, err := d.GetDB().Query(`
        SELECT 
            p.post_id, p.post_uuid, p.poster_id, p.group_id, p.content, p.privacy, p.status, p.created_at, 
            u.nickname, 
            COALESCE(f.file_id, 0) as file_id, 
            f.filename_new
        FROM posts p
        JOIN users u ON p.poster_id = u.user_id AND u.status = 'active'
        LEFT JOIN files f ON f.parent_type = 'post' AND f.parent_id = p.post_id AND f.status = 'active'
        WHERE (p.privacy = 'public' OR p.poster_id = ?)
          AND p.status = 'active'
        ORDER BY p.created_at DESC
    `, userID)
	// COALESCE(f.file_id, 0): If f.file_id != NULL, use its value. If f.file_id = NULL (no file w/post), use 0 instead.
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var postsWUAFstruct []PostWithUserAndFile
	for rows.Next() {
		var postWUAF PostWithUserAndFile
		var groupID sql.NullInt64
		var filenameNew sql.NullString

		err := rows.Scan(
			&postWUAF.PostID,
			&postWUAF.PostUUID,
			&postWUAF.PosterID,
			&groupID,
			&postWUAF.Content,
			&postWUAF.Privacy,
			&postWUAF.PostStatus,
			&postWUAF.PostCreatedAt,
			&postWUAF.Nickname,
			&postWUAF.FileID,
			&filenameNew,
		)
		if err != nil {
			return nil, err
		}
		if groupID.Valid {
			gid := int(groupID.Int64)
			postWUAF.GroupID = &gid
		} else {
			postWUAF.GroupID = nil
		}
		if filenameNew.Valid {
			postWUAF.FilenameNew = filenameNew.String
		} else {
			postWUAF.FilenameNew = ""
		}
		postsWUAFstruct = append(postsWUAFstruct, postWUAF)
	}
	return postsWUAFstruct, nil
}

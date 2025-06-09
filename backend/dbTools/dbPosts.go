package dbTools

import (
	"database/sql"
	"log"
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
	log.Println("GetFeedPosts called for userID:", userID)
	rows, err := d.GetDB().Query(`
        SELECT 
            p.post_id, p.post_uuid, p.poster_id, p.group_id, p.content, p.privacy, p.status, p.created_at, 
            u.nickname, 
            COALESCE(f.file_id, 0) as file_id, 
            f.filename
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

	var posts []PostWithUserAndFile
	for rows.Next() {
		var post PostWithUserAndFile
		var groupID sql.NullInt64
		var filename sql.NullString

		err := rows.Scan(
			&post.PostID,
			&post.PostUUID,
			&post.PosterID,
			&groupID,
			&post.Content,
			&post.Privacy,
			&post.PostStatus,
			&post.PostCreatedAt,
			&post.Nickname,
			&post.FileID,
			&filename,
		)
		if err != nil {
			return nil, err
		}
		if groupID.Valid {
			gid := int(groupID.Int64)
			post.GroupID = &gid
		} else {
			post.GroupID = nil
		}
		if filename.Valid {
			post.Filename = filename.String
		} else {
			post.Filename = ""
		}
		posts = append(posts, post)
	}
	log.Print("GetFeedPosts:", posts)
	return posts, nil
}

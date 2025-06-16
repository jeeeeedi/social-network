package dbTools

import (
	"context"
	"database/sql"
	"social_network/utils"
)

// InsertPostToDB inserts a new post into the database and sets the PostID on success.
func (d *DB) InsertPostToDB(p *Post) (int, error) {

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

// GetMyPosts retrieves all posts by the user
func (d *DB) GetMyPosts(userID int) ([]PostWithUserAndFile, error) {
	rows, err := d.GetDB().Query(`
        SELECT 
            p.post_id, p.post_uuid, p.poster_id, p.group_id, p.content, p.privacy, p.status, p.created_at, 
            u.nickname, 
            COALESCE(f.file_id, 0) as file_id, 
            f.filename_new
        FROM posts p
        JOIN users u ON p.poster_id = u.user_id AND u.status = 'active'
        LEFT JOIN files f ON f.parent_type = 'post' AND f.parent_id = p.post_id AND f.status = 'active'
        WHERE p.poster_id = ?
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

func (d *DB) GetPostByUUID(ctx context.Context, postUUID string) (*Post, error) {
	var post Post
	err := d.db.QueryRowContext(ctx, `
	SELECT post_id, post_uuid, poster_id, group_id, content, privacy, status, created_at
	FROM posts
	WHERE post_uuid = ? AND status = 'active'
	`, postUUID).Scan(
		&post.PostID,
		&post.PostUUID,
		&post.PosterID,
		&post.GroupID,
		&post.Content,
		&post.Privacy,
		&post.Status,
		&post.CreatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil // Post not found
		}
		return nil, err // Other error
	}
	return &post, nil
}


// InsertCommentToDB inserts a new comment into the database and sets the CommentID on success.
func (d *DB) InsertCommentToDB(c *Comment) (int, error) {

	// Generate UUID for the comment if not already set
	/* 	if c.CommentUUID == "" {
		uuid, err := utils.GenerateUUID()
		if err != nil {
			return -1, err
		}
		c.CommentUUID = uuid
	} */

	query := `
        INSERT INTO comments 
            (commenter_id, post_id, content, created_at)
        VALUES (?, ?, ?, ?)
    `
	result, err := d.Exec(
		query,
		c.CommenterID,
		c.PostID,
		c.Content,
		c.CreatedAt,
	)
	if err != nil {
		return -1, err
	}
	id, err := result.LastInsertId()
	if err != nil {
		return -1, err
	}
	c.CommentID = int(id)
	return c.CommentID, nil
}

func (d *DB) GetCommentsForPost(ctx context.Context, postUUID string) ([]Comment, error) {
	var postID int
	// Query the posts table for the post_id using the UUID
	err := d.db.QueryRowContext(ctx, `
	SELECT post_id FROM posts
	WHERE post_uuid = ?
	`, postUUID).Scan(&postID)
	if err != nil {
		return nil, err
	}

	// Query the comments table for all comments with the found post_id
	rows, err := d.db.QueryContext(ctx, `
	SELECT
		c.comment_id, c.commenter_id, c.post_id, c.content, c.status, c.created_at
	FROM comments c
	WHERE c.post_id = ? AND c.status = 'active'
	ORDER BY c.created_at ASC
	`, postID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var comments []Comment
	for rows.Next() {
		var comment Comment
		err := rows.Scan(
			&comment.CommentID,
			&comment.CommenterID,
			&comment.PostID,
			/* &comment.GroupID, */
			&comment.Content,
			&comment.Status,
			&comment.CreatedAt,
			/* &comment.UpdatedAt,
			&comment.UpdaterID, */
		)
		if err != nil {
			return nil, err
		}
		comments = append(comments, comment)
	}
	return comments, nil
}

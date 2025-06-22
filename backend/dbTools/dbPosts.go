package dbTools

import (
	"context"
	"database/sql"
	"log"
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
func (d *DB) GetFeedPosts(userID int) ([]PostResponse, error) {
	rows, err := d.GetDB().Query(`
        SELECT 
            p.post_id, p.post_uuid, p.poster_id, p.group_id, p.content, p.privacy, p.status, p.created_at, 
            u.nickname, u.avatar,
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

	var postsResponse []PostResponse
	for rows.Next() {
		var postResponse PostResponse
		var groupID sql.NullInt64
		var fileID sql.NullInt64
		var filenameNew sql.NullString

		err := rows.Scan(
			&postResponse.PostID,
			&postResponse.PostUUID,
			&postResponse.PosterID,
			&groupID,
			&postResponse.Content,
			&postResponse.Privacy,
			&postResponse.PostStatus,
			&postResponse.PostCreatedAt,
			&postResponse.Nickname,
			&postResponse.Avatar,
			&fileID,
			&filenameNew,
		)
		if err != nil {
			return nil, err
		}
		if groupID.Valid {
			gid := int(groupID.Int64)
			postResponse.GroupID = &gid
		} else {
			postResponse.GroupID = nil
		}
		if fileID.Valid {
			fid := int(fileID.Int64)
			postResponse.FileID = &fid
		} else {
			postResponse.FileID = nil
		}
		if filenameNew.Valid {
			fn := filenameNew.String
			postResponse.FilenameNew = &fn
		} else {
			postResponse.FilenameNew = nil
		}

		comments, err := d.GetCommentsForPost(context.Background(), postResponse.PostUUID)
		if err != nil {
			return nil, err
		}

		postResponse.Comments = comments
		postsResponse = append(postsResponse, postResponse)
	}
	return postsResponse, nil
}

// GetMyPosts retrieves all posts by the user
func (d *DB) GetMyPosts(currentUserID int, targetUserUUID string) ([]PostResponse, error) {
	log.Print("GetMyPosts called")
	// Convert UUID to user_id
	var targetUserID int
	err := d.GetDB().QueryRow(`SELECT user_id FROM users WHERE user_uuid = ? AND status = 'active'`, targetUserUUID).Scan(&targetUserID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil // User not found, return empty slice
		}
		return nil, err
	}

	// Determine which posts to show based on user
	var rows *sql.Rows
	if currentUserID == targetUserID {
		// Show all posts for self
		rows, err = d.GetDB().Query(`
            SELECT 
                p.post_id, p.post_uuid, p.poster_id, p.group_id, p.content, p.privacy, p.status, p.created_at, 
                u.nickname, u.avatar, 
                COALESCE(f.file_id, 0) as file_id, 
                f.filename_new
            FROM posts p
            JOIN users u ON p.poster_id = u.user_id AND u.status = 'active'
            LEFT JOIN files f ON f.parent_type = 'post' AND f.parent_id = p.post_id AND f.status = 'active'
            WHERE p.poster_id = ?
              AND p.status = 'active'
            ORDER BY p.created_at DESC
        `, targetUserID)
	} else {
		// Show only public posts for others
		rows, err = d.GetDB().Query(`
            SELECT 
                p.post_id, p.post_uuid, p.poster_id, p.group_id, p.content, p.privacy, p.status, p.created_at, 
                u.nickname, u.avatar, 
                COALESCE(f.file_id, 0) as file_id, 
                f.filename_new
            FROM posts p
            JOIN users u ON p.poster_id = u.user_id AND u.status = 'active'
            LEFT JOIN files f ON f.parent_type = 'post' AND f.parent_id = p.post_id AND f.status = 'active'
            WHERE p.poster_id = ?
              AND p.status = 'active'
              AND p.privacy = 'public'
            ORDER BY p.created_at DESC
        `, targetUserID)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var postsResponse []PostResponse
	for rows.Next() {
		var postResponse PostResponse
		var groupID sql.NullInt64
		var fileID sql.NullInt64
		var filenameNew sql.NullString

		err := rows.Scan(
			&postResponse.PostID,
			&postResponse.PostUUID,
			&postResponse.PosterID,
			&groupID,
			&postResponse.Content,
			&postResponse.Privacy,
			&postResponse.PostStatus,
			&postResponse.PostCreatedAt,
			&postResponse.Nickname,
			&postResponse.Avatar,
			&fileID,
			&filenameNew,
		)
		if err != nil {
			log.Print("GetMyPosts: Error scanning post row:", err)
			return nil, err
		}
		if groupID.Valid {
			gid := int(groupID.Int64)
			postResponse.GroupID = &gid
		} else {
			postResponse.GroupID = nil
		}
		if fileID.Valid {
			fid := int(fileID.Int64)
			postResponse.FileID = &fid
		} else {
			postResponse.FileID = nil
		}
		if filenameNew.Valid {
			fn := filenameNew.String
			postResponse.FilenameNew = &fn
		} else {
			postResponse.FilenameNew = nil
		}

		comments, err := d.GetCommentsForPost(context.Background(), postResponse.PostUUID)
		if err != nil {
			log.Print("GetMyPosts: Error getting comments for post:", err)
			return nil, err
		}
		log.Print("GetMyPosts: Retrieved comments for post:", postResponse.PostUUID, comments)

		postResponse.Comments = comments
		postsResponse = append(postsResponse, postResponse)
	}

	return postsResponse, nil
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
            (commenter_id, post_id, content, post_privacy, created_at)
        VALUES (?, ?, ?, ?, ?)
    `
	result, err := d.Exec(
		query,
		c.CommenterID,
		c.PostID,
		c.Content,
		c.PostPrivacy,
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

func (d *DB) GetCommentsForPost(ctx context.Context, postUUID string) ([]CommentResponse, error) {
	rows, err := d.db.QueryContext(ctx, `
        SELECT 
            c.comment_id,
			c.commenter_id,
            p.post_uuid,
            c.group_id,
            c.content,
            p.privacy,
            c.status,
            c.created_at,
            u.nickname,
			u.avatar,
            COALESCE(f.file_id, 0) as file_id,
            f.filename_new
        FROM comments c
        JOIN posts p ON c.post_id = p.post_id
        JOIN users u ON c.commenter_id = u.user_id
        LEFT JOIN files f ON f.parent_type = 'comment' AND f.parent_id = c.comment_id AND f.status = 'active'
        WHERE p.post_uuid = ?
        ORDER BY c.created_at DESC
    `, postUUID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var comments []CommentResponse
	for rows.Next() {
		var comment CommentResponse
		var groupID sql.NullInt64
		var fileID sql.NullInt64
		var filenameNew sql.NullString

		err := rows.Scan(
			&comment.CommentID,
			&comment.CommenterID,
			&comment.PostUUID,
			&groupID,
			&comment.Content,
			&comment.PostPrivacy,
			&comment.CommentStatus,
			&comment.CommentCreatedAt,
			&comment.Nickname,
			&comment.Avatar,
			&fileID,
			&filenameNew,
		)
		if err != nil {
			return nil, err
		}
		if groupID.Valid {
			gid := int(groupID.Int64)
			comment.GroupID = &gid
		}
		if fileID.Valid {
			fid := int(fileID.Int64)
			comment.FileID = &fid
		}
		if filenameNew.Valid {
			fn := filenameNew.String
			comment.FilenameNew = &fn
		}
		comments = append(comments, comment)
	}
	return comments, nil
}

// InsertSelectedFollowers inserts selected follower user_ids for a post (for semiprivate/private posts)
func (d *DB) InsertSelectedFollowers(postID int, selectedFollowersUUIDs []string) error {
	log.Print("InsertSelectedFollowers called with postID:", postID, "and selectedFollowersUUIDs:", selectedFollowersUUIDs)
	if len(selectedFollowersUUIDs) == 0 {
		return nil
	}
	query := `INSERT INTO post_private_viewers (post_id, user_id) VALUES (?, ?)`
	tx, err := d.GetDB().Begin()
	if err != nil {
		return err
	}
	defer func() {
		if err != nil {
			tx.Rollback()
		}
	}()
	stmt, err := tx.Prepare(query)
	if err != nil {
		tx.Rollback()
		return err
	}
	defer stmt.Close()

	for _, userID := range selectedFollowersUUIDs {
		_, err = stmt.Exec(postID, userID)
		if err != nil {
			tx.Rollback()
			return err
		}
	}
	return tx.Commit()
}

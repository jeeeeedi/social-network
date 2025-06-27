package dbTools

import (
	"context"
	"database/sql"
	"log"
	"social_network/utils"
)

// InsertPostToDB inserts a new post into the database and sets the PostID on success.
func (d *DB) InsertPostToDB(p *Post) (int, error) {
	// log.Print("InsertPostToDB called with post:", p)
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

// GetFeedPosts retrieves all public posts,
// semi-private posts if user is a follower,
// private posts if user is selectedFollower,
// and all the user's own posts.
func (d *DB) GetFeedPosts(userID int) ([]PostResponse, error) {
	// log.Print("GetFeedPosts called for userID:", userID)
	rows, err := d.GetDB().Query(`
        SELECT 
            p.post_id, p.post_uuid, p.poster_id, p.group_id, p.content, p.privacy, p.status, p.created_at, 
            COALESCE(u.nickname, '') as nickname, u.avatar,
            COALESCE(f.file_id, 0) as file_id, 
            f.filename_new
        FROM posts p
        JOIN users u ON p.poster_id = u.user_id AND u.status = 'active'
        LEFT JOIN files f ON f.parent_type = 'post' AND f.parent_id = p.post_id AND f.status = 'active'
        WHERE p.status = 'active'
          AND (
            p.poster_id = ? -- always include user's own posts
            OR p.privacy = 'public'
            OR (
                (p.privacy = 'semi-private' OR p.privacy = 'private')
                AND EXISTS (
                    SELECT 1 FROM post_private_viewers 
                    WHERE post_id = p.post_id 
                      AND user_id = ?
                )
            )
          )
        ORDER BY p.created_at DESC
    `, userID, userID)
	// COALESCE(f.file_id, 0): If f.file_id != NULL, use its value. If f.file_id = NULL (no file w/post), use 0 instead.
	if err != nil {
		log.Print("GetFeedPosts: Error querying posts:", err)
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
			log.Print("GetFeedPosts: Error scanning post row:", err)
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
	log.Print("GetFeedPosts: Retrieved posts:", postsResponse)
	return postsResponse, nil
}

// GetProfilePosts retrieves all the targetUser's viewable posts
func (d *DB) GetProfilePosts(currentUserID int, targetUserUUID string) ([]PostResponse, error) {
	// log.Print("GetProfilePosts called")
	// Convert targetUserUUID to targetUserID and get targetUserPrivacy
	var targetUserID int
	var targetUserPrivacy string
	err := d.GetDB().QueryRow(
		`SELECT user_id, privacy FROM users WHERE user_uuid = ? AND status = 'active'`, targetUserUUID,
	).Scan(&targetUserID, &targetUserPrivacy)
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
                COALESCE(u.nickname, '') as nickname, u.avatar, 
                COALESCE(f.file_id, 0) as file_id, 
                f.filename_new
            FROM posts p
            JOIN users u ON p.poster_id = u.user_id AND u.status = 'active'
            LEFT JOIN files f ON f.parent_type = 'post' AND f.parent_id = p.post_id AND f.status = 'active'
            WHERE p.poster_id = ?
              AND p.status = 'active'
            ORDER BY p.created_at DESC
        `, targetUserID)
		/* } else if targetUserPrivacy == "private" {
				// Only show public posts if profile is private and not the owner
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
		        `, targetUserID) */
	} else {
		// Show public posts and posts where currentUserID is in post_private_viewers
		rows, err = d.GetDB().Query(`
            SELECT 
                p.post_id, p.post_uuid, p.poster_id, p.group_id, p.content, p.privacy, p.status, p.created_at, 
                COALESCE(u.nickname, '') as nickname, u.avatar, 
                COALESCE(f.file_id, 0) as file_id, 
                f.filename_new
            FROM posts p
            JOIN users u ON p.poster_id = u.user_id AND u.status = 'active'
            LEFT JOIN files f ON f.parent_type = 'post' AND f.parent_id = p.post_id AND f.status = 'active'
            WHERE p.poster_id = ?
              AND p.status = 'active'
              AND (
                p.privacy = 'public'
                OR EXISTS (
                    SELECT 1 FROM post_private_viewers v
                    WHERE v.post_id = p.post_id
                      AND v.user_id = ?
                )
              )
            ORDER BY p.created_at DESC
        `, targetUserID, currentUserID)
	}
	if err != nil {
		// log.Print("GetProfilePosts: Error querying posts:", err)
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
			// log.Print("GetProfilePosts: Error scanning post row:", err)
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
			// log.Print("GetProfilePosts: Error getting comments for post:", err)
			return nil, err
		}
		// log.Print("GetProfilePosts: Retrieved comments for post:", postResponse.PostUUID, comments)

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
	query := `
        INSERT INTO comments 
            (commenter_id, post_id, group_id, content, post_privacy, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    `
	result, err := d.Exec(
		query,
		c.CommenterID,
		c.PostID,
		c.GroupID, // This can be nil for regular posts
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
            COALESCE(u.nickname, '') as nickname,
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

// InsertSelectedFollowers inserts selected follower user_ids for a post (for semi-private/private posts)
func (d *DB) InsertSelectedFollowers(postID int, selectedFollowersUUIDs []string) error {
	// log.Print("InsertSelectedFollowers called with postID:", postID, "and selectedFollowersUUIDs:", selectedFollowersUUIDs)
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

	for _, userUUID := range selectedFollowersUUIDs {
		var userID int
		err = d.GetDB().QueryRow("SELECT user_id FROM users WHERE user_uuid = ? AND status = 'active'", userUUID).Scan(&userID)
		if err != nil {
			tx.Rollback()
			return err
		}
		_, err = stmt.Exec(postID, userID)
		if err != nil {
			tx.Rollback()
			return err
		}
	}
	return tx.Commit()
}

func (d *DB) GetGroupPosts(userID int, groupID int) ([]PostResponse, error) {
	//log.Print("GetGroupPosts called for userID:", userID, "and groupID:", groupID)

	// Check if user is an accepted member of the group
	var isMember bool
	err := d.GetDB().QueryRow(`
        SELECT EXISTS(
            SELECT 1 FROM group_members
            WHERE group_id = ? AND member_id = ? AND status = 'accepted'
        )
    `, groupID, userID).Scan(&isMember)
	if err != nil {
		//log.Print("GetGroupPosts: Error checking group membership:", err)
		return nil, err
	}
	if !isMember {
		//log.Print("GetGroupPosts: User is not a member of the group")
		return nil, sql.ErrNoRows
	}

	rows, err := d.GetDB().Query(`
        SELECT 
            p.post_id, p.post_uuid, p.poster_id, p.group_id, p.content, p.privacy, p.status, p.created_at, 
            COALESCE(u.nickname, '') as nickname, u.avatar,
            COALESCE(f.file_id, 0) as file_id, 
            f.filename_new
        FROM posts p
        JOIN users u ON p.poster_id = u.user_id AND u.status = 'active'
        LEFT JOIN files f ON f.parent_type = 'post' AND f.parent_id = p.post_id AND f.status = 'active'
        WHERE p.status = 'active'
          AND p.group_id = ?
		  AND p.privacy = 'semi-private'
        ORDER BY p.created_at DESC
    `, groupID)
	if err != nil {
		//log.Print("GetGroupPosts: Error querying posts:", err)
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

	//log.Print("GetGroupPosts: Retrieved posts:", postsResponse)
	return postsResponse, nil
}

package dbTools

import (
	"database/sql"
	"time"
)

// 		type GroupStruct struct {
// 				group_id     int
// 			title      string
// 			description  string
// 			creator_id   int
// 			creator_name string
// 			created_at   time.Time
// 			member_count int
// 			avatar string
// 			user_status *string
// }

// CreateGroup creates a new group in the database
func (db *DB) CreateGroup(g *Group) (*Group, error) {
	query := `INSERT INTO groups (title, description, creator_id) VALUES (?, ?, ?)`
	result, err := db.db.Exec(query, g.Title, g.Description, g.CreatorID)
	if err != nil {
		return nil, err
	}
	id, err := result.LastInsertId()
	if err != nil {
		return nil, err
	}
	g.GroupID = int(id)
	// Add creator as a member with 'accepted' status
	_, err = db.db.Exec(`INSERT INTO group_members (inviter_id, member_id, group_id, status) VALUES (?, ?, ?, 'accepted')`, g.CreatorID, g.CreatorID, g.GroupID)
	if err != nil {
		return nil, err
	}
	return g, nil
}

// GetGroupByID retrieves a group by its ID
func (db *DB) GetGroupByID(id int) (*Group, error) {
	query := `SELECT g.group_id, g.title, g.description, g.creator_id, g.created_at,
	          COALESCE(f.filename_new, '') as avatar
	          FROM groups g
	          LEFT JOIN files f ON f.parent_type = 'group' AND f.parent_id = g.group_id AND f.status = 'active'
	          WHERE g.group_id = ?`
	row := db.db.QueryRow(query, id)
	g := &Group{}
	var createdAtStr string
	var avatarFilename string
	err := row.Scan(&g.GroupID, &g.Title, &g.Description, &g.CreatorID, &createdAtStr, &avatarFilename)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	// Parse the time string into a time.Time
	g.CreatedAt, err = time.Parse(time.RFC3339, createdAtStr)
	if err != nil {
		return nil, err
	}
	// Set avatar path if filename exists
	if avatarFilename != "" {
		g.Avatar = "/uploads/" + avatarFilename
	}
	return g, nil
}

// GetAllGroups retrieves all groups for browsing with creator names, member counts, and optional user status
func (db *DB) GetAllGroups(userID ...int) ([]map[string]interface{}, error) {
	var query string
	var args []interface{}

	if len(userID) > 0 && userID[0] > 0 {
		// Include user membership status when userID is provided
		query = `SELECT g.group_id, g.title, g.description, g.creator_id, g.created_at,
		          COALESCE(u.nickname, u.first_name) as creator_name,
		          COALESCE(COUNT(CASE WHEN gm_all.status = 'accepted' THEN 1 END), 0) as member_count,
		          COALESCE(gm_user.status, 'none') as user_status,
		          COALESCE(f.filename_new, '') as avatar
		          FROM groups g
		          JOIN users u ON g.creator_id = u.user_id AND u.status = 'active'
		          LEFT JOIN group_members gm_all ON g.group_id = gm_all.group_id AND gm_all.status = 'accepted'
		          LEFT JOIN group_members gm_user ON g.group_id = gm_user.group_id AND gm_user.member_id = ?
		          LEFT JOIN files f ON f.parent_type = 'group' AND f.parent_id = g.group_id AND f.status = 'active'
		          GROUP BY g.group_id, g.title, g.description, g.creator_id, g.created_at, u.nickname, u.first_name, gm_user.status, f.filename_new`
		args = append(args, userID[0])
	} else {
		// Original query without user status
		query = `SELECT g.group_id, g.title, g.description, g.creator_id, g.created_at,
		          COALESCE(u.nickname, u.first_name) as creator_name,
		          COALESCE(COUNT(gm.member_id), 0) as member_count,
		          COALESCE(f.filename_new, '') as avatar
		          FROM groups g
		          JOIN users u ON g.creator_id = u.user_id AND u.status = 'active'
		          LEFT JOIN group_members gm ON g.group_id = gm.group_id AND gm.status = 'accepted'
		          LEFT JOIN files f ON f.parent_type = 'group' AND f.parent_id = g.group_id AND f.status = 'active'
		          GROUP BY g.group_id, g.title, g.description, g.creator_id, g.created_at, u.nickname, u.first_name, f.filename_new`
	}

	rows, err := db.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var groups []map[string]interface{}
	for rows.Next() {
		var groupID, creatorID, memberCount int
		var title, description, createdAtStr, creatorName, avatarFilename string
		var userStatus *string // Use pointer for optional field

		if len(userID) > 0 && userID[0] > 0 {
			// Scan with user status
			var status string
			err := rows.Scan(&groupID, &title, &description, &creatorID, &createdAtStr, &creatorName, &memberCount, &status, &avatarFilename)
			if err != nil {
				return nil, err
			}
			userStatus = &status
		} else {
			// Scan without user status
			err := rows.Scan(&groupID, &title, &description, &creatorID, &createdAtStr, &creatorName, &memberCount, &avatarFilename)
			if err != nil {
				return nil, err
			}
		}

		// Parse the time string into a time.Time
		createdAt, err := time.Parse(time.RFC3339, createdAtStr)
		if err != nil {
			return nil, err
		}

		group := map[string]interface{}{
			"group_id":     groupID,
			"title":        title,
			"description":  description,
			"creator_id":   creatorID,
			"creator_name": creatorName,
			"created_at":   createdAt,
			"member_count": memberCount,
		}

		// Add avatar if available
		if avatarFilename != "" {
			group["avatar"] = "/uploads/" + avatarFilename
		}

		// Add user status if available
		if userStatus != nil {
			group["user_status"] = *userStatus
		}

		groups = append(groups, group)
	}
	return groups, nil
}

// GetGroupsByUserID retrieves all groups a user is a member of (accepted status)
func (db *DB) GetGroupsByUserID(userID int) ([]*Group, error) {
	query := `SELECT g.group_id, g.title, g.description, g.creator_id, g.created_at,
	          COALESCE(f.filename_new, '') as avatar
	          FROM groups g
	          JOIN group_members gm ON g.group_id = gm.group_id
	          LEFT JOIN files f ON f.parent_type = 'group' AND f.parent_id = g.group_id AND f.status = 'active'
	          WHERE gm.member_id = ? AND gm.status = 'accepted'`
	rows, err := db.db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	groups := []*Group{}
	for rows.Next() {
		g := &Group{}
		var createdAtStr, avatarFilename string
		err := rows.Scan(&g.GroupID, &g.Title, &g.Description, &g.CreatorID, &createdAtStr, &avatarFilename)
		if err != nil {
			return nil, err
		}
		// Parse the time string into a time.Time
		g.CreatedAt, err = time.Parse(time.RFC3339, createdAtStr)
		if err != nil {
			return nil, err
		}
		// Set avatar path if filename exists
		if avatarFilename != "" {
			g.Avatar = "/uploads/" + avatarFilename
		}
		groups = append(groups, g)
	}
	return groups, nil
}

// InviteToGroup invites a user to a group
func (db *DB) InviteToGroup(groupID, inviterID, inviteeID int) error {
	query := `INSERT INTO group_members (inviter_id, member_id, group_id, status) VALUES (?, ?, ?, 'invited')`
	_, err := db.db.Exec(query, inviterID, inviteeID, groupID)
	return err
}

// RequestToJoinGroup allows a user to request to join a group
func (db *DB) RequestToJoinGroup(groupID, userID int) error {
	query := `INSERT INTO group_members (member_id, group_id, status) VALUES (?, ?, 'requested')`
	_, err := db.db.Exec(query, userID, groupID)
	return err
}

// UpdateMembershipStatus updates the status of a group membership
func (db *DB) UpdateMembershipStatus(groupID, memberID int, status string) error {
	query := `UPDATE group_members SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE group_id = ? AND member_id = ?`
	_, err := db.db.Exec(query, status, groupID, memberID)
	return err
}

// GetGroupMembers retrieves all members of a group with their status
func (db *DB) GetGroupMembers(groupID int) ([]*GroupMember, error) {
	query := `SELECT membership_id, inviter_id, member_id, group_id, status, created_at FROM group_members WHERE group_id = ?`
	rows, err := db.db.Query(query, groupID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	members := []*GroupMember{}
	for rows.Next() {
		m := &GroupMember{}
		var inviterID sql.NullInt64
		err := rows.Scan(&m.MembershipID, &inviterID, &m.MemberID, &m.GroupID, &m.Status, &m.CreatedAt)
		if err != nil {
			return nil, err
		}
		// Handle nullable inviter_id
		if inviterID.Valid {
			inviterIDInt := int(inviterID.Int64)
			m.InviterID = &inviterIDInt
		} else {
			m.InviterID = nil
		}
		members = append(members, m)
	}
	return members, nil
}

// GetInvitationsByUserID retrieves all invitations for a user
func (db *DB) GetInvitationsByUserID(userID int) ([]*GroupMember, error) {
	query := `SELECT membership_id, inviter_id, member_id, group_id, status, created_at FROM group_members WHERE member_id = ? AND status = 'invited'`
	rows, err := db.db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	invitations := []*GroupMember{}
	for rows.Next() {
		inv := &GroupMember{}
		var inviterID sql.NullInt64
		err := rows.Scan(&inv.MembershipID, &inviterID, &inv.MemberID, &inv.GroupID, &inv.Status, &inv.CreatedAt)
		if err != nil {
			return nil, err
		}
		// Handle nullable inviter_id
		if inviterID.Valid {
			inviterIDInt := int(inviterID.Int64)
			inv.InviterID = &inviterIDInt
		} else {
			inv.InviterID = nil
		}
		invitations = append(invitations, inv)
	}
	return invitations, nil
}

// GetRequestsByGroupID retrieves all join requests for a group
func (db *DB) GetRequestsByGroupID(groupID int) ([]*GroupMember, error) {
	query := `SELECT membership_id, inviter_id, member_id, group_id, status, created_at FROM group_members WHERE group_id = ? AND status = 'requested'`
	rows, err := db.db.Query(query, groupID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	requests := []*GroupMember{}
	for rows.Next() {
		req := &GroupMember{}
		var inviterID sql.NullInt64
		err := rows.Scan(&req.MembershipID, &inviterID, &req.MemberID, &req.GroupID, &req.Status, &req.CreatedAt)
		if err != nil {
			return nil, err
		}
		// Handle nullable inviter_id
		if inviterID.Valid {
			inviterIDInt := int(inviterID.Int64)
			req.InviterID = &inviterIDInt
		} else {
			req.InviterID = nil
		}
		requests = append(requests, req)
	}
	return requests, nil
}

// IsGroupMember checks if a user is a member of a group with accepted status
func (db *DB) IsGroupMember(groupID, userID int) (bool, error) {
	query := `SELECT COUNT(*) FROM group_members WHERE group_id = ? AND member_id = ? AND status = 'accepted'`
	var count int
	err := db.db.QueryRow(query, groupID, userID).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// IsGroupCreator checks if a user is the creator of a group
func (db *DB) IsGroupCreator(groupID, userID int) (bool, error) {
	query := `SELECT COUNT(*) FROM groups WHERE group_id = ? AND creator_id = ?`
	var count int
	err := db.db.QueryRow(query, groupID, userID).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

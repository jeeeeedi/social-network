package dbTools

import (
	"database/sql"
	"time"
)

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
	query := `SELECT group_id, title, description, creator_id, created_at FROM groups WHERE group_id = ?`
	row := db.db.QueryRow(query, id)
	g := &Group{}
	var createdAtStr string
	err := row.Scan(&g.GroupID, &g.Title, &g.Description, &g.CreatorID, &createdAtStr)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	// Parse the time string into a time.Time
	g.CreatedAt, err = time.Parse("2006-01-02 15:04:05", createdAtStr)
	if err != nil {
		return nil, err
	}
	return g, nil
}

// GetAllGroups retrieves all groups for browsing
func (db *DB) GetAllGroups() ([]*Group, error) {
	query := `SELECT group_id, title, description, creator_id, created_at FROM groups`
	rows, err := db.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	groups := []*Group{}
	for rows.Next() {
		g := &Group{}
		var createdAtStr string
		err := rows.Scan(&g.GroupID, &g.Title, &g.Description, &g.CreatorID, &createdAtStr)
		if err != nil {
			return nil, err
		}
		// Parse the time string into a time.Time
		g.CreatedAt, err = time.Parse("2006-01-02 15:04:05", createdAtStr)
		if err != nil {
			return nil, err
		}
		groups = append(groups, g)
	}
	return groups, nil
}

// GetGroupsByUserID retrieves all groups a user is a member of (accepted status)
func (db *DB) GetGroupsByUserID(userID int) ([]*Group, error) {
	query := `SELECT g.group_id, g.title, g.description, g.creator_id, g.created_at
	          FROM groups g
	          JOIN group_members gm ON g.group_id = gm.group_id
	          WHERE gm.member_id = ? AND gm.status = 'accepted'`
	rows, err := db.db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	groups := []*Group{}
	for rows.Next() {
		g := &Group{}
		var createdAtStr string
		err := rows.Scan(&g.GroupID, &g.Title, &g.Description, &g.CreatorID, &createdAtStr)
		if err != nil {
			return nil, err
		}
		// Parse the time string into a time.Time
		g.CreatedAt, err = time.Parse("2006-01-02 15:04:05", createdAtStr)
		if err != nil {
			return nil, err
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
		err := rows.Scan(&m.MembershipID, &m.InviterID, &m.MemberID, &m.GroupID, &m.Status, &m.CreatedAt)
		if err != nil {
			return nil, err
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
		err := rows.Scan(&inv.MembershipID, &inv.InviterID, &inv.MemberID, &inv.GroupID, &inv.Status, &inv.CreatedAt)
		if err != nil {
			return nil, err
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
		err := rows.Scan(&req.MembershipID, &req.InviterID, &req.MemberID, &req.GroupID, &req.Status, &req.CreatedAt)
		if err != nil {
			return nil, err
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

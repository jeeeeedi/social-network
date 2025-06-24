package dbTools

import (
	"fmt"
	"log"
)

// NotificationService handles all notification-related database operations
type NotificationService struct {
	db *DB
}

// NewNotificationService creates a new notification service instance
func NewNotificationService(db *DB) *NotificationService {
	return &NotificationService{db: db}
}

// CreateNotification creates a new notification in the database
func (ns *NotificationService) CreateNotification(receiverID, actorID int, actionType, parentType string, parentID int, content string) error {
	query := `INSERT INTO notifications (receiver_id, actor_id, action_type, parent_type, parent_id, content, status, created_at)
	          VALUES (?, ?, ?, ?, ?, ?, 'unread', datetime('now'))`
	_, err := ns.db.Exec(query, receiverID, actorID, actionType, parentType, parentID, content)
	return err
}

// GetNotificationsByUserID retrieves all notifications for a user
func (ns *NotificationService) GetNotificationsByUserID(userID int) ([]Notification, error) {
	query := `SELECT n.notification_id, n.receiver_id, n.actor_id, n.action_type, n.parent_type, n.parent_id,
	                 n.content, n.status, n.created_at, COALESCE(u.nickname, u.first_name) as nickname, 
	                 COALESCE(u.avatar, '') as avatar
	          FROM notifications n
	          JOIN users u ON n.actor_id = u.user_id
	          WHERE n.receiver_id = ? AND n.status != 'inactive'
	          ORDER BY n.created_at DESC`

	rows, err := ns.db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	notifications := []Notification{}
	for rows.Next() {
		var n Notification
		err := rows.Scan(&n.NotificationID, &n.ReceiverID, &n.ActorID, &n.ActionType, &n.ParentType,
			&n.ParentID, &n.Content, &n.Status, &n.CreatedAt, &n.Nickname, &n.Avatar)
		if err != nil {
			return nil, err
		}
		notifications = append(notifications, n)
	}
	return notifications, nil
}

// UpdateNotificationStatus updates a notification's status
func (ns *NotificationService) UpdateNotificationStatus(notificationID int, status string, updaterID int) error {
	query := `UPDATE notifications SET status = ?, updated_at = datetime('now'), updater_id = ?
	          WHERE notification_id = ?`
	_, err := ns.db.Exec(query, status, updaterID, notificationID)
	return err
}

// MarkAsRead marks a specific notification as read
func (ns *NotificationService) MarkAsRead(notificationID, userID int) error {
	query := `UPDATE notifications 
	          SET status = 'read', updated_at = datetime('now'), updater_id = ?
	          WHERE notification_id = ? AND receiver_id = ? AND status = 'unread'`
	result, err := ns.db.Exec(query, userID, notificationID, userID)
	if err != nil {
		return err
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return fmt.Errorf("notification not found or already read")
	}
	return nil
}

// ClearReadNotifications marks all read notifications as inactive for a user
func (ns *NotificationService) ClearReadNotifications(userID int) error {
	query := `UPDATE notifications 
	          SET status = 'inactive', updated_at = datetime('now'), updater_id = ?
	          WHERE receiver_id = ? AND status = 'read'`
	_, err := ns.db.Exec(query, userID, userID)
	return err
}

// NotificationHelpers contains utility functions for creating specific types of notifications
type NotificationHelpers struct {
	service *NotificationService
	db      *DB
}

// NewNotificationHelpers creates a new notification helpers instance
func NewNotificationHelpers(db *DB) *NotificationHelpers {
	return &NotificationHelpers{
		service: NewNotificationService(db),
		db:      db,
	}
}

// CreateFollowRequestNotification creates a follow request notification
func (nh *NotificationHelpers) CreateFollowRequestNotification(followerID, followedID, followID int) error {
	nickname, err := nh.getUserNickname(followerID)
	if err != nil {
		nickname = "Someone"
	}

	content := fmt.Sprintf("%s wants to follow you", nickname)
	return nh.service.CreateNotification(followedID, followerID, "follow_request", "follow", followID, content)
}

// CreateFollowAcceptedNotification creates a follow accepted notification
func (nh *NotificationHelpers) CreateFollowAcceptedNotification(followerID, followedID, followID int) error {
	nickname, err := nh.getUserNickname(followedID)
	if err != nil {
		nickname = "Someone"
	}

	content := fmt.Sprintf("%s accepted your follow request", nickname)
	return nh.service.CreateNotification(followerID, followedID, "follow_accepted", "follow", followID, content)
}

// CreateGroupInvitationNotification creates a group invitation notification
func (nh *NotificationHelpers) CreateGroupInvitationNotification(inviterID, inviteeID, groupID int, groupTitle string) error {
	inviterName, err := nh.getUserNickname(inviterID)
	if err != nil {
		inviterName = "Someone"
	}

	content := fmt.Sprintf("%s invited you to join the group '%s'", inviterName, groupTitle)
	return nh.service.CreateNotification(inviteeID, inviterID, "group_invitation", "group", groupID, content)
}

// CreateGroupJoinRequestNotification creates a group join request notification
func (nh *NotificationHelpers) CreateGroupJoinRequestNotification(requesterID, creatorID, groupID int, groupTitle string) error {
	requesterName, err := nh.getUserNickname(requesterID)
	if err != nil {
		requesterName = "Someone"
	}

	content := fmt.Sprintf("%s wants to join your group '%s'", requesterName, groupTitle)
	return nh.service.CreateNotification(creatorID, requesterID, "group_join_request", "group", groupID, content)
}

// CreateGroupRequestResponseNotification creates notifications for group request responses
func (nh *NotificationHelpers) CreateGroupRequestResponseNotification(responderID, requesterID, groupID int, groupTitle string, accepted bool) error {
	responderName, err := nh.getUserNickname(responderID)
	if err != nil {
		responderName = "Group Owner"
	}

	var content string
	var actionType string

	if accepted {
		content = fmt.Sprintf("Your request to join '%s' has been accepted by %s", groupTitle, responderName)
		actionType = "follow_accepted" // Reusing existing action type
	} else {
		content = fmt.Sprintf("Your request to join '%s' has been declined by %s", groupTitle, responderName)
		actionType = "comment" // Using generic action type
	}

	return nh.service.CreateNotification(requesterID, responderID, actionType, "group", groupID, content)
}

// UpdateFollowRequestNotificationStatus updates follow request notification status to read
func (nh *NotificationHelpers) UpdateFollowRequestNotificationStatus(followID, updaterID int) error {
	query := `UPDATE notifications
	          SET status = 'read', updated_at = datetime('now'), updater_id = ?
	          WHERE parent_type = 'follow' AND parent_id = ? AND action_type = 'follow_request'`
	result, err := nh.db.Exec(query, updaterID, followID)
	if err != nil {
		return err
	}

	rowsAffected, _ := result.RowsAffected()
	log.Printf("Updated %d notification(s) for follow_id %d to status 'read'", rowsAffected, followID)
	return nil
}

// UpdateGroupInvitationNotificationStatus updates group invitation notification status when responded to
func (nh *NotificationHelpers) UpdateGroupInvitationNotificationStatus(groupID, userID int, status string) error {
	query := `UPDATE notifications
	          SET status = ?, updated_at = datetime('now'), updater_id = ?
	          WHERE parent_type = 'group' AND parent_id = ? AND action_type = 'group_invitation' AND receiver_id = ?`
	result, err := nh.db.Exec(query, status, userID, groupID, userID)
	if err != nil {
		return err
	}

	rowsAffected, _ := result.RowsAffected()
	log.Printf("Updated %d group invitation notification(s) for group_id %d to status '%s'", rowsAffected, groupID, status)
	return nil
}

// UpdateGroupJoinRequestNotificationStatus updates group join request notification status when responded to
func (nh *NotificationHelpers) UpdateGroupJoinRequestNotificationStatus(groupID, requesterID, responderID int, status string) error {
	query := `UPDATE notifications
	          SET status = ?, updated_at = datetime('now'), updater_id = ?
	          WHERE parent_type = 'group' AND parent_id = ? AND action_type = 'group_join_request' AND actor_id = ?`
	result, err := nh.db.Exec(query, status, responderID, groupID, requesterID)
	if err != nil {
		return err
	}

	rowsAffected, _ := result.RowsAffected()
	log.Printf("Updated %d group join request notification(s) for group_id %d and requester_id %d to status '%s'", rowsAffected, groupID, requesterID, status)
	return nil
}

// getUserNickname is a helper function to get user nickname or first name
func (nh *NotificationHelpers) getUserNickname(userID int) (string, error) {
	var nickname string
	query := `SELECT COALESCE(nickname, first_name) as name FROM users WHERE user_id = ?`
	err := nh.db.QueryRow(query, userID).Scan(&nickname)
	return nickname, err
}

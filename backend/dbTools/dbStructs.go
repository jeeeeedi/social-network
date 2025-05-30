package dbTools

import (
	"time"
)

type User struct {
	UserID      int       `json:"user_id"`
	UserUUID    string    `json:"user_uuid"`
	Email       string    `json:"email"`
	Password    string    `json:"password"`
	FirstName   string    `json:"first_name"`
	LastName    string    `json:"last_name"`
	DateOfBirth time.Time `json:"date_of_birth"`
	Nickname    string    `json:"nickname,omitempty"`
	AboutMe     string    `json:"about_me,omitempty"`
	Avatar      string    `json:"avatar,omitempty"`
	Privacy     string    `json:"privacy"` // private, public
	Role        string    `json:"role"`    // user, admin, group_moderator
	Status      string    `json:"status"`  // active, inactive
	CreatedAt   string    `json:"created_at"`
	UpdatedAt   string    `json:"updated_at"`
	UpdaterID   int       `json:"updater_id"`
}

type Session struct {
	SessionUUID string     `json:"session_uuid"`
	SessionID   int        `json:"session_id"`
	UserID      int        `json:"user_id"`
	Status      string     `json:"status"` // active, inactive
	CreatedAt   time.Time  `json:"created_at"`
	ExpiresAt   time.Time  `json:"expires_at"`
	UpdatedAt   *time.Time `json:"updated_at"`
	UpdaterID   int        `json:"updater_id"`
}

type File struct {
	FileID     int        `json:"file_id"`
	UploaderID int        `json:"uploader_id"`
	Filename   string     `json:"filename"`
	ParentType string     `json:"parent_type"` // profile, post, comment, group, event, chat
	ParentID   int        `json:"parent_id"`   // ID from User, Post, Comment, Group, Event, or ChatMessage
	Status     string     `json:"status"`      // active, inactive
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  *time.Time `json:"updated_at"`
	UpdaterID  int        `json:"updater_id"`
}

type Post struct {
	PostID    int        `json:"post_id"`
	PostUUID  string     `json:"post_uuid"`
	PosterID  int        `json:"poster_id"`
	GroupID   int        `json:"group_id"`
	Content   string     `json:"content"`
	Privacy   string     `json:"privacy"` // public, semi-private, private
	Status    string     `json:"status"`  // active, inactive
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt *time.Time `json:"updated_at"`
	UpdaterID int        `json:"updater_id"`
}

type Comment struct {
	CommentID   int    `json:"comment_id"`
	CommenterID int    `json:"commenter_id"`
	PostID      int    `json:"post_id"`
	GroupID     int    `json:"group_id"`
	Content     string `json:"content"`
	// PostPrivacy string // seems redundant, can be derived from Post
	Status    string     `json:"status"` // active, inactive
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt *time.Time `json:"updated_at"`
	UpdaterID int        `json:"updater_id"`
}

type PostCategory struct {
	CategoryID   int        `json:"category_id"`
	CreatorID    int        `json:"creator_id"`
	PostID       int        `json:"post_id"`
	CategoryName string     `json:"category_name"`
	Status       string     `json:"status"` // active, inactive
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    *time.Time `json:"updated_at"`
	UpdaterID    int        `json:"updater_id"`
}

type Interaction struct {
	InteractionID   int        `json:"interaction_id"`
	UserID          int        `json:"user_id"`
	InteractionType string     `json:"interaction_type"` // like, dislike, cancelled
	ParentType      string     `json:"parent_type"`      // post, comment
	ParentID        int        `json:"parent_id"`
	Status          string     `json:"status"` // active, inactive
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       *time.Time `json:"updated_at"`
	UpdaterID       int        `json:"updater_id"`
}

type Follow struct {
	FollowID  int        `json:"follow_id"`
	Followed  int        `json:"followed_id"`
	Follower  int        `json:"follower_id"`
	Status    string     `json:"status"` // pending, accepted, declined, cancelled
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt *time.Time `json:"updated_at"`
	UpdaterID int        `json:"updater_id"`
}

type Group struct {
	GroupID     int        `json:"group_id"`
	Title       string     `json:"title"`
	Description string     `json:"description"`
	Status      string     `json:"status"` // active, inactive
	CreatorID   int        `json:"creator_id"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   *time.Time `json:"updated_at"`
	UpdaterID   int        `json:"updater_id"`
}

type GroupMember struct {
	MembershipID int        `json:"membership_id"`
	InviterID    int        `json:"inviter_id"`
	MemberID     int        `json:"member_id"`
	GroupID      int        `json:"group_id"`
	Status       string     `json:"status"` // invited, requested, accepted, declined, cancelled
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    *time.Time `json:"updated_at"`
	UpdaterID    int        `json:"updater_id"`
}

type Event struct {
	EventID       int        `json:"event_id"`
	CreatorID     int        `json:"creator_id"`
	GroupID       int        `json:"group_id"`
	Title         string     `json:"title"`
	Description   string     `json:"description"`
	EventDateTime time.Time  `json:"event_date_time"`
	Status        string     `json:"status"` // upcoming, ongoing, completed, cancelled
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     *time.Time `json:"updated_at"`
	UpdaterID     int        `json:"updater_id"`
}

type EventRSVP struct {
	RSVPID      int        `json:"rsvp_id"`
	EventID     int        `json:"event_id"`
	ResponderID int        `json:"responder_id"`
	Response    string     `json:"response"` // going, not_going
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   *time.Time `json:"updated_at"`
	UpdaterID   int        `json:"updater_id"`
}

type ChatMessage struct {
	ChatID     int        `json:"chat_id"`
	SenderID   int        `json:"sender_id"`
	ReceiverID int        `json:"receiver_id"` // Null for group chats
	GroupID    int        `json:"group_id"`    // Null for private chats
	Content    string     `json:"content"`
	Status     string     `json:"status"` // active, inactive
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  *time.Time `json:"updated_at"`
	UpdaterID  int        `json:"updater_id"`
}

type Notification struct {
	NotificationID int        `json:"notification_id"`
	ReceiverID     int        `json:"receiver_id"`
	ActorID        int        `json:"actor_id"`
	ActionType     string     `json:"action_type"` // like, dislike, comment, follow_request, follow_accepted, group_invitation, group_join_request, group_event
	ParentType     string     `json:"parent_type"` // follow, post, comment, chat, group, event
	ParentID       int        `json:"parent_id"`   // ID from Follow, Post, Comment, ChatMessage, Group, Event
	Content        string     `json:"content"`
	Status         string     `json:"status"` // read, unread, inactive
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      *time.Time `json:"updated_at"`
	UpdaterID      int        `json:"updater_id"`
}

/* NOTES:
- sql.Null* types are for nullable DB columns:
	- Valid (bool), value (e.g., String, Int64).
	- if Valid == true, value != null; if Valid == false, value == NULL in the DB.
*/

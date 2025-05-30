package dbTools

import (
	"database/sql"
	"time"
)

type User struct {
	UserID      int            `json:"user_id"`
	UserUUID    string         `json:"user_uuid"`
	Email       string         `json:"email"`
	Password    string         `json:"password"`
	FirstName   string         `json:"first_name"`
	LastName    string         `json:"last_name"`
	DateOfBirth time.Time      `json:"date_of_birth"`
	Nickname    sql.NullString `json:"nickname,omitempty"`
	AboutMe     sql.NullString `json:"about_me,omitempty"`
	Avatar      string         `json:"avatar,omitempty"`
	Privacy     string         `json:"privacy"` // private, public
	Role        string         `json:"role"`    // user, admin, group_moderator
	Status      string         `json:"status"`  // active, inactive
	CreatedAt   string         `json:"created_at"`
	UpdatedAt   string         `json:"updated_at"`
	UpdaterID   int            `json:"updater_id"`
}

type Session struct {
	SessionUUID string
	UserID      int
	Status      string // active, inactive
	CreatedAt   time.Time
	ExpiresAt   time.Time
	UpdatedAt   *time.Time
	UpdaterID   int
}

type File struct {
	FileID     int
	UploaderID int
	Filename   string
	ParentType string // profile, post, comment, group, event, chat
	ParentID   int    // ID from User, Post, Comment, Group, Event, or ChatMessage
	Status     string // active, inactive
	CreatedAt  time.Time
	UpdatedAt  *time.Time
	UpdaterID  int
}

type Post struct {
	PostID    int
	PostUUID  string
	PosterID  int
	GroupID   int
	Content   string
	Privacy   string // public, semi-private, private
	Status    string // active, inactive
	CreatedAt time.Time
	UpdatedAt *time.Time
	UpdaterID int
}

type Comment struct {
	CommentID   int
	CommenterID int
	PostID      int
	GroupID     int // Nullable for regular posts
	Content     string
	// PostPrivacy string // seems redundant, can be derived from Post
	Status    string // active, inactive
	CreatedAt time.Time
	UpdatedAt *time.Time
	UpdaterID int
}

type PostCategory struct {
	CategoryID   int
	CreatorID    int
	PostID       int
	CategoryName string
	Status       string // active, inactive
	CreatedAt    time.Time
	UpdatedAt    *time.Time
	UpdaterID    int
}

type Interaction struct {
	InteractionID   int
	UserID          int
	InteractionType string // like, dislike, cancelled
	ParentType      string // post, comment
	ParentID        int
	Status          string // active, inactive
	CreatedAt       time.Time
	UpdatedAt       *time.Time
	UpdaterID       int
}

type Follow struct {
	FollowID  int
	Followed  int
	Follower  int
	Status    string // pending, accepted, declined, cancelled
	CreatedAt time.Time
	UpdatedAt *time.Time
	UpdaterID int
}

type Group struct {
	GroupID     int
	Title       string
	Description string
	Status      string // active, inactive
	CreatorID   int
	CreatedAt   time.Time
	UpdatedAt   *time.Time
	UpdaterID   int
}

type GroupMember struct {
	MembershipID     int
	InviterID        int
	MemberID         int
	GroupID          int
	Status           string // invited, requested, accepted, declined, cancelled
	InviterIsCreator bool
	CreatedAt        time.Time
	UpdatedAt        *time.Time
	UpdaterID        int
}

type Event struct {
	EventID       int
	CreatorID     int
	Group         *Group
	Title         string
	Description   string
	EventDateTime time.Time
	Status        string // upcoming, ongoing, completed, cancelled
	CreatedAt     time.Time
	UpdatedAt     *time.Time
	UpdaterID     int
}

type EventRSVP struct {
	RSVPID      int
	EventID     int
	ResponderID int
	Response    string // going, not_going
	CreatedAt   time.Time
	UpdatedAt   *time.Time
	UpdaterID   int
}

type ChatMessage struct {
	ChatID     int
	SenderID   int
	ReceiverID int // Null for group chats
	GroupID    int // Null for private chats
	Content    string
	Status     string // active, inactive
	CreatedAt  time.Time
	UpdatedAt  *time.Time
	UpdaterID  int
}

type Notification struct {
	NotificationID int
	ReceiverID     int
	ActorID        int
	ActionType     string // like, dislike, comment, follow_request, follow_accepted, group_invitation, group_join_request, group_event
	ParentType     string // follow, post, comment, chat, group, event
	ParentID       int    // ID from Follow, Post, Comment, ChatMessage, Group, Event
	Content        string
	Status         string // read, unread, inactive
	CreatedAt      time.Time
	UpdatedAt      *time.Time
	UpdaterID      int
}

/* NOTES:
- sql.Null* types are for nullable DB columns:
	- Valid (bool), value (e.g., String, Int64).
	- if Valid == true, value != null; if Valid == false, value == NULL in the DB.
*/

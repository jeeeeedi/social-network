package dbTools

import (
	"database/sql"
	"time"
)

type User struct {
	UserID      int
	UserUUID    string
	Email       string
	Password    string
	FirstName   string
	LastName    string
	DateOfBirth time.Time
	Nickname    sql.NullString
	AboutMe     sql.NullString
	Privacy     string // private, public
	Role        string // user, admin, group_moderator
	Status      string // active, inactive
	CreatedAt   time.Time
	UpdatedAt   *time.Time
	Updater     *User
}

type Session struct {
	SessionUUID string
	User        *User
	Status      string // active, inactive
	CreatedAt   time.Time
	ExpiresAt   time.Time
	UpdatedAt   *time.Time
	Updater     *User
}

type File struct {
	FileID     int
	Uploader   *User
	Filename   string
	ParentType string // profile, post, comment, group, event, chat
	ParentID   int    // ID from User, Post, Comment, Group, Event, or ChatMessage
	Status     string // active, inactive
	CreatedAt  time.Time
	UpdatedAt  *time.Time
	Updater    *User
}

type Post struct {
	PostID    int
	PostUUID  string
	Poster    *User
	Group     *Group
	Content   string
	Privacy   string // public, semi-private, private
	Status    string // active, inactive
	CreatedAt time.Time
	UpdatedAt *time.Time
	Updater   *User
}

type Comment struct {
	CommentID int
	Commenter *User
	Post      *Post
	Group     *Group // Nullable for regular posts
	Content   string
	// PostPrivacy string // seems redundant, can be derived from Post
	Status    string // active, inactive
	CreatedAt time.Time
	UpdatedAt *time.Time
	Updater   *User
}

type PostCategory struct {
	CategoryID   int
	Creator      *User
	Post         *Post
	CategoryName string
	Status       string // active, inactive
	CreatedAt    time.Time
	UpdatedAt    *time.Time
	Updater      *User
}

type Interaction struct {
	InteractionID   int
	User            *User
	InteractionType string // like, dislike, cancelled
	ParentType      string // post, comment
	ParentID        int
	Status          string // active, inactive
	CreatedAt       time.Time
	UpdatedAt       *time.Time
	Updater         *User
}

type Follow struct {
	FollowID  int
	Followed  *User
	Follower  *User
	Status    string // pending, accepted, declined, cancelled
	CreatedAt time.Time
	UpdatedAt *time.Time
	UpdaterID *User
}

type Group struct {
	GroupID     int
	Title       string
	Description string
	Status      string // active, inactive
	Creator     *User
	CreatedAt   time.Time
	UpdatedAt   *time.Time
	Updater     *User
}

type GroupMember struct {
	MembershipID     int
	Inviter          *User
	Member           *User
	Group            *Group
	Status           string // invited, requested, accepted, declined, cancelled
	InviterIsCreator bool
	CreatedAt        time.Time
	UpdatedAt        *time.Time
	Updater          *User
}

type Event struct {
	EventID       int
	Creator       *User
	Group         *Group
	Title         string
	Description   string
	EventDateTime time.Time
	Status        string // upcoming, ongoing, completed, cancelled
	CreatedAt     time.Time
	UpdatedAt     *time.Time
	Updater       *User
}

type EventRSVP struct {
	RSVPID    int
	Event     *Event
	Responder *User
	Response  string // going, not_going
	CreatedAt time.Time
	UpdatedAt *time.Time
	Updater   *User
}

type ChatMessage struct {
	ChatID    int
	Sender    *User
	Receiver  *User  // Null for group chats
	Group     *Group // Null for private chats
	Content   string
	Status    string // active, inactive
	CreatedAt time.Time
	UpdatedAt *time.Time
	Updater   *User
}

type Notification struct {
	NotificationID int
	Receiver       *User
	Actor          *User
	ActionType     string // like, dislike, comment, follow_request, follow_accepted, group_invitation, group_join_request, group_event
	ParentType     string // follow, post, comment, chat, group, event
	ParentID       int    // ID from Follow, Post, Comment, ChatMessage, Group, Event
	Content        string
	Status         string // read, unread, inactive
	CreatedAt      time.Time
	UpdatedAt      *time.Time
	Updater        *User
}

/* NOTES:
- sql.Null* types are for nullable DB columns:
	- Valid (bool), value (e.g., String, Int64).
	- if Valid == true, value != null; if Valid == false, value == NULL in the DB.
*/

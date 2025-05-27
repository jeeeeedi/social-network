# Social Network

A Facebook-like social network application with authentication, profiles, posts, groups, notifications and chat functionality.

## Quick Start

We've included a setup script to get you up and running quickly:

```bash
# Make the setup script executable
chmod +x setup.sh

# Run the setup script
./setup.sh
```

This script will:
1. Check for required dependencies (Node.js for frontend, Go for backend)
2. Install necessary packages for both frontend and backend
3. Set up the database with migrations
4. Provide instructions for starting the applications

## Manual Setup

If you prefer to set up manually:

### Prerequisites
- Node.js (v14.0.0 or newer) - for frontend
- npm - for frontend
- Go (v1.21 or newer) - for backend
- SQLite3

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

### Backend Setup
```bash
# Install Go dependencies
go mod tidy

# Start the backend server
go run main.go
```

### Database Setup
```bash
make migrateup
```

## Project Structure

- `/frontend` - React-based frontend application
- `/backend` - Go backend API server
- `/db` - SQLite database and migrations
- `main.go` - Backend entry point

## Features

- User authentication with sessions
- User profiles with privacy settings
- Posts with privacy controls
- Groups and events
- Real-time notifications
- Private and group chat
- Follower system

## Technology Stack

- **Frontend**: React, React Router, Axios
- **Backend**: Go, Gorilla Mux, SQLite3
- **Database**: SQLite with migrations
- **Authentication**: Session-based with secure cookies

## Database Schema

See the Entity-Relationship Diagram below:

### WIP: ERD

```mermaid
 erDiagram

    %% --- Users ---
    USERS {
        int user_id PK
        string user_uuid
        string email
        string password
        string first_name
        string last_name
        date date_of_birth
        string nickname_(NULLABLE)
        string about_me_(NULLABLE)
        string privacy(private_public)
        string role(admin_groupmoderator_regularuser)
        string status(active_inactive)
        datetime created_at
        datetime updated_at
        int updater_user_id FK
    }

    %% --- Sessions ---
    SESSIONS {
        string session_uuid PK
        int user_id FK
        string status(active_inactive)
        datetime created_at
        datetime expires_at
        datetime updated_at
        int updater_user_id FK
    }

    %% --- Files (Polymorphic Association: parent_id will depend on / is associated with parent_type) ---
    FILES {
        int file_id PK
        int uploader_user_id FK
        string filename
        string parent_type(profile_post_comment_group_event_chat)
        int parent_id FK
        string status(active_inactive)
        datetime created_at
        datetime updated_at
        int updater_user_id FK
    }

    %% --- Posts (group_id NULL for regular posts) ---
    POSTS {
        int post_id PK
        string post_uuid
        int poster_user_id FK
        int group_id FK
        string content
        string privacy(public_semi-private_private)
        string status(active_inactive)
        datetime created_at
        datetime updated_at
        int updater_user_id FK
    }

    %% --- Comments (group_id NULL for regular post comments) ---
    COMMENTS {
        int comment_id PK
        int commenter_user_id FK
        int post_id FK
        int group_id FK
        string content
        string post_privacy(public_semi-private_private) FK
        string status(active_inactive)
        datetime created_at
        datetime updated_at
        int updater_user_id FK
    }

    %% --- Post Categories ---
    POST_CATEGORIES {
        int category_id PK
        int creator_user_id FK
        int post_id FK
        string category_name
        string status(active_inactive)
        datetime created_at
        datetime updated_at
        int updater_user_id FK
    }

    %% --- Interactions ---
    INTERACTIONS {
        int interactions_id PK
        int user_id FK
        int post_id FK
        string interaction_type(like_dislike_cancelled)
        string parent_type(post_comment)
        int parent_id FK
        string status(active_inactive)
        datetime created_at
        datetime updated_at
        int updater_user_id FK
    }

    %% --- Follows (if followed_user_id is public, status is auto accepted) ---
    FOLLOWS {
        int follow_id PK
        int followed_user_id FK
        int follower_user_id FK
        string status(pending_accepted_declined_cancelled)
        datetime created_at
        datetime updated_at
        int updater_user_id FK
    }

    %% --- Groups ---
    GROUPS {
        int group_id PK
        string title
        string description
        int creator_user_id FK
        datetime created_at
        datetime updated_at
        int updater_user_id FK
    }

    %% --- Group Memberships ---
    GROUP_MEMBERS {
        int membership_id PK
        int inviter_user_id FK
        int member_user_id FK
        int group_id FK
        string status(invited_requested_accepted_declined_cancelled)
        boolean inviter_is_creator
        datetime created_at
        datetime updated_at
        int updater_user_id FK
    }

    %% --- Events ---
    EVENTS {
        int event_id PK
        int creator_user_id FK
        int group_id FK
        string title
        string description
        datetime event_date_time
        string status(upcoming_ongoing_completed_cancelled)
        datetime created_at
        datetime updated_at
        int updater_user_id FK
    }

    %% --- Event Responses ---
    EVENT_RSVP {
        int rsvp_id PK
        int event_id FK
        int user_id FK
        string response(going_notgoing)
        datetime created_at
        datetime updated_at
        int updater_user_id FK
    }

    %% --- Chat Messages (private chats go to receiver_user_id so group_id will be null; but group chats will reference group_id then query all members of that group, so receiver_user_id will be null) ---
    CHAT_MESSAGES {
        int chat_id PK
        int sender_user_id FK
        int receiver_user_id FK
        int group_id FK
        string content
        datetime created_at
        datetime updated_at
        int updater_user_id FK
    }

    %% --- Notifications (should we combine intractions and notifications???) ---
    NOTIFICATIONS {
        int notification_id PK
        int receiver_user_id FK
        int actor_user_id FK
        string action_type(like_dislike_comment_followrequest_newmessage_groupinvite_grouprequest_newevent)
        string parent_type(follow_post_comment_chat_group_event)
        int parent_id FK
        string content
        string status(read_unread_inactive)
        datetime created_at
        datetime updated_at
        int updater_user_id FK
    }

    %% --- Relationships ---
    USERS ||--o{ SESSIONS : start
    USERS ||--o{ FOLLOWS : follow
    USERS ||--o{ NOTIFICATIONS : receive
    USERS ||--o{ POSTS : post
    POSTS ||--o{ COMMENTS : have
    GROUP_MEMBERS ||--o{ COMMENTS : comment
    USERS ||--o{ COMMENTS : comment
    USERS ||--o{ INTERACTIONS : do
    POSTS ||--o{ INTERACTIONS : have
    COMMENTS ||--o{ INTERACTIONS : have
    POSTS ||--o{ POST_CATEGORIES : have
    COMMENTS ||--o{ FILES : have
    POSTS ||--o{ FILES : have
    EVENTS ||--o{ FILES : have
    GROUPS ||--o{ FILES : have
    USERS ||--o{ FILES : have
    CHAT_MESSAGES ||--o{ FILES : have
    GROUP_MEMBERS ||--o{ CHAT_MESSAGES : send
    USERS ||--o{ CHAT_MESSAGES : send
    USERS ||--o{ GROUPS : create
    GROUPS ||--o{ GROUP_MEMBERS : have
    USERS ||--o{ GROUP_MEMBERS : join
    GROUPS ||--o{ POSTS : have
    GROUP_MEMBERS ||--o{ POSTS : post
    GROUP_MEMBERS ||--o{ EVENT_RSVP : respond
    EVENTS ||--o{ EVENT_RSVP : get
    GROUP_MEMBERS ||--o{ EVENTS : start
```

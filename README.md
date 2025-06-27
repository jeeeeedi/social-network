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

This script will do the following:

1. Check for required dependencies (Node.js v14+ for frontend, Go v1.21+ for backend)
2. Install necessary packages for both frontend and backend
3. Set up the database with initial migrations
4. Create necessary directories and configuration files
5. Provide instructions for starting the applications

### Run the Program Locally

There is a Makefile that can run on Mac/Linux:

```bash
# Start both backend and frontend (from project root)
make start

# Stop all running services
make stop
```

### Run the Program on Docker

We provide a script to build and run the application using Docker:

```bash
# Make the script executable (if not already)
chmod +x docker.sh

# Start the backend and frontend containers
./docker.sh
```

This script will do the following:

- Stop and remove any existing containers (`social-network-backend`, `social-network-frontend`)
- Prune unused containers and images to free up space
- Build Docker images with tags `social-network:backend` and `social-network:frontend`
- Start both containers with proper networking
- Set up volume mounts for database persistence

**Managing containers:**
```bash
# Stop containers
docker-compose down

# View container logs
docker logs social-network-backend
docker logs social-network-frontend

# View running containers
docker ps
```

## Manual Setup

If you prefer to set up manually, follow these steps:

### Prerequisites

**Required:**
- **Node.js** (v14.0.0 or newer) and npm – required for the Next.js frontend
- **Go** (v1.21 or newer) – required for the backend API
- **SQLite3** – database engine (usually pre-installed on Mac/Linux)

**Optional:**
- **Docker & Docker Compose** – if you prefer containerized deployment
- **Make** – for using the Makefile commands

**Verify installations:**
```bash
node --version    # Should show v14.0.0 or higher
npm --version     # Should show 6.0.0 or higher  
go version        # Should show go1.21 or higher
sqlite3 --version # Should show SQLite3 version
```

### Frontend Setup (Next.js)

```bash
npm install
npm run dev
```

The frontend will be available at `http://localhost:3000`

### Backend Setup (Go)

```bash
cd backend

# Start the backend server
go run main.go
```

The backend will be available at `http://localhost:8080`

## Project Structure

- `root` - React-based frontend application
- `/backend` - Go backend API server
- `/backend/db` - SQLite database and migrations
- `/backend/main.go` - Backend entry point

## Features

- User authentication with sessions
- User profiles with privacy settings
- Posts with privacy controls
- Groups and events
- Real-time notifications
- Private and group chat
- Follower system

## Technology Stack

- **Frontend**: Next.js, React
- **Backend**: Go, Gorilla Websockets, SQLite3
- **Database**: SQLite with migrations
- **Authentication**: Session-based with secure cookies

## Database Schema

See the Entity-Relationship Diagram below:

### ERD

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
        string avatar_(NULLABLE)
        string privacy(private_public)
        string role(user_admin_group_moderator)
        string status(active_inactive)
        datetime created_at
        datetime updated_at
        int updater_id FK
    }

    %% --- Sessions ---
    SESSIONS {
        string session_uuid PK
        int user_id FK
        string status(active_inactive)
        datetime created_at
        datetime expires_at
        datetime updated_at
        int updater_id FK
    }

    %% --- Files (Polymorphic Association: parent_id will depend on / is associated with parent_type) ---
    FILES {
        int file_id PK
        string file_uuid
        int uploader_id FK
        string filename_orig
        string filename_new
        string parent_type(profile_post_comment_group_event_chat)
        int parent_id
        string status(active_inactive)
        datetime created_at
        datetime updated_at
        int updater_id FK
    }

    %% --- Posts (group_id NULL for regular posts) ---
    POSTS {
        int post_id PK
        string post_uuid
        int poster_id FK
        int group_id FK
        string content
        string privacy(public_semi-private_private)
        string status(active_inactive)
        datetime created_at
        datetime updated_at
        int updater_id FK
    }

    %% --- Post Private Viewers (join table for users who can view private posts) ---
    POST_PRIVATE_VIEWERS_JOIN-TABLE {
        int post_id FK
        int user_id FK
    }

    %% --- Comments (group_id NULL for regular post comments) ---
    COMMENTS {
        int comment_id PK
        int commenter_id FK
        int post_id FK
        int group_id FK
        string content
        string post_privacy(public_semi-private_private) FK
        string status(active_inactive)
        datetime created_at
        datetime updated_at
        int updater_id FK
    }

    %% --- Post Categories ---
    POST_CATEGORIES {
        int category_id PK
        int creator_id FK
        int post_id FK
        string category_name
        string status(active_inactive)
        datetime created_at
        datetime updated_at
        int updater_id FK
    }

    %% --- Interactions ---
    INTERACTIONS {
        int interaction_id PK
        int user_id FK
        string interaction_type(like_dislike_cancelled)
        string parent_type(post_comment)
        int parent_id
        string status(active_inactive)
        datetime created_at
        datetime updated_at
        int updater_id FK
    }

    %% --- Follows (if followed_user_id is public, status is auto accepted) ---
    FOLLOWS {
        int follow_id PK
        int followed_user_id FK
        int follower_user_id FK
        string status(pending_accepted_declined_cancelled)
        datetime created_at
        datetime updated_at
        int updater_id FK
    }

    %% --- Groups ---
    GROUPS {
        int group_id PK
        string title
        string description
        string status(active_inactive)
        int creator_id FK
        datetime created_at
        datetime updated_at
        int updater_id FK
    }

    %% --- Group Memberships ---
    GROUP_MEMBERS {
        int membership_id PK
        int inviter_id_(NULLABLE) FK
        int member_id FK
        int group_id FK
        string status(invited_requested_accepted_declined_cancelled)
        datetime created_at
        datetime updated_at
        int updater_id FK
    }

    %% --- Events ---
    EVENTS {
        int event_id PK
        int creator_id FK
        int group_id FK
        string title
        string description
        datetime event_date_time
        string status(upcoming_ongoing_completed_cancelled)
        datetime created_at
        datetime updated_at
        int updater_id FK
    }

    %% --- Event Responses ---
    EVENT_RSVP {
        int rsvp_id PK
        int event_id FK
        int responder_id FK
        string response(going_not_going)
        datetime created_at
        datetime updated_at
        int updater_id FK
    }

    %% --- Chat Messages (private chats go to receiver_user_id so group_id will be null; but group chats will reference group_id then query all members of that group, so receiver_user_id will be null) ---
    CHAT_MESSAGES {
        int chat_id PK
        int sender_id FK
        int receiver_id FK_(NULLABLE)
        int group_id FK_(NULLABLE)
        string content
        string status(active_inactive)
        datetime created_at
        datetime updated_at
        int updater_id FK
    }

    %% --- Notifications (should we combine intractions and notifications???) ---
    NOTIFICATIONS {
        int notification_id PK
        int receiver_id FK
        int actor_id FK
        string action_type(like_dislike_post_comment_chat_message_follow_request_follow_accepted_group_invitation_group_join_request_group_event)
        string parent_type(follow_post_comment_chat_group_event)
        int parent_id
        string content
        string status(read_unread_inactive)
        datetime created_at
        datetime updated_at
        int updater_id FK
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
    USERS ||--o{ POST_PRIVATE_VIEWERS_JOIN-TABLE : can_view
    POSTS ||--o{ POST_PRIVATE_VIEWERS_JOIN-TABLE : viewers
```

# social-network

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
        string avatar_filename_NULLABLE
        string nickname_NULLABLE
        string about_me_NULLABLE
        string privacy(private_public)
        datetime created_at
        datetime updated_at
        }

     %% --- Sessions ---
    SESSIONS {
        string session_uuid PK
        int user_id FK
        datetime created_at
        datetime expires_at
        datetime updated_at
    }

    %% --- Posts (do we combine regular posts and group posts?) ---
    POSTS {
        int post_id PK
        int user_id FK
        int category_id FK
        string content
        string image_filename_NULLABLE
        string privacy(public_semi-private_private)
        int like_count
        int dislike_count
        datetime created_at
        datetime updated_at
    }

    %% --- Comments (combine with group comments?) ---
    COMMENTS {
        int comment_id PK
        int post_id FK
        int user_id FK
        string content
        string image_filename_NULLABLE
        string post_privacy(public_semi-private_private) FK
        int like_count
        int dislike_count
        datetime created_at
        datetime updated_at
    }

    %% --- Post Categories (do we provide a set of cats or do we enable users to add more cats?) ---
    POST_CATEGORIES {
        int category_id PK
        string category_name
        datetime created_at
        datetime updated_at
    }

    %% --- Follows (if followed_user_id is public, status auto accepted) ---
    FOLLOWS {
        int follow_id PK
        int followed_user_id FK
        int follower_user_id FK
        string status(pending_accepted_declined_unfollowed)
        datetime created_at
        datetime updated_at
    }

    %% --- Groups ---
    GROUPS {
        int group_id PK
        string title
        string description
        string banner_filename_NULLABLE
        int creator_user_id FK
        datetime created_at
        datetime updated_at
    }

    %% --- Group Memberships ---
    GROUP_MEMBERS {
        int group_membership_id PK
        int inviter_user_id FK
        int invited_requester_user_id FK
        int group_id FK
        string status(invited_requested_accepted_declined)
        boolean is_creator
        datetime created_at
        datetime updated_at
    }

    %% --- Group Posts ---
    GROUP_POSTS {
        int group_post_id PK
        int group_id FK
        int user_id FK
        string content
        string image_filename_NULLABLE
        int like_count
        int dislike_count
        datetime created_at
        datetime updated_at
    }

    %% --- Group Comments ---
    GROUP_COMMENTS {
        int group_comment_id PK
        int group_id FK
        int user_id FK
        string content
        string image_filename_NULLABLE
        int like_count
        int dislike_count
        datetime created_at
        datetime updated_at
    }

    %% --- Events ---
    EVENTS {
        int event_id PK
        int group_id FK
        string title
        string description
        datetime start_date_time
        string image_filename_NULLABLE
        string status(upcoming_ongoing_completed_cancelled)
        datetime created_at
        datetime updated_at
    }

    %% --- Event Responses ---
    EVENT_RSVP {
        int event_rsvp_id PK
        int event_id FK
        int user_id FK
        string response(going_notgoing)
        datetime created_at
        datetime updated_at
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
    }

    %% --- Relationships ---
    USERS ||--o{ SESSIONS : start
    USERS ||--o{ FOLLOWS : follow
    USERS ||--o{ POSTS : post
    USERS ||--o{ COMMENTS : comment
    POSTS ||--o{ COMMENTS : have
    POSTS ||--o{ POST_CATEGORIES : have
    USERS ||--o{ CHAT_MESSAGES : send
    GROUP_MEMBERS ||--o{ CHAT_MESSAGES : send
    USERS ||--o{ GROUPS : create
    GROUPS ||--o{ GROUP_MEMBERS : have
    USERS ||--o{ GROUP_MEMBERS : join
    GROUPS ||--o{ GROUP_POSTS : have
    GROUP_POSTS ||--o{ GROUP_COMMENTS : have
    GROUP_MEMBERS ||--o{ GROUP_POSTS : post
    EVENTS ||--o{ EVENT_RSVP : get
    GROUP_MEMBERS ||--o{ EVENT_RSVP : respond
    GROUP_MEMBERS ||--o{ GROUP_COMMENTS : comment
    GROUP_MEMBERS ||--o{ EVENTS : start

```

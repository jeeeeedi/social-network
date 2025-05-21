PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "users" (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_uuid TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    first_name TEXT NOT NULL UNIQUE,
    last_name TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    nickname TEXT,
    about_me TEXT,
    privacy TEXT CHECK(privacy IN ('private', 'public')) NOT NULL DEFAULT 'private',
    role TEXT CHECK(role IN ('user', 'admin', 'group_moderator')) NOT NULL DEFAULT 'user',
    status TEXT CHECK(status IN ('active', 'inactive')) NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL,
    updater_id INTEGER,
    FOREIGN KEY(updater_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "sessions" (
    session_uuid TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    status TEXT CHECK(status IN ('active', 'inactive')) NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    updated_at DATETIME,
    updater_id INTEGER,
    FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY(updater_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "files" (
    file_id INTEGER PRIMARY KEY AUTOINCREMENT,
    uploader_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    parent_type TEXT CHECK(parent_type IN ('profile', 'post', 'comment', 'group', 'event', 'chat')) NOT NULL,
    parent_id INTEGER NOT NULL,
    status TEXT CHECK(status IN ('active', 'inactive')) NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    updater_id INTEGER,
    FOREIGN KEY(uploader_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY(updater_id) REFERENCES users(user_id) ON DELETE CASCADE
);
/*
parent_id FK: polymorphic FK not supported — you cannot reference multiple tables with a single FK constraint.
handle data integrity at application level; check it in your backend when inserting or updating data.
*/

CREATE TABLE IF NOT EXISTS "posts" (
    post_id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_uuid TEXT NOT NULL UNIQUE,
    poster_id INTEGER NOT NULL,
    group_id INTEGER,               /* Nullable for regular posts */
    content TEXT NOT NULL,
    privacy TEXT CHECK(privacy IN ('public', 'semi-private', 'private')) NOT NULL DEFAULT 'semi-private',
    status TEXT CHECK(status IN ('active', 'inactive')) NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    updater_id INTEGER,
    FOREIGN KEY(poster_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY(group_id) REFERENCES groups(group_id) ON DELETE CASCADE,
    FOREIGN KEY(updater_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "comments" (
    comment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    commenter_id INTEGER NOT NULL,
    post_id INTEGER NOT NULL,
    group_id INTEGER,               /* Nullable for regular posts */
    content TEXT NOT NULL,
    post_privacy TEXT CHECK(post_privacy IN ('public', 'semi-private', 'private')) NOT NULL DEFAULT 'semi-private',
    status TEXT CHECK(status IN ('active', 'inactive')) NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    updater_id INTEGER,
    FOREIGN KEY(commenter_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY(post_id) REFERENCES posts(post_id) ON DELETE CASCADE,
    FOREIGN KEY(group_id) REFERENCES groups(group_id) ON DELETE CASCADE,
    FOREIGN KEY(updater_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "post_categories" (
    category_id INTEGER PRIMARY KEY AUTOINCREMENT,
    creator_id INTEGER NOT NULL,
    post_id INTEGER NOT NULL,
    category_name TEXT NOT NULL,
    status TEXT CHECK(status IN ('active', 'inactive')) NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    updater_id INTEGER,
    FOREIGN KEY(creator_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY(post_id) REFERENCES posts(post_id) ON DELETE CASCADE,
    FOREIGN KEY(updater_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "interactions" (
    interaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    post_id INTEGER NOT NULL,
    interaction_type TEXT CHECK(interaction_type IN ('like', 'dislike', 'cancelled')) NOT NULL,
    parent_type TEXT CHECK(parent_type IN ('post', 'comment')) NOT NULL,
    parent_id INTEGER NOT NULL,
    status TEXT CHECK(status IN ('active', 'inactive')) NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    updater_id INTEGER,
    FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY(post_id) REFERENCES posts(post_id) ON DELETE CASCADE,
    FOREIGN KEY(updater_id) REFERENCES users(user_id) ON DELETE CASCADE
);

/* if followed_user_id is public, status is auto accepted */
CREATE TABLE IF NOT EXISTS "follows" (
    follow_id INTEGER PRIMARY KEY AUTOINCREMENT,
    followed_user_id INTEGER NOT NULL,
    follower_user_id INTEGER NOT NULL,
    status TEXT CHECK(status IN ('pending', 'accepted', 'declined', 'cancelled')) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    updater_id INTEGER,
    FOREIGN KEY(followed_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY(follower_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY(updater_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "groups" (
    group_id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    creator_id INTEGER NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    updater_id INTEGER,
    FOREIGN KEY(creator_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY(updater_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "group_members" (
    membership_id INTEGER PRIMARY KEY AUTOINCREMENT,
    inviter_id INTEGER NOT NULL,
    member_id INTEGER NOT NULL,
    group_id INTEGER NOT NULL,
    status TEXT CHECK(status IN ('invited', 'requested', 'accepted', 'declined', 'cancelled')) NOT NULL,
    inviter_is_creator BOOLEAN NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    updater_id INTEGER,
    FOREIGN KEY(inviter_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY(member_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY(group_id) REFERENCES groups(group_id) ON DELETE CASCADE,
    FOREIGN KEY(updater_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "events" (
    event_id INTEGER PRIMARY KEY AUTOINCREMENT,
    creator_id INTEGER NOT NULL,
    group_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    event_date_time DATETIME CHECK(event_date_time > CURRENT_TIMESTAMP) NOT NULL,
    status TEXT CHECK(status IN ('upcoming', 'ongoing', 'completed', 'cancelled')) NOT NULL DEFAULT 'upcoming',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    updater_id INTEGER,
    FOREIGN KEY(creator_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY(group_id) REFERENCES groups(group_id) ON DELETE CASCADE,
    FOREIGN KEY(updater_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "event_rsvp" (
    rsvp_id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    responder_id INTEGER NOT NULL,
    response TEXT CHECK(response IN ('going', 'notgoing')) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    updater_id INTEGER,
    FOREIGN KEY(event_id) REFERENCES events(event_id) ON DELETE CASCADE,
    FOREIGN KEY(responder_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY(updater_id) REFERENCES users(user_id) ON DELETE CASCADE
);

/*
private chats have receiver_id, so group_id = null
but group chats have group_id then query all members of that group, so receiver_id = null
*/
CREATE TABLE IF NOT EXISTS "chat_messages" (
    chat_id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL,
    receiver_id INTEGER,
    group_id INTEGER,
    content TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    updater_id INTEGER,
    FOREIGN KEY(sender_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY(receiver_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY(group_id) REFERENCES groups(group_id) ON DELETE CASCADE,
    FOREIGN KEY(updater_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "notifications" (
    notification_id INTEGER PRIMARY KEY AUTOINCREMENT,
    receiver_id INTEGER NOT NULL,
    actor_id INTEGER NOT NULL,
    action_type TEXT CHECK(action_type IN ('like', 'dislike', 'comment', 'follow_request', 'follow_accepted', 'group_invitation', 'group_join_request', 'group_event')) NOT NULL,
    parent_type TEXT CHECK(parent_type IN ('follow', 'post', 'comment', 'chat', 'group', 'event')) NOT NULL,
    parent_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    updater_id INTEGER,
    FOREIGN KEY(receiver_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY(actor_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY(updater_id) REFERENCES users(user_id) ON DELETE CASCADE
);

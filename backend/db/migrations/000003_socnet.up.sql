PRAGMA foreign_keys=off;

-- 1. Update "files" table to add file_uuid
CREATE TABLE files_new (
    file_id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_uuid TEXT NOT NULL UNIQUE,
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

INSERT INTO files_new (
    file_id, uploader_id, filename, parent_type, parent_id, status, created_at, updated_at, updater_id
)
SELECT
    file_id, uploader_id, filename, parent_type, parent_id, status, created_at, updated_at, updater_id
FROM files;

DROP TABLE files;
ALTER TABLE files_new RENAME TO files;

-- 2. Update "notifications" table action_type options
CREATE TABLE notifications_new (
    notification_id INTEGER PRIMARY KEY AUTOINCREMENT,
    receiver_id INTEGER NOT NULL,
    actor_id INTEGER NOT NULL,
    action_type TEXT CHECK(action_type IN ('like', 'dislike', 'post', 'comment', 'chat_message', 'follow_request', 'follow_accepted', 'group_invitation', 'group_join_request', 'group_event')) NOT NULL,
    parent_type TEXT CHECK(parent_type IN ('follow', 'post', 'comment', 'chat', 'group', 'event')) NOT NULL,
    parent_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    status TEXT CHECK(status IN ('read', 'unread', 'inactive')) NOT NULL DEFAULT 'unread',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    updater_id INTEGER,
    FOREIGN KEY(receiver_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY(actor_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY(updater_id) REFERENCES users(user_id) ON DELETE CASCADE
);

INSERT INTO notifications_new (
    notification_id, receiver_id, actor_id, action_type, parent_type, parent_id, content, status, created_at, updated_at, updater_id
)
SELECT
    notification_id, receiver_id, actor_id, action_type, parent_type, parent_id, content, status, created_at, updated_at, updater_id
FROM notifications;

DROP TABLE notifications;
ALTER TABLE notifications_new RENAME TO notifications;

PRAGMA foreign_keys=on;
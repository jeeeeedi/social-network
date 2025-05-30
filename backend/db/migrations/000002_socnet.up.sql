-- 1. Add the join table for post_private_viewers
CREATE TABLE IF NOT EXISTS post_private_viewers (
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    PRIMARY KEY (post_id, user_id),
    FOREIGN KEY(post_id) REFERENCES posts(post_id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 2. Change inviter_id in group_members to nullable and remove inviter_is_creator
-- SQLite does not support DROP COLUMN directly, so you must:
--   a) create a new table with the desired schema,
--   b) copy data,
--   c) drop the old table,
--   d) rename the new table.

PRAGMA foreign_keys=off;

CREATE TABLE group_members_new (
    membership_id INTEGER PRIMARY KEY AUTOINCREMENT,
    inviter_id INTEGER,
    member_id INTEGER NOT NULL,
    group_id INTEGER NOT NULL,
    status TEXT CHECK(status IN ('invited', 'requested', 'accepted', 'declined', 'cancelled')) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    updater_id INTEGER,
    FOREIGN KEY(inviter_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY(member_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY(group_id) REFERENCES groups(group_id) ON DELETE CASCADE,
    FOREIGN KEY(updater_id) REFERENCES users(user_id) ON DELETE CASCADE
);

INSERT INTO group_members_new (
    membership_id, inviter_id, member_id, group_id, status, created_at, updated_at, updater_id
)
SELECT
    membership_id, inviter_id, member_id, group_id, status, created_at, updated_at, updater_id
FROM group_members;

DROP TABLE group_members;
ALTER TABLE group_members_new RENAME TO group_members;

PRAGMA foreign_keys=on;
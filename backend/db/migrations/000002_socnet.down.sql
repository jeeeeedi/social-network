-- 1. Drop the join table for post_private_viewers
DROP TABLE IF EXISTS post_private_viewers;

-- 2. Restore inviter_id to NOT NULL and add inviter_is_creator to group_members
PRAGMA foreign_keys=off;

CREATE TABLE group_members_old (
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

INSERT INTO group_members_old (
    membership_id, inviter_id, member_id, group_id, status, created_at, updated_at, updater_id
)
SELECT
    membership_id, COALESCE(inviter_id, 0), member_id, group_id, status, created_at, updated_at, updater_id
FROM group_members;

-- Set inviter_is_creator to 0 for all rows (cannot recover original values)
UPDATE group_members_old SET inviter_is_creator = 0;

DROP TABLE group_members;
ALTER TABLE group_members_old RENAME TO group_members;

PRAGMA foreign_keys=on;
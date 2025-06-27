PRAGMA foreign_keys=off;

-- Update "files" table to add filename_orig and filename_new
CREATE TABLE files_new (
    file_id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_uuid TEXT NOT NULL UNIQUE,
    uploader_id INTEGER NOT NULL,
    filename_orig TEXT NOT NULL,
    filename_new TEXT NOT NULL,
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
    file_id, file_uuid, uploader_id, filename_orig, filename_new, parent_type, parent_id, status, created_at, updated_at, updater_id
)
SELECT
    file_id, file_uuid, uploader_id, filename, filename, parent_type, parent_id, status, created_at, updated_at, updater_id
FROM files;

DROP TABLE files;
ALTER TABLE files_new RENAME TO files;

PRAGMA foreign_keys=on;
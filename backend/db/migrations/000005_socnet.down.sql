PRAGMA foreign_keys=off;

-- Delete sample data in reverse order of dependencies to avoid FK constraint violations

-- Delete notifications
DELETE FROM notifications WHERE notification_id IN (1, 2, 3, 4, 5);

-- Delete post categories
DELETE FROM post_categories WHERE category_id IN (1, 2, 3, 4, 5);

-- Delete chat messages
DELETE FROM chat_messages WHERE message_id IN (1, 2, 3, 4, 5);

-- Delete event RSVPs
DELETE FROM event_rsvp WHERE rsvp_id IN (1, 2, 3, 4, 5);

-- Delete events
DELETE FROM events WHERE event_id IN (1, 2, 3, 4, 5);

-- Delete follows
DELETE FROM follows WHERE follow_id IN (1, 2, 3, 4, 5);

-- Delete interactions
DELETE FROM interactions WHERE interaction_id IN (1, 2, 3, 4, 5);

-- Delete files
DELETE FROM files WHERE file_uuid IN ('file-uuid-001', 'file-uuid-002', 'file-uuid-003', 'file-uuid-004', 'file-uuid-005');

-- Delete comments
DELETE FROM comments WHERE comment_id IN (1, 2, 3, 4, 5);

-- Delete post private viewers
DELETE FROM post_private_viewers WHERE post_id IN (1, 2, 3, 4, 5);

-- Delete posts
DELETE FROM posts WHERE post_uuid IN ('post-uuid-001', 'post-uuid-002', 'post-uuid-003', 'post-uuid-004', 'post-uuid-005');

-- Delete group members
DELETE FROM group_members WHERE membership_id IN (1, 2, 3, 4, 5);

-- Delete groups
DELETE FROM groups WHERE group_id IN (1, 2, 3, 4, 5);

-- Delete sessions
DELETE FROM sessions WHERE session_uuid IN ('session-uuid-001', 'session-uuid-002', 'session-uuid-003', 'session-uuid-004', 'session-uuid-005');

-- Delete users (this will cascade delete related records due to FK constraints)
DELETE FROM users WHERE user_uuid IN ('user-uuid-001', 'user-uuid-002', 'user-uuid-003', 'user-uuid-004', 'user-uuid-005');

PRAGMA foreign_keys=on;
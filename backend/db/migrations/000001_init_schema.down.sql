/* 
drop tables in reverse order of dependencies to avoid violating FK constraints.
tables depending on others must be dropped after the dependent tables are removed.
For example, since comments references posts, posts must be dropped after comments.
*/

DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS chat_messages;
DROP TABLE IF EXISTS event_rsvp;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS group_members;
DROP TABLE IF EXISTS groups;
DROP TABLE IF EXISTS follows;
DROP TABLE IF EXISTS interactions;
DROP TABLE IF EXISTS post_categories;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS files;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;

PRAGMA foreign_keys=off;

-- Insert sample users
INSERT INTO users (user_uuid, email, password, first_name, last_name, date_of_birth, nickname, about_me, avatar, privacy, role, status, updated_at) VALUES
('6b833250-7540-4590-b723-ae5fc4a68db4','katya@katya.com','$2a$10$M6Sd1QbTqXYC228dhrnKUe5WZEyHRxuRTvtdhoKaTLXibVyrATza2','Katya','Abrakhova','2025-05-15','katya','Hi all, this is me, I am working and studying at Grit:lab.','/uploads/cf7915fe-fe46-4f8a-912d-5f838e7de805.jpg','public','user','active', CURRENT_TIMESTAMP),
('4742cd51-90e8-4727-b000-2863e5440755','test@test.com','$2a$10$btcKQb7IYAPnpxCi1hqInOt.U/X4EjcNKIl8tlJR5ptBal/kMTnbm','Test','Test','2025-06-01','test','This the the user for test purposes','/uploads/6bf79eab-6f45-4cce-806e-a3e9e615500f.gif','public','user','active', CURRENT_TIMESTAMP),
('user-uuid-003', 'jedi@jedi.com', '$2a$10$btcKQb7IYAPnpxCi1hqInOt.U/X4EjcNKIl8tlJR5ptBal/kMTnbm', 'Jedi', 'R', '2024-08-22', 'jedi', 'Book enthusiast', '/uploads/avatar_jedi.png', 'public', 'user', 'active', CURRENT_TIMESTAMP),
('user-uuid-004', 'johannes@johannes.com', '$2a$10$btcKQb7IYAPnpxCi1hqInOt.U/X4EjcNKIl8tlJR5ptBal/kMTnbm', 'Johannes', 'S', '2025-03-10', 'johannes', 'Artist and music lover', '/uploads/avatar_johannes.jpg', 'private', 'admin', 'active', CURRENT_TIMESTAMP),
('user-uuid-005', 'anass@anass.com', '$2a$10$btcKQb7IYAPnpxCi1hqInOt.U/X4EjcNKIl8tlJR5ptBal/kMTnbm', 'Anass', 'T', '2024-11-28', 'anass', 'Movie buff and critic', '/uploads/avatar_anass.png', 'public', 'user', 'active', CURRENT_TIMESTAMP),
('user-uuid-006', 'anastasia@anastasia.com', '$2a$10$btcKQb7IYAPnpxCi1hqInOt.U/X4EjcNKIl8tlJR5ptBal/kMTnbm', 'Anastasia', 'S', '2023-11-28', 'anastasia', 'Fitness enthusiast and gamer', '/uploads/avatar_anastasia.png', 'public', 'user', 'active', CURRENT_TIMESTAMP),
('user-uuid-007', 'sergei@sergei.com', '$2a$10$btcKQb7IYAPnpxCi1hqInOt.U/X4EjcNKIl8tlJR5ptBal/kMTnbm', 'Sergei', 'B', '2024-11-28', 'sergei', 'Travel blogger and foodie', '/uploads/avatar_sergei.jpg', 'public', 'user', 'active', CURRENT_TIMESTAMP);

-- Insert sample sessions
INSERT INTO sessions (session_uuid, user_id, status, expires_at, updated_at) VALUES
('session-uuid-001', 1, 'active', datetime('now', '+7 days'), CURRENT_TIMESTAMP),
('session-uuid-002', 2, 'active', datetime('now', '+7 days'), CURRENT_TIMESTAMP),
('session-uuid-003', 3, 'active', datetime('now', '+7 days'), CURRENT_TIMESTAMP),
('session-uuid-004', 4, 'inactive', datetime('now', '+7 days'), CURRENT_TIMESTAMP),
('session-uuid-005', 5, 'active', datetime('now', '+7 days'), CURRENT_TIMESTAMP);

-- Insert sample groups
INSERT INTO groups (title, description, creator_id, updated_at) VALUES
('Photography Club', 'A community for photography enthusiasts to share tips and showcase their work', 1, CURRENT_TIMESTAMP),
('Tech Developers', 'Discussion group for software developers and technology trends', 2, CURRENT_TIMESTAMP),
('Fitness Friends', 'Group for sharing workout routines and health tips', 3, CURRENT_TIMESTAMP),
('Art Appreciation', 'Community for artists and art lovers to connect and share', 4, CURRENT_TIMESTAMP),
('Travel Adventures', 'Share your travel experiences and get recommendations', 5, CURRENT_TIMESTAMP);

-- Insert sample group members
INSERT INTO group_members (inviter_id, member_id, group_id, status, created_at, updated_at) VALUES
(1, 1, 1, 'accepted', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(1, 2, 1, 'accepted', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 2, 2, 'accepted', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 3, 2, 'invited', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(3, 3, 3, 'accepted', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Insert sample posts
INSERT INTO posts (post_uuid, poster_id, group_id, content, privacy, updated_at) VALUES
('post-uuid-001', 1, 1, 'Just captured an amazing sunset at the beach! Check out this shot.', 'public', CURRENT_TIMESTAMP),
('post-uuid-002', 2, 2, 'Anyone working with React 18? Would love to discuss the new concurrent features.', 'semi-private', CURRENT_TIMESTAMP),
('post-uuid-003', 3, NULL, 'Finished my morning run - 5km in 25 minutes! Feeling great.', 'public', CURRENT_TIMESTAMP),
('post-uuid-004', 4, NULL, 'Working on a new painting series inspired by nature. Excited to share progress!', 'private', CURRENT_TIMESTAMP),
('post-uuid-005', 5, 5, 'Just got back from Tokyo! The food was incredible. AMA about Japan travel.', 'public', CURRENT_TIMESTAMP);

-- Insert sample post_private_viewers (for private posts)
INSERT INTO post_private_viewers (post_id, user_id) VALUES
(4, 1),
(4, 2),
(4, 3),
(4, 5),
(4, 4);

-- Insert sample comments
INSERT INTO comments (commenter_id, post_id, group_id, content, post_privacy, updated_at) VALUES
(2, 1, 1, 'Wow, that lighting is perfect! What camera settings did you use?', 'public', CURRENT_TIMESTAMP),
(3, 1, 1, 'Beautiful shot! The colors are amazing.', 'public', CURRENT_TIMESTAMP),
(1, 2, 2, 'I have been experimenting with Suspense. The performance improvements are noticeable!', 'semi-private', CURRENT_TIMESTAMP),
(4, 3, NULL, 'Great pace! Keep up the good work.', 'public', CURRENT_TIMESTAMP),
(1, 5, 5, 'Would love to hear about the best ramen spots you found!', 'public', CURRENT_TIMESTAMP);

-- Insert sample files
INSERT INTO files (file_uuid, uploader_id, filename_orig, filename_new, parent_type, parent_id, updated_at) VALUES
('file-uuid-001', 1, 'sunset_beach.jpg', 'f1_sunset_beach_20250626.jpg', 'post', 1, CURRENT_TIMESTAMP),
('file-uuid-002', 1, 'profile_pic.png', '56acdb2f-758e-4e7f-88a2-53f58c563f76.png', 'profile', 1, CURRENT_TIMESTAMP),
('file-uuid-003', 3, 'cat.jpg', '4f4ccd21-cb51-49fc-8f25-8a4b50a2a07d.jpg', 'post', 3, CURRENT_TIMESTAMP),
('file-uuid-004', 4, 'painting_wip.png', '7702ed02-0647-4c6a-b670-3917aaa0bf45.png', 'post', 4, CURRENT_TIMESTAMP),
('file-uuid-005', 5, 'tokyo_food.jpg', 'f5_tokyo_food_20250626.jpg', 'post', 5, CURRENT_TIMESTAMP);

-- Insert sample interactions
INSERT INTO interactions (user_id, interaction_type, parent_type, parent_id, updated_at) VALUES
(2, 'like', 'post', 1, CURRENT_TIMESTAMP),
(3, 'like', 'post', 1, CURRENT_TIMESTAMP),
(4, 'like', 'post', 3, CURRENT_TIMESTAMP),
(1, 'like', 'comment', 1, CURRENT_TIMESTAMP),
(5, 'dislike', 'comment', 2, CURRENT_TIMESTAMP);

-- Insert sample follows
INSERT INTO follows (followed_user_id, follower_user_id, status, updated_at) VALUES
(1, 2, 'accepted', CURRENT_TIMESTAMP),
(1, 3, 'accepted', CURRENT_TIMESTAMP),
(2, 4, 'pending', CURRENT_TIMESTAMP),
(3, 5, 'accepted', CURRENT_TIMESTAMP),
(4, 1, 'accepted', CURRENT_TIMESTAMP);

-- Insert sample events
INSERT INTO events (creator_id, group_id, title, description, event_date_time, updated_at) VALUES
(1, 1, 'Photography Walk Downtown', 'Join us for a group photography session in the downtown area', datetime('now', '+14 days'), CURRENT_TIMESTAMP),
(2, 2, 'React Workshop', 'Hands-on workshop covering React 18 features and best practices', datetime('now', '+21 days'), CURRENT_TIMESTAMP),
(3, 3, 'Morning Yoga Session', 'Relaxing yoga session in the park, suitable for all levels', datetime('now', '+7 days'), CURRENT_TIMESTAMP),
(4, 4, 'Art Gallery Visit', 'Group visit to the new contemporary art exhibition', datetime('now', '+10 days'), CURRENT_TIMESTAMP),
(5, 5, 'Travel Planning Meetup', 'Plan your next adventure with fellow travelers', datetime('now', '+28 days'), CURRENT_TIMESTAMP);

-- Insert sample event RSVPs
INSERT INTO event_rsvp (event_id, responder_id, response, updated_at) VALUES
(1, 2, 'going', CURRENT_TIMESTAMP),
(1, 3, 'going', CURRENT_TIMESTAMP),
(2, 1, 'going', CURRENT_TIMESTAMP),
(3, 4, 'not_going', CURRENT_TIMESTAMP),
(4, 5, 'going', CURRENT_TIMESTAMP);

-- Insert sample chat messages
INSERT INTO chat_messages (sender_id, receiver_id, group_id, content, updated_at) VALUES
(1, 2, NULL, 'Nice shot! Camera settings? 📸', CURRENT_TIMESTAMP),
(2, 1, NULL, 'Magic and expensive lens 😎💰', CURRENT_TIMESTAMP),
(3, NULL, 3, 'Who wants to suffer? 🏃‍♂️😤', CURRENT_TIMESTAMP),
(4, 5, NULL, 'Tokyo ramen = life goals 🍜❤️', CURRENT_TIMESTAMP),
(5, 4, NULL, 'Sending you secret spots! 🤫📍', CURRENT_TIMESTAMP),
(1, 3, NULL, 'Teach me your speed! ⚡🏃', CURRENT_TIMESTAMP),
(3, 1, NULL, 'Coffee. Lots of coffee. ☕☕☕', CURRENT_TIMESTAMP),
(2, NULL, 2, 'Next.js 14 anyone? 🚀💻', CURRENT_TIMESTAMP),
(4, NULL, 2, 'It broke my brain! 🤯💥', CURRENT_TIMESTAMP),
(5, NULL, 5, 'Vietnam recommendations please! 🇻🇳✈️', CURRENT_TIMESTAMP),
(1, NULL, 5, 'Street food = happiness 🥟😋', CURRENT_TIMESTAMP),
(2, 4, NULL, 'Your painting rocks! 🎨🔥', CURRENT_TIMESTAMP),
(4, 2, NULL, 'Thanks! Paint everywhere though. 🖌️🤷', CURRENT_TIMESTAMP),
(3, NULL, 3, 'Yoga = pretzel practice 🥨🧘‍♀️', CURRENT_TIMESTAMP),
(4, NULL, 3, 'Same time tomorrow? ⏰🙏', CURRENT_TIMESTAMP),
(5, 1, NULL, 'Photography tips please! 📷🙏', CURRENT_TIMESTAMP),
(1, 5, NULL, 'Point camera. Press button. 📸😂', CURRENT_TIMESTAMP),
(2, 3, NULL, 'Your cat owns you 🐱👑', CURRENT_TIMESTAMP),
(3, 2, NULL, 'She definitely does! 😹💯', CURRENT_TIMESTAMP),
(4, NULL, 4, 'Art gallery this weekend? 🖼️🎭', CURRENT_TIMESTAMP),
(1, NULL, 4, 'Culture me up! 🎨📚', CURRENT_TIMESTAMP),
(5, NULL, 2, 'React image gallery help? 🖼️⚛️', CURRENT_TIMESTAMP),
(2, NULL, 2, 'Framer-motion is life! 🎬✨', CURRENT_TIMESTAMP),
(3, 5, NULL, 'Tokyo photos = jealousy 📸😭', CURRENT_TIMESTAMP),
(5, 3, NULL, 'Convenience stores are gold! 🏪💎', CURRENT_TIMESTAMP);

-- Insert sample post categories
INSERT INTO post_categories (creator_id, post_id, category_name, updated_at) VALUES
(1, 1, 'Photography', CURRENT_TIMESTAMP),
(1, 1, 'Nature', CURRENT_TIMESTAMP),
(2, 2, 'Technology', CURRENT_TIMESTAMP),
(3, 3, 'Fitness', CURRENT_TIMESTAMP),
(5, 5, 'Travel', CURRENT_TIMESTAMP);

-- Insert sample notifications
INSERT INTO notifications (receiver_id, actor_id, action_type, parent_type, parent_id, content, updated_at) VALUES
(1, 2, 'like', 'post', 1, 'Jane Smith liked your post', CURRENT_TIMESTAMP),
(1, 3, 'comment', 'post', 1, 'Bob Wilson commented on your post', CURRENT_TIMESTAMP),
(2, 4, 'follow_request', 'follow', 3, 'Alice Brown wants to follow you', CURRENT_TIMESTAMP),
(3, 5, 'group_invitation', 'group', 3, 'Charlie Davis invited you to join Fitness Friends', CURRENT_TIMESTAMP),
(4, 1, 'group_event', 'event', 4, 'John Doe created a new event in Art Appreciation', CURRENT_TIMESTAMP);

PRAGMA foreign_keys=on;
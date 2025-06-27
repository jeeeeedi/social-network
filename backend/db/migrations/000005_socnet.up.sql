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
(2, 3, 2, 'accepted', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(3, 3, 3, 'accepted', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(4, 4, 4, 'accepted', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(5, 5, 5, 'accepted', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);;

-- Insert sample posts
INSERT INTO posts (post_uuid, poster_id, group_id, content, privacy, updated_at) VALUES
('post-uuid-001', 1, NULL, 'Just captured an amazing sunset at the beach! Check out this shot.', 'public', CURRENT_TIMESTAMP),
('post-uuid-002', 2, NULL, 'Anyone working with React 18? Would love to discuss the new concurrent features.', 'semi-private', CURRENT_TIMESTAMP),
('post-uuid-003', 3, NULL, 'Finished my morning walk! Feeling great.', 'public', CURRENT_TIMESTAMP),
('post-uuid-004', 4, NULL, 'Working on a new painting series inspired by nature. Excited to share progress!', 'private', CURRENT_TIMESTAMP),
('post-uuid-005', 5, NULL, 'Just got back from Tokyo! The food was incredible. AMA about Japan travel.', 'public', CURRENT_TIMESTAMP),
('post-uuid-006', 1, 1, 'Did you see my public post?', 'semi-private', CURRENT_TIMESTAMP);

-- Insert sample post_private_viewers (for private posts)
INSERT INTO post_private_viewers (post_id, user_id) VALUES
(4, 1);

-- Insert sample comments
INSERT INTO comments (commenter_id, post_id, group_id, content, post_privacy, updated_at) VALUES
(2, 1, NULL, 'Wow, that lighting is perfect! What camera settings did you use?', 'public', CURRENT_TIMESTAMP),
(3, 1, NULL, 'Beautiful shot! The colors are amazing.', 'public', CURRENT_TIMESTAMP),
(1, 2, NULL, 'I have been experimenting with Suspense. The performance improvements are noticeable!', 'semi-private', CURRENT_TIMESTAMP),
(4, 3, NULL, 'Great job! Keep up the good work.', 'public', CURRENT_TIMESTAMP),
(1, 5, NULL, 'Would love to hear about the best ramen spots you found!', 'public', CURRENT_TIMESTAMP),
(2, 6, 1, 'I did!', 'semi-private', CURRENT_TIMESTAMP);

-- Insert sample files
INSERT INTO files (file_uuid, uploader_id, filename_orig, filename_new, parent_type, parent_id, updated_at) VALUES
('file-uuid-001', 1, 'sunset_beach.jpg', 'f1_sunset_beach_20250626.jpg', 'post', 1, CURRENT_TIMESTAMP),
('file-uuid-002', 1, 'profile_pic.png', '56acdb2f-758e-4e7f-88a2-53f58c563f76.png', 'profile', 1, CURRENT_TIMESTAMP),
('file-uuid-003', 3, 'cat.jpg', '4f4ccd21-cb51-49fc-8f25-8a4b50a2a07d.jpg', 'post', 3, CURRENT_TIMESTAMP),
('file-uuid-004', 4, 'painting_wip.png', '7702ed02-0647-4c6a-b670-3917aaa0bf45.png', 'post', 4, CURRENT_TIMESTAMP),
('file-uuid-005', 5, 'tokyo_food.jpg', 'f5_tokyo_food_20250626.jpg', 'post', 5, CURRENT_TIMESTAMP);

-- Insert sample follows
INSERT INTO follows (followed_user_id, follower_user_id, status, updated_at) VALUES
(1, 2, 'accepted', CURRENT_TIMESTAMP),
(2, 1, 'accepted', CURRENT_TIMESTAMP),
(1, 3, 'accepted', CURRENT_TIMESTAMP),
(2, 4, 'accepted', CURRENT_TIMESTAMP),
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
(2, 2, 'going', CURRENT_TIMESTAMP),
(2, 3, 'not_going', CURRENT_TIMESTAMP),
(4, 4, 'going', CURRENT_TIMESTAMP);

-- Insert sample chat messages
INSERT INTO chat_messages (sender_id, receiver_id, group_id, content, updated_at) VALUES
-- Private chat between users 1 and 2
(1, 2, NULL, 'Nice shot! Camera settings? 📸', CURRENT_TIMESTAMP),
(2, 1, NULL, 'Magic and expensive lens 😎💰', CURRENT_TIMESTAMP),
(1, 2, NULL, 'Which lens exactly? 🤔', CURRENT_TIMESTAMP),
(2, 1, NULL, 'Canon 24-70mm f/2.8 📷✨', CURRENT_TIMESTAMP),
(1, 2, NULL, 'That is pricey! 💸😅', CURRENT_TIMESTAMP),
(2, 1, NULL, 'Worth every penny though! 💯', CURRENT_TIMESTAMP),
(1, 2, NULL, 'Your photos prove it! 🔥', CURRENT_TIMESTAMP),
(2, 1, NULL, 'Thanks! Practice makes perfect 📸', CURRENT_TIMESTAMP),
(1, 2, NULL, 'Any beginner tips? 🙏', CURRENT_TIMESTAMP),
(2, 1, NULL, 'Start with natural light ☀️', CURRENT_TIMESTAMP),
(1, 2, NULL, 'Golden hour is best? 🌅', CURRENT_TIMESTAMP),
(2, 1, NULL, 'Absolutely! Magic happens then ✨', CURRENT_TIMESTAMP),
(1, 2, NULL, 'Weekend photo walk? 🚶‍♂️📷', CURRENT_TIMESTAMP),
(2, 1, NULL, 'Count me in! 🙋‍♀️', CURRENT_TIMESTAMP),
(1, 2, NULL, 'Downtown or beach? 🏖️🏙️', CURRENT_TIMESTAMP),
(2, 1, NULL, 'Beach for sunset! 🌊', CURRENT_TIMESTAMP),
(1, 2, NULL, 'Perfect! Saturday 6pm? ⏰', CURRENT_TIMESTAMP),
(2, 1, NULL, 'See you there! 👋', CURRENT_TIMESTAMP),
(1, 2, NULL, 'Bring extra battery! 🔋', CURRENT_TIMESTAMP),
(2, 1, NULL, 'Always do! Learned hard way 😂', CURRENT_TIMESTAMP),
(1, 2, NULL, 'Story time? 📖', CURRENT_TIMESTAMP),
(2, 1, NULL, 'Battery died during eclipse! 🌘💀', CURRENT_TIMESTAMP),
(1, 2, NULL, 'Photographer nightmare! 😱', CURRENT_TIMESTAMP),
(2, 1, NULL, 'Now I carry three! ⚡⚡⚡', CURRENT_TIMESTAMP),
(1, 2, NULL, 'Smart move! 🧠💡', CURRENT_TIMESTAMP),
(2, 1, NULL, 'Coffee before photo walk? ☕', CURRENT_TIMESTAMP),
-- Group chat for Photography Club (group_id 1)
(1, NULL, 1, 'Morning golden hour hunt! 🌅📸', CURRENT_TIMESTAMP),
(2, NULL, 1, 'Epic sunrise colors today! 🔥☀️', CURRENT_TIMESTAMP),
(1, NULL, 1, 'Share your best shots! 📷✨', CURRENT_TIMESTAMP),
(2, NULL, 1, 'Posted mine in gallery! 🖼️👀', CURRENT_TIMESTAMP),
(1, NULL, 1, 'Weekend workshop ideas? 🤔💡', CURRENT_TIMESTAMP),
(2, NULL, 1, 'Portrait lighting techniques? 💡👥', CURRENT_TIMESTAMP),
(1, NULL, 1, 'Great idea! Count me! 🙋‍♂️✨', CURRENT_TIMESTAMP),
(2, NULL, 1, 'Bringing all my gear! 📸⚡', CURRENT_TIMESTAMP),
(1, NULL, 1, 'Street photography tomorrow? 🏙️📷', CURRENT_TIMESTAMP),
(2, NULL, 1, 'Yes! Downtown at noon? 🕛🚶‍♀️', CURRENT_TIMESTAMP),
(1, NULL, 1, 'Perfect timing for shadows! 🌞🏢', CURRENT_TIMESTAMP),
(2, NULL, 1, 'Bringing wide angle lens! 📷🌍', CURRENT_TIMESTAMP),
(1, NULL, 1, 'New camera recommendation anyone? 🤷‍♂️📸', CURRENT_TIMESTAMP),
(2, NULL, 1, 'Canon R5 is amazing! 🔥💯', CURRENT_TIMESTAMP),
(1, NULL, 1, 'Thanks! Adding to wishlist! 📝💰', CURRENT_TIMESTAMP),
(2, NULL, 1, 'Worth every penny invested! 💎✨', CURRENT_TIMESTAMP);

PRAGMA foreign_keys=on;
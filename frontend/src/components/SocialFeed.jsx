import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Box, 
  Paper, 
  TextField, 
  Button, 
  Avatar, 
  Typography, 
  Divider, 
  IconButton, 
  Card, 
  CardContent, 
  CardHeader
} from '@mui/material';
import { Send, Favorite, Comment, Share } from '@mui/icons-material';

const SocialFeed = () => {
  const [newPost, setNewPost] = useState('');
  const [posts, setPosts] = useState([]);
  const { currentUser } = useAuth();

  useEffect(() => {
    // Mock data for posts - replace with actual API call to fetch posts
    const mockPosts = [
      {
        id: 1,
        user: { name: 'John Doe', username: 'johndoe', avatar: '' },
        content: 'Enjoying a sunny day at the park!',
        timestamp: '2 hours ago',
        likes: 15,
        comments: 3,
        shares: 2,
        liked: false,
        image: ''
      },
      {
        id: 2,
        user: { name: 'Jane Smith', username: 'janesmith', avatar: '' },
        content: 'Just finished a great book. Highly recommend!',
        timestamp: '5 hours ago',
        likes: 8,
        comments: 1,
        shares: 0,
        liked: false,
        image: ''
      }
    ];
    setPosts(mockPosts);
    // TODO: Fetch posts from backend API
  }, []);

  const handlePost = () => {
    if (!newPost.trim()) return;
    const post = {
      id: posts.length + 1,
      user: {
        name: currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : 'Current User',
        username: currentUser ? currentUser.nickname || 'user' : 'user',
        avatar: currentUser ? currentUser.avatar || '' : ''
      },
      content: newPost,
      timestamp: 'Just now',
      likes: 0,
      comments: 0,
      shares: 0,
      liked: false,
      image: ''
    };
    setPosts([post, ...posts]);
    setNewPost('');
    // TODO: Send post to backend API
  };

  const handleLike = (postId) => {
    setPosts(posts.map(post => 
      post.id === postId ? { ...post, liked: !post.liked, likes: post.liked ? post.likes - 1 : post.likes + 1 } : post
    ));
    // TODO: Send like status to backend API
  };

  return (
    <Box sx={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      {/* Create Post Section */}
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Avatar 
            src={currentUser ? currentUser.avatar || '' : ''} 
            alt={currentUser ? currentUser.first_name || 'User' : 'User'} 
            sx={{ width: 40, height: 40 }}
          />
          <TextField
            placeholder="What's on your mind?"
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            multiline
            rows={3}
            variant="outlined"
            fullWidth
            sx={{ border: 'none' }}
          />
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            {/* Placeholder for additional options like adding photos */}
            <Button variant="text" size="small">Add Photo</Button>
          </Box>
          <Button
            variant="contained"
            onClick={handlePost}
            disabled={!newPost.trim()}
            endIcon={<Send />}
          >
            Post
          </Button>
        </Box>
      </Paper>

      {/* Posts Feed */}
      <Box sx={{ spaceY: 3 }}>
        {posts.map((post) => (
          <Card key={post.id} sx={{ mb: 3 }}>
            <CardHeader
              avatar={
                <Avatar 
                  src={post.user.avatar || ''} 
                  alt={post.user.name} 
                  sx={{ width: 40, height: 40 }}
                />
              }
              title={<Typography variant="h6">{post.user.name}</Typography>}
              subheader={<Typography variant="caption">@{post.user.username} · {post.timestamp}</Typography>}
            />
            <CardContent>
              <Typography variant="body1" sx={{ mb: 2 }}>{post.content}</Typography>
              {post.image && (
                <Box sx={{ mb: 2, borderRadius: 1, overflow: 'hidden' }}>
                  <img src={post.image} alt="Post image" style={{ width: '100%', height: 'auto' }} />
                </Box>
              )}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 2 }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <IconButton
                    onClick={() => handleLike(post.id)}
                    color={post.liked ? 'error' : 'default'}
                    size="small"
                  >
                    <Favorite fontSize="small" />
                    <Typography variant="caption" sx={{ ml: 0.5 }}>{post.likes}</Typography>
                  </IconButton>
                  <IconButton size="small">
                    <Comment fontSize="small" />
                    <Typography variant="caption" sx={{ ml: 0.5 }}>{post.comments}</Typography>
                  </IconButton>
                  <IconButton size="small">
                    <Share fontSize="small" />
                    <Typography variant="caption" sx={{ ml: 0.5 }}>{post.shares}</Typography>
                  </IconButton>
                </Box>
              </Box>
            </CardContent>
            <Divider />
          </Card>
        ))}
      </Box>
    </Box>
  );
};

export default SocialFeed; 
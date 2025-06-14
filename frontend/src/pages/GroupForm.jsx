import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, TextField, Button, Typography, Container, Paper, CircularProgress } from '@mui/material';
import { PhotoCamera } from '@mui/icons-material';
import { uploadImage } from '../utils/upload';
import Image from 'next/image';

const GroupForm = () => {
  const [title, setTitle] = useState('');
  const [image, setImage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch user ID from session
    const fetchUserId = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include'
        });
        if (!response.ok) {
          throw new Error('Not authenticated');
        }
        const data = await response.json();
        setUserId(data.id);
      } catch (err) {
        setError('Please log in to create a group');
        navigate('/login');
      }
    };

    fetchUserId();
  }, [navigate]);

  const handleImageChange = (event) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setError('Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.');
        return;
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        setError('File size too large. Maximum size is 5MB.');
        return;
      }

      setImage(file);
      setError(null); // Clear any previous errors
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!title) {
      setError('Group name is required');
      return;
    }

    setLoading(true);
    setError(null);

    let imageUrl = '';
    if (image) {
      try {
        imageUrl = await uploadImage(image, userId);
      } catch (uploadErr) {
        setError('Image upload failed');
        setLoading(false);
        return;
      }
    }

    const groupData = { 
      title,
      image: imageUrl,
      is_public: true // Default to public group
    };

    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(groupData),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to create group: Status ${response.status}`);
      }

      const newGroup = await response.json();
      console.log('Group created:', newGroup);
      navigate('/groups');
    } catch (err) {
      setError(err.message);
      console.error('Error creating group:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!userId) {
    return (
      <Container component="main" maxWidth="sm" sx={{ mt: 5 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography>Loading...</Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container component="main" maxWidth="sm" sx={{ mt: 5 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom>
          Create a New Group
        </Typography>
        {error && (
          <Typography variant="body2" color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}
        <form onSubmit={handleSubmit}>
          <TextField
            margin="normal"
            required
            fullWidth
            label="Group Name"
            name="title"
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={loading}
          />
          <Box sx={{ mt: 2, mb: 2 }}>
            <Button
              variant="contained"
              component="label"
              startIcon={<PhotoCamera />}
              disabled={loading}
            >
              Add Image (Optional)
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                hidden
                onChange={handleImageChange}
                disabled={loading}
              />
            </Button>
            {image && (
              <Box sx={{ mt: 2, mb: 2, position: 'relative', width: 200, height: 140 }}>
                <Image
                  src={URL.createObjectURL(image)}
                  alt="Preview"
                  fill
                  style={{ objectFit: 'cover', borderRadius: 8 }}
                />
              </Box>
            )}
            {image && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Selected: {image.name}
              </Typography>
            )}
          </Box>
          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Create Group'}
          </Button>
        </form>
      </Paper>
    </Container>
  );
};

export default GroupForm; 
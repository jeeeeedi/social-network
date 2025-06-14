import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { Box, TextField, Button, Typography, Container, Paper } from '@mui/material';
import { PhotoCamera } from '@mui/icons-material';
import { uploadImage } from '../utils/upload';
import Image from 'next/image';

const GroupForm = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [error, setError] = useState(null);
  const router = useRouter();
  // TODO: Replace with actual user ID from context/session
  const userId = 1;

  const handleImageChange = (event) => {
    if (event.target.files && event.target.files[0]) {
      setImage(event.target.files[0]);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!title || !description) {
      setError('Title and Description are required');
      return;
    }

    let imageUrl = '';
    if (image) {
      try {
        imageUrl = await uploadImage(image, userId);
      } catch (uploadErr) {
        setError('Image upload failed');
        return;
      }
    }

    const groupData = { title, description, image: imageUrl };
    try {
      const response = await fetch('/api/groups/', {
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
      router.push('/Groups');
    } catch (err) {
      setError(err.message);
      console.error('Error creating group:', err);
    }
  };

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
            label="Group Title"
            name="title"
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            label="Group Description"
            name="description"
            multiline
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Box sx={{ mt: 2, mb: 2 }}>
            <Button
              variant="contained"
              component="label"
              startIcon={<PhotoCamera />}
            >
              Add Image (Optional)
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={handleImageChange}
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
          >
            Create Group
          </Button>
          <Button
            fullWidth
            variant="outlined"
            onClick={() => router.push('/Groups')}
          >
            Cancel
          </Button>
        </form>
      </Paper>
    </Container>
  );
};

export default GroupForm; 
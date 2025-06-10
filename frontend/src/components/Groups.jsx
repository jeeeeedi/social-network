import React from 'react';
import { mockGroups } from '../utils/mockData';
import { Box, Card, CardContent, CardMedia, Typography, Button, Grid, Chip } from '@mui/material';
import { People, Lock } from '@mui/icons-material';

// Groups component to display a list of groups using MUI
const Groups = () => {
  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h4" gutterBottom>
        Browse Groups
      </Typography>
      <Grid container spacing={3}>
        {mockGroups.map((group) => (
          <Grid item xs={12} sm={6} md={4} key={group.id}>
            <Card sx={{ maxWidth: 345, margin: 'auto' }}>
              <CardMedia
                component="img"
                height="140"
                image={group.image}
                alt={`${group.title} cover`}
              />
              <CardContent>
                <Typography gutterBottom variant="h5" component="div">
                  {group.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {group.description}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <People sx={{ mr: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    {group.members} members
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Chip 
                    label={group.isPublic ? 'Public' : 'Private'} 
                    color={group.isPublic ? 'primary' : 'default'} 
                    size="small"
                    icon={group.isPublic ? null : <Lock fontSize="small" />}
                  />
                  <Button variant="contained" size="small">
                    {group.isPublic ? 'Join' : 'Request'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default Groups; 
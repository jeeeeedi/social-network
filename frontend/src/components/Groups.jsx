import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, CardMedia, Typography, Button, Grid, Chip, Paper } from '@mui/material';
import { People, Lock, Add } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

// Groups component to display a list of groups using MUI
const Groups = () => {
  const [myGroups, setMyGroups] = useState([]);
  const [subscribedGroups, setSubscribedGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        // Fetch groups created by the user
        const myGroupsResponse = await fetch('http://localhost:8080/api/groups/my-groups', {
          credentials: 'include'
        });
        if (!myGroupsResponse.ok) {
          throw new Error('Failed to fetch my groups');
        }
        const myGroupsData = await myGroupsResponse.json();
        setMyGroups(myGroupsData);

        // Fetch groups the user is subscribed to
        const subscribedResponse = await fetch('http://localhost:8080/api/groups/my-groups', {
          credentials: 'include'
        });
        if (!subscribedResponse.ok) {
          throw new Error('Failed to fetch subscribed groups');
        }
        const subscribedData = await subscribedResponse.json();
        setSubscribedGroups(subscribedData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, []);

  const handleCreateGroup = () => {
    navigate('/groups/create');
  };

  if (loading) {
    return (
      <Box sx={{ maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Typography>Loading groups...</Typography>
        </Paper>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Typography color="error">Error: {error}</Typography>
        </Paper>
      </Box>
    );
  }

  const GroupGrid = ({ groups, title }) => (
    <Paper elevation={3} sx={{ p: 3, mb: 3, width: '100%' }}>
      <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
        {title}
      </Typography>
      {groups.length === 0 ? (
        <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 2 }}>
          No groups to display
        </Typography>
      ) : (
        <Grid container spacing={3}>
          {groups.map((group) => (
            <Grid item xs={12} sm={6} md={4} key={group.group_id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardMedia
                  component="img"
                  height="140"
                  image={group.image || '/default-group.jpg'}
                  alt={`${group.title} cover`}
                />
                <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  <Typography gutterBottom variant="h6" component="div">
                    {group.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flexGrow: 1 }}>
                    {group.description}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <People sx={{ mr: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      {group.member_count || 0} members
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Chip 
                      label={group.is_public ? 'Public' : 'Private'} 
                      color={group.is_public ? 'primary' : 'default'} 
                      size="small"
                      icon={group.is_public ? null : <Lock fontSize="small" />}
                    />
                    <Button 
                      variant="contained" 
                      size="small"
                      onClick={() => navigate(`/groups/${group.group_id}`)}
                    >
                      View
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Paper>
  );

  return (
    <Box sx={{ maxWidth: "600px", margin: "0 auto", padding: "20px", width: '100%' }}>
      <Paper elevation={3} sx={{ p: 3, mb: 3, width: '100%' }}>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleCreateGroup}
          sx={{ 
            minWidth: '200px',
            justifyContent: 'flex-start'
          }}
        >
          Create Group
        </Button>
      </Paper>

      <GroupGrid
        groups={myGroups}
        title="My Groups"
      />

      <GroupGrid
        groups={subscribedGroups}
        title="Subscribed Groups"
      />
    </Box>
  );
};

export default Groups; 
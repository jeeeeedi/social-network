import React from 'react';
import { mockNotifications } from '../utils/mockData';
import { Box, List, ListItem, ListItemText, ListItemAvatar, ListItemSecondaryAction, Avatar, Typography, Button, Divider, Chip } from '@mui/material';
import { PersonAdd, GroupAdd, Event } from '@mui/icons-material';

// Notifications component to display a list of notifications using MUI
const Notifications = () => {
  // Function to get the appropriate icon based on notification type
  const getIcon = (type) => {
    switch (type) {
      case 'friend_request':
        return <PersonAdd />;
      case 'group_invite':
        return <GroupAdd />;
      case 'event':
        return <Event />;
      default:
        return null;
    }
  };

  // Function to get the status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'accepted':
        return 'success';
      case 'declined':
        return 'error';
      case 'new':
        return 'info';
      default:
        return 'default';
    }
  };

  // Function to format timestamp
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <Box sx={{ padding: 3, maxWidth: 600, margin: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Notifications
      </Typography>
      <List>
        {mockNotifications.map((notification, index) => (
          <React.Fragment key={notification.id}>
            <ListItem alignItems="flex-start">
              <ListItemAvatar>
                <Avatar alt={notification.sender} src={notification.avatar} sx={{ bgcolor: 'primary.main' }}>
                  {getIcon(notification.type)}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={notification.message}
                secondary={formatTimestamp(notification.timestamp)}
              />
              <ListItemSecondaryAction>
                <Chip
                  label={notification.status.charAt(0).toUpperCase() + notification.status.slice(1)}
                  color={getStatusColor(notification.status)}
                  size="small"
                />
                {notification.status === 'pending' && (
                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    <Button variant="contained" size="small" color="success">
                      Accept
                    </Button>
                    <Button variant="outlined" size="small" color="error">
                      Decline
                    </Button>
                  </Box>
                )}
              </ListItemSecondaryAction>
            </ListItem>
            {index < mockNotifications.length - 1 && <Divider variant="inset" component="li" />}
          </React.Fragment>
        ))}
      </List>
    </Box>
  );
};

export default Notifications; 
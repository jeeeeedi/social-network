import React, { useState, useEffect } from 'react';
import { Box, List, ListItem, ListItemText, ListItemAvatar, ListItemSecondaryAction, Avatar, Typography, Button, Divider, Chip } from '@mui/material';
import { PersonAdd, GroupAdd, Event } from '@mui/icons-material';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState(null);

  const fetchNotifications = async () => {
    try {
      console.log('Fetching notifications from http://localhost:8080/api/notifications/');
      const response = await fetch('http://localhost:8080/api/notifications/', {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('Notifications response:', data);
      if (data.success) {
        setNotifications(data.notifications || []);
        console.log('Set notifications state:', data.notifications || []);
      } else {
        setError(data.message || 'Invalid API response');
        console.log('API error:', data.message);
      }
    } catch (err) {
      setError('Failed to fetch notifications: ' + err.message);
      console.error('Fetch error:', err);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      console.log(`Marking notification ${notificationId} as read`);
      const response = await fetch(`http://localhost:8080/api/notifications/${notificationId}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      if (data.success) {
        setNotifications(notifications.map(n =>
          n.id === notificationId ? { ...n, status: 'read' } : n
        ));
        console.log(`Notification ${notificationId} marked as read`);
      } else {
        setError(data.message || 'Failed to mark notification as read');
      }
    } catch (err) {
      setError('Failed to mark notification as read');
      console.error('Mark error:', err);
    }
  };

  const clearReadNotifications = async () => {
    try {
      console.log('Clearing read notifications');
      const response = await fetch('http://localhost:8080/api/notifications/', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      if (data.success) {
        setNotifications(notifications.filter(n => n.status !== 'read'));
        console.log('Cleared read notifications');
      } else {
        setError(data.message || 'Failed to clear notifications');
      }
    } catch (err) {
      setError('Failed to clear notifications');
      console.error('Clear error:', err);
    }
  };

  const handleFollowAction = async (notification, action) => {
    try {
      console.log(`Handling follow action: ${action} for notification ${notification.id}`);
      const response = await fetch('http://localhost:8080/api/follows', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ follow_id: notification.parent_id, action })
      });
      const data = await response.json();
      console.log(`Follow action response:`, data);
      if (data.success) {
        // Update local state immediately
        setNotifications(notifications.map(n =>
          n.id === notification.id ? { ...n, status: action === 'accept' ? 'accepted' : 'declined' } : n
        ));
        // Mark as read
        await markAsRead(notification.id);
        // Refresh notifications
        await fetchNotifications();
        console.log(`Follow action ${action} succeeded`);
      } else {
        setError(data.message || 'Failed to process follow action');
      }
    } catch (err) {
      setError(`Failed to ${action} request`);
      console.error(`${action} error:`, err);
    }
  };

  const handleAccept = (notification) => handleFollowAction(notification, 'accept');
  const handleDecline = (notification) => handleFollowAction(notification, 'decline');

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    console.log('Notifications state updated:', notifications);
  }, [notifications]);

  const getIcon = (type) => {
    switch (type) {
      case 'friend_request': return <PersonAdd />;
      case 'follow': return <PersonAdd />;
      case 'group_invite': return <GroupAdd />;
      case 'event': return <Event />;
      default: return null;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'new': return 'info';
      case 'accepted': return 'success';
      case 'declined': return 'error';
      case 'read': return 'default';
      default: return 'default';
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <Box sx={{ padding: 3, maxWidth: 600, margin: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Notifications
      </Typography>
      {error && (
        <Typography color="error" gutterBottom>
          {error}
        </Typography>
      )}
      <Button
        variant="contained"
        color="secondary"
        onClick={clearReadNotifications}
        sx={{ mb: 2 }}
        disabled={notifications.every(n => n.status !== 'read')}
      >
        Clear Read Notifications
      </Button>
      <List>
        {notifications.length === 0 && (
          <ListItem>
            <ListItemText primary="No notifications" />
          </ListItem>
        )}
        {notifications.map((notification, index) => (
          <React.Fragment key={notification.id}>
            <ListItem
              alignItems="flex-start"
              onClick={() => notification.status === 'new' && markAsRead(notification.id)}
              sx={{ opacity: notification.status !== 'new' ? 0.6 : 1 }}
            >
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
                {notification.status === 'new' && notification.type === 'friend_request' && (
                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    <Button
                      variant="contained"
                      size="small"
                      color="success"
                      onClick={(e) => { e.stopPropagation(); handleAccept(notification); }}
                    >
                      Accept
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      color="error"
                      onClick={(e) => { e.stopPropagation(); handleDecline(notification); }}
                    >
                      Decline
                    </Button>
                  </Box>
                )}
              </ListItemSecondaryAction>
            </ListItem>
            {index < notifications.length - 1 && <Divider variant="inset" component="li" />}
          </React.Fragment>
        ))}
      </List>
    </Box>
  );
};

export default Notifications;
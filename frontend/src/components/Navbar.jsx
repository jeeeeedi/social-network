// filepath: /Users/sergei.budaev/Desktop/social-network/frontend/src/components/Navbar.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  IconButton, 
  Avatar,
  Box
} from '@mui/material';
import { Home, Group, Notifications, Person, ExitToApp } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  const handleHome = () => navigate('/');
  const handleGroup = () => navigate('/groups');
  const handleNotifications = () => navigate('/notifications');
  const handleProfile = () => navigate('/profile/me');
  
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Social Network
        </Typography>
        
        {currentUser ? (
          <>
            <IconButton color="inherit" onClick={handleHome}>
              <Home />
            </IconButton>
            <IconButton color="inherit" onClick={handleGroup}>
              <Group />
            </IconButton>
            <IconButton color="inherit" onClick={handleNotifications}>
              <Notifications />
            </IconButton>
            <IconButton color="inherit" onClick={handleProfile}>
              <Person />
            </IconButton>
            <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
              <Avatar 
                src={currentUser.avatar} 
                alt={currentUser.firstName}
                sx={{ width: 32, height: 32, mr: 1 }}
              />
              <Button color="inherit" onClick={handleLogout} startIcon={<ExitToApp />}>
                Logout
              </Button>
            </Box>
          </>
        ) : (
          <>
            <Button color="inherit" onClick={() => navigate('/login')}>Login</Button>
            <Button color="inherit" onClick={() => navigate('/register')}>Register</Button>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
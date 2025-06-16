// filepath: /Users/sergei.budaev/Desktop/social-network/frontend/src/components/Navbar.jsx
import React from 'react';
import { useRouter } from 'next/router';
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
  const router = useRouter();
  const { currentUser, logout } = useAuth();

  const handleHome = () => router.push('/');
  const handleGroup = () => router.push('/groups');
  const handleNotifications = () => router.push('/notifications');
  const handleProfile = () => router.push('/profile/me');
  
  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
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
              <Button color="inherit" onClick={handleLogout} startIcon={<ExitToApp />}>
                Logout
              </Button>
            </Box>
          </>
        ) : (
          <>
            <Button color="inherit" onClick={() => router.push('/login')}>Login</Button>
            <Button color="inherit" onClick={() => router.push('/register')}>Register</Button>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
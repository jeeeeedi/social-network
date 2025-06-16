import React from 'react';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Navbar from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';
import '../styles/globals.css';

// Create theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function AppContent({ Component, pageProps, router }) {
  const { currentUser, loading } = useAuth();
  const isAuthenticated = !!currentUser;
  const showNavbar = isAuthenticated && !['/login', '/register'].includes(router.pathname);

  // Show a loading screen while session is being checked
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {showNavbar && <Navbar />}
      <main className="flex-1">
        <Component {...pageProps} />
      </main>
    </div>
  );
}

function MyApp({ Component, pageProps, router }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <AppContent Component={Component} pageProps={pageProps} router={router} />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default MyApp; 
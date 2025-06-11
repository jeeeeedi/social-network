import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import Groups from './components/Groups';
import Notifications from './components/Notifications';
//import Notifications from './pages/Notifications';

const AppContent = () => {
  const { currentUser, loading } = useAuth();
  const isAuthenticated = !!currentUser;
  const location = useLocation();
  const showNavbar = isAuthenticated && !['/login', '/register'].includes(location.pathname);
  console.log(isAuthenticated)

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
        <Routes>
          <Route path="/" element={isAuthenticated ? <HomePage /> : <Navigate to="/login" />} />
          <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" />} />
          <Route path="/register" element={!isAuthenticated ? <RegisterPage /> : <Navigate to="/" />} />
          <Route path="/profile/:id" element={isAuthenticated ? <ProfilePage /> : <Navigate to="/login" />} />
          <Route path="/groups" element={isAuthenticated ? <Groups /> : <Navigate to="/login" />} />
          <Route path="/notifications" element={isAuthenticated ? <Notifications /> : <Navigate to="/login" />} />
          {/* <Route path="/notifications" element={isAuthenticated ? <NotificationsPage /> : <Navigate to="/login" />} /> */}
        </Routes>
      </main>
    </div>
  );
};

const App = () => {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppContent />
    </Router>
  );
};

export default App;
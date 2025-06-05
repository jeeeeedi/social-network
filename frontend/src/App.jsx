import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
//import Groups from './pages/Groups';
//import Notifications from './pages/Notifications';

const AppContent = () => {
  const { currentUser } = useAuth();
  const isAuthenticated = !!currentUser;
  const location = useLocation();
  const showNavbar = isAuthenticated && !['/login', '/register'].includes(location.pathname);

  return (
    <div className="min-h-screen flex flex-col">
      {showNavbar && <Navbar />}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={isAuthenticated ? <HomePage /> : <Navigate to="/login" />} />
          <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" />} />
          <Route path="/register" element={!isAuthenticated ? <RegisterPage /> : <Navigate to="/" />} />
          <Route path="/profile/:id" element={isAuthenticated ? <ProfilePage /> : <Navigate to="/login" />} />
          <Route path="/profile/me" element={isAuthenticated ? <ProfilePage /> : <Navigate to="/login" />} />
          {/* <Route path="/groups" element={isAuthenticated ? <GroupsPage /> : <Navigate to="/login" />} />
          <Route path="/notifications" element={isAuthenticated ? <NotificationsPage /> : <Navigate to="/login" />} /> */}
        </Routes>
      </main>
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;
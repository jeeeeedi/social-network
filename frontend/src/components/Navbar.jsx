import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleHome = () => navigate('/');
  const handleGroup = () => navigate('/groups');
  const handleNotifications = () => navigate('/notifications');
  const handleProfile = () => navigate('/profile/me');
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <nav className="bg-blue-600 text-white w-full h-[55px] flex items-center justify-between px-4 shadow-md">
      <div className="flex space-x-4">
        <button
          onClick={handleHome}
          className="hover:bg-blue-700 px-3 py-2 rounded-md transition-colors"
          aria-label="Navigate to Home"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleHome()}
        >
          Home
        </button>
        <button
          onClick={handleGroup}
          className="hover:bg-blue-700 px-3 py-2 rounded-md transition-colors"
          aria-label="Navigate to Groups"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleGroup()}
        >
          Group
        </button>
        <button
          onClick={handleNotifications}
          className="hover:bg-blue-700 px-3 py-2 rounded-md transition-colors"
          aria-label="Navigate to Notifications"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleNotifications()}
        >
          Notifications
        </button>
        <button
          onClick={handleProfile}
          className="hover:bg-blue-700 px-3 py-2 rounded-md transition-colors"
          aria-label="View My Profile"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleProfile()}
        >
          View My Profile
        </button>
        <button
          onClick={handleLogout}
          className="hover:bg-blue-700 px-3 py-2 rounded-md transition-colors"
          aria-label="Logout"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleLogout()}
        >
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar; 
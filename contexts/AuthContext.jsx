"use client"

import { createContext, useContext, useState, useEffect } from 'react';
import { checkSession, registerUser, loginUser, logoutUser } from '../lib/auth';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const initializeSession = async () => {
      try {
        const user = await checkSession();
        setCurrentUser(user);
      } catch (err) {
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };
    initializeSession();
  }, []);

  const register = async (formData) => {
    try {
      setError(null);
      const data = await registerUser(formData);
      setCurrentUser(data.user);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const login = async (formData) => {
    try {
      setError(null);
      const user = await loginUser(formData);
      setCurrentUser(user);
      return user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const logout = async () => {
    setLoggingOut(true);
    // Immediately clear the user state to avoid UI confusion
    setCurrentUser(null);
    
    try {
      await logoutUser();
    } catch (err) {
      console.error('Logout API call failed:', err);
      // Even if the API call fails, user state is already cleared
    }
    
    // Reset loading state
    setLoggingOut(false);
  };

  return (
    <AuthContext.Provider value={{ 
      currentUser, 
      setCurrentUser, 
      loading, 
      error, 
      register, 
      login, 
      logout, 
      logoutUser,
      loggingOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
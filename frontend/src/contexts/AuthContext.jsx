import { createContext, useState, useEffect } from 'react';
import { checkSession, registerUser, loginUser, logoutUser } from '../api/auth';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
    try {
      await logoutUser();
      setCurrentUser(null);
    } catch (err) {
      setCurrentUser(null);
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, setCurrentUser, loading, error, register, login, logout, logoutUser }}>
      {children}
    </AuthContext.Provider>
  );
};
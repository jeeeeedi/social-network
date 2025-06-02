import { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const checkLoggedIn = async () => {
            try {
                const response = await fetch('http://localhost:8080/api/session-check', {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                });
                
                const data = await response.json();
                if (data.success) {
                    setCurrentUser(data.user);
                } else {
                    setCurrentUser(null);
                    setError(null);
                    console.log("Setting user to null")
                }
            } catch (err) {
                setCurrentUser(null);
                console.log("And now I'm here ...")
            } finally {
                setLoading(false);
            }
        };
        checkLoggedIn();
    }, []);

    const registerNewUser = async (userData) => {
  try {
    setError(null);
    const response = await fetch('http://localhost:8080/api/register', {
      method: 'POST',
      body: userData, // Send FormData directly
      credentials: 'include',
    });

    // Get the raw response text first to debug non-JSON responses
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text); // Attempt to parse as JSON
    } catch (err) {
      console.error('Invalid JSON response:', text);
      throw new Error('Server returned invalid response');
    }

    if (response.ok && data.success) {
      setCurrentUser(data.user);
      return data;
    } else {
      throw new Error(data.message || 'Registration failed');
    }
  } catch (err) {
    setError(err.message || 'Registration failed. Please try again.');
    throw err;
  }
};

    const loginUser = async (email, password) => {
        try {
            setError(null);
            const response = await fetch('http://localhost:8080/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
                credentials: 'include',
            });
            const data = await response.json();
            if (data.success) {
                setCurrentUser(data.user);
                return data.user;
            } else {
                throw new Error(data.message || 'Login failed');
            }
        } catch (err) {
            setError(err.message || 'Login failed');
            throw err;
        }
    };

    const logoutUser = async () => {
        try {
            await fetch('http://localhost:8080/api/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });
            setCurrentUser(null);
        } catch (err) {
            console.error('Logout error:', err);
            setCurrentUser(null);
        }
    };

    const authContextValue = {
        currentUser,
        setCurrentUser,
        loading,
        error,
        registerNewUser,
        loginUser,
        logoutUser,
    };

    return <AuthContext.Provider value={authContextValue}>{children}</AuthContext.Provider>;
};
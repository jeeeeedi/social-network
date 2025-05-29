import { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const checkLoggedIn = async () => {
            try {
                const response = await fetch('http://localhost:8080/api/profile/me', {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                });
                const data = await response.json();
                if (data.success) {
                    setCurrentUser(data.profile);
                } else {
                    setCurrentUser(null);
                }
            } catch (err) {
                setCurrentUser(null);
                console.error('Check logged in error:', err);
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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData),
                credentials: 'include',
            });
            const data = await response.json();
            if (data.success) {
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
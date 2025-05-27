import {createContext, useState, useEffect} from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({children}) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const checkLoggedIn = async () =>{
            try {

                // TODO: temporary setting , have to replace with real API !!!!!! for now setting to false and null

                setLoading(false);
                setCurrentUser(null);
            } catch (err) {
                setCurrentUser(null);
                setLoading(false);
            }
        };

        checkLoggedIn();
    }, []);

    const registerNewUser = async (userData) => {
        try {
            setError(null);

            // TODO: temporary setting!!! Have to be replaced with actual API call!!!!

            console.log("Register: ", userData);
            return null;
        } catch (err) {
            setError("Please try again. Registration failed.")
            throw err;
        }
    };

    const loginUser = async (email, password) => {
        try {
            setError(null);

            // Make real API call to backend
            const response = await fetch('http://localhost:8080/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setCurrentUser(data.user);
                    return data.user;
                } else {
                    throw new Error('Login failed');
                }
            } else {
                const errorText = await response.text();
                throw new Error(errorText);
            }
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    const logoutUser = async () => {

        //temporary settting!!!! Have to be replaced with actual API call !!!!
        setCurrentUser(null);
    }

    const authContextValue = {
        currentUser,
        loading,
        error,
        registerNewUser,
        loginUser,
        logoutUser
    };

    return <AuthContext.Provider value = {authContextValue}>{children}</AuthContext.Provider>;
};
import {createContext, useState, useEffect} from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({children}) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const checkLoggedIn = async () =>{
            try {

                // temporary setting , have to replace with real API !!!!!! for now setting to false and null

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

            // temporary setting!!! Have to be replaced with actual API call!!!!

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

            // temporary setting!!! Have to be replaced with actual API call!!!!

            console.log("Login:", email, password);
            return null;
        } catch (err) {
            setError("Login failed");
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
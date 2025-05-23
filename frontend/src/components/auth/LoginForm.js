import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import LoginFormUI from './LoginFormUI';

const LoginForm = () => {

    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    const [errors, setErrors] = useState({});

    // component(LoginForm) extracts data from the "data source" (AuthContext): the loginUser function from AuthContext
    const {loginUser, error} = useContext(AuthContext);
    const navigate = useNavigate();

    // Handle input changes
    const handleInputUpdate = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
    };

    // Validate form
    const validate = () => {
        const newErrors = {};
        
        if (!formData.email) {
            newErrors.email = 'Email is required';
        }
        
        if (!formData.password) {
            newErrors.password = 'Password is required';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validate form
        if (!validate()) {
            return;
        }
        
        try {
            // Call login function from AuthContext
            await loginUser(formData.email, formData.password);
            // Redirect to home page on success
            navigate('/');
        } catch (err) {
            console.error(err);
        }
    };

    return (
       <LoginFormUI
       formData={formData}
       errors={errors}
       error={error}
       handleChange={handleInputUpdate}
       handleSubmit={handleSubmit}
       />
    );
};

export default LoginForm;
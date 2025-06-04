import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { validateLogin } from '../utils/validate';
import { useAuth } from '../contexts/AuthContext';

const LoginPage = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { setCurrentUser, error } = useContext(AuthContext);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent duplicate submissions
    const newErrors = validateLogin(formData);
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const user = await login(formData);
      setCurrentUser(user);
      navigate('/');
    } catch (err) {
      console.error('Login error:', err);
      if (err.message.includes('non-JSON response')) {
        console.error('Non-JSON response details:', err.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = () => {
    // Placeholder for login form handling
    navigate('/login');
  };

  const handleRegister = () => {
    navigate('/register');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-start p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 mt-10 text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Welcome!</h1>
        <div className="flex justify-center space-x-4 mt-4">
          {/* <button
            onClick={handleLogin}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            aria-label="Login"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          >
            Login
          </button>
          <button
            onClick={handleRegister}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
            aria-label="Register"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
          >
            Register
          </button> */}
        </div>
      </div>
      <div className="max-w-md mx-auto mt-10 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Log In</h2>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.email ? 'border-red-500' : ''}`}
            />
            {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.password ? 'border-red-500' : ''}`}
            />
            {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}
          </div>
          <button
            type="submit"
            className="w-full bg-blue-500 hover:bg-blue-700 text-white py-2 rounded-md"
            disabled={isSubmitting}
          >
            Sign In
          </button>
        </form>
        <div className="mt-4 text-center">
          <p className="text-sm">
            Don't have an account?{' '}
            <a href="/register" className="text-blue-500 hover:text-blue-700">Register</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
import React from 'react';

const LoginFormUI = ({ formData, errors, error, handleChange, handleSubmit }) => {
    // The return statement begins - every React component must return JSX (React's HTML-like syntax).
    return (
        <div className="max-w-md mx-auto mt-10 bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-6 text-center">Log In</h2>
            {/* Show any authentication errors */}
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                 {/* Email Field */}
                 <div className="mb-4">
                     <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
                         Email
                     </label>
                     <input
                         className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${errors.email ? 'border-red-500' : ''}`}
                         id="email"
                         type="email"
                         name="email"
                         placeholder="Email"
                         value={formData.email}
                         onChange={handleChange}
                     />
                     {errors.email && <p className="text-red-500 text-xs italic">{errors.email}</p>}
                 </div>
                 
                 {/* Password Field */}
                 <div className="mb-6">
                     <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
                         Password
                     </label>
                     <input
                         className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${errors.password ? 'border-red-500' : ''}`}
                         id="password"
                         type="password"
                         name="password"
                         placeholder="Password"
                         value={formData.password}
                         onChange={handleChange}
                     />
                     {errors.password && <p className="text-red-500 text-xs italic">{errors.password}</p>}
                 </div>
                 
                 {/* Submit Button */}
                 <div className="flex items-center justify-between">
                     <button
                         className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
                         type="submit"
                     >
                         Sign In
                     </button>
                 </div>
             </form>
             
             {/* Registration Link */}
             <div className="mt-4 text-center">
                 <p className="text-sm">
                     Don't have an account? 
                     <a href="/register" className="text-blue-500 hover:text-blue-700 ml-1">
                         Register
                     </a>
                 </p>
             </div>
        </div>
    );
};

export default LoginFormUI;
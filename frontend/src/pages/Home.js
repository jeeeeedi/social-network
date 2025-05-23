import React, { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

const Home = () => {
  const { currentUser, logoutUser } = useContext(AuthContext);

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Social Network</h1>
        {currentUser && (
          <button 
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-700 text-white py-2 px-4 rounded"
          >
            Logout
          </button>
        )}
      </header>
      
      <main>
        {currentUser ? (
          <div>
            <h2 className="text-2xl mb-4">Welcome, {currentUser.first_name || 'User'}!</h2>
            <div className="bg-white shadow-md rounded p-6">
              <p className="mb-4">Your Feed</p>
              {/* Placeholder for posts */}
              <div className="border rounded p-4 mb-4 bg-gray-50">
                <p className="text-gray-700">This is where posts will appear.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <h2 className="text-3xl mb-4">Welcome to Social Network</h2>
            <p className="mb-6 text-xl text-gray-600">Connect with friends and the world around you.</p>
            <div className="flex justify-center">
              <a 
                href="/login" 
                className="bg-blue-500 hover:bg-blue-700 text-white py-2 px-6 rounded-lg text-lg"
                style={{ margin: '20px' }}
              >
                Login
              </a>
              <a 
                href="/register" 
                className="bg-green-500 hover:bg-green-700 text-white py-2 px-6 rounded-lg text-lg"
                style={{ margin: '20px' }}
              >
                Register
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Home;
import React, { useEffect, useState } from 'react';
import { checkSession } from '../api/auth.jsx';

const Feed = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useEffect(() => {
    const verifySessionAndFetch = async () => {
      try {
        let user = await checkSession(); // If this fails, it jumps to catch
        setIsAuthenticated(true);        // Only runs if checkSession succeeds
        // Fetch posts only if authenticated
        const res = await fetch('http://localhost:8080/api/getposts', {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) throw new Error('Failed to fetch posts');
        const data = await res.json();
        setPosts(data);
      } catch {
        setIsAuthenticated(false);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };
    verifySessionAndFetch();
  }, []);

  if (loading) {
    return (
      <div className="border rounded p-4 mb-4 bg-gray-50">
        <p className="text-gray-700">Loading feed...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      
      <div className="border rounded p-4 mb-4 bg-gray-50">
        <p className="text-gray-700">Please log in to view the feed.</p>
      </div>
    );
  }

  if (!posts.length) {
    return (
      <div className="border rounded p-4 mb-4 bg-gray-50">
        <p className="text-gray-700">No posts yet.</p>
      </div>
    );
  }

  return (
    <div>
      {posts.map(post => (
        <div key={post.PostID} className="border rounded p-4 mb-4 bg-gray-50">
          <p className="font-semibold">{post.Content}</p>
          <p className="text-xs text-gray-500 mt-2">Privacy: {post.Privacy}</p>
        </div>
      ))}
    </div>
  );
};

export default Feed;
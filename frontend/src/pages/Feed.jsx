import React, { useEffect, useState } from 'react';

const Feed = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:8080/api/posts/')
      .then(res => res.json())
      .then(data => {
        setPosts(data);
        console.log('Posts fetched:', data);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="border rounded p-4 mb-4 bg-gray-50">
        <p className="text-gray-700">Loading feed...</p>
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
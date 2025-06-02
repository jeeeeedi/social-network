import React, { useState } from 'react';
import '../../public/styles/posts.css';

function CreatePost({ onPostCreated }) {
  const [content, setContent] = useState('');
  const [file, setFile] = useState(null);
  const [privacy, setPrivacy] = useState('public');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('content', content);
    formData.append('privacy', privacy);
    if (file) formData.append('file', file);

    // Replace with your API endpoint
    const res = await fetch('/api/posts/', {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });
    if (res.ok) {
      setContent('');
      setFile(null);
      setPrivacy('public');
      onPostCreated && onPostCreated();
    }
  };

  return (
    <form className="create-post-form" onSubmit={handleSubmit}>
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="What's on your mind?"
        required
      />
      <input
        type="file"
        accept="image/*,image/gif"
        onChange={e => setFile(e.target.files[0])}
      />
      <select value={privacy} onChange={e => setPrivacy(e.target.value)}>
        <option value="public">Public</option>
        <option value="followers">Followers</option>
        <option value="private">Private</option>
      </select>
      <button type="submit">Post</button>
    </form>
  );
}

export default CreatePost;
import React, { useState } from "react";
import { sanitize } from "../utils/sanitize.jsx";
import { checkSession } from "../api/auth.jsx";

const PostInput = ({ onPostCreated }) => {
  const [content, setContent] = useState("");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [privacy, setPrivacy] = useState("public");
  const [submitting, setSubmitting] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImage(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  };

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await checkSession(); // Verify authentication
    } catch {
      alert("You must be logged in to create a post.");
      setSubmitting(false);
      return;
    }

    const sanitizedContent = sanitize(content);

    const formData = new FormData();
    formData.append("content", sanitizedContent);
    formData.append("privacy", privacy);
    if (image) formData.append("file", image);

    try {
      const res = await fetch("http://localhost:8080/api/createposts", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to create post");

      setContent("");
      setImage(null);
      setImagePreview(null);
      setPrivacy("public");
      if (onPostCreated) onPostCreated();
    } catch (err) {
      alert("Error creating post: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white shadow-md rounded p-6 mb-6">
      <div className="mb-4">
        <label className="block mb-1 font-semibold">
          Privacy
          <span style={{ color: "red" }}>*</span>
        </label>
        <br />
        <select
          className="border rounded p-2"
          value={privacy}
          onChange={(e) => setPrivacy(e.target.value)}
          required
        >
          <option value="public">Public</option>
          <option value="semiprivate">Semiprivate</option>
          <option value="private">Private</option>
        </select>
      </div>
      <br />
      <form onSubmit={handlePostSubmit}>
        <label className="block mb-2 font-semibold">
          What's on your mind?
          <span style={{ color: "red" }}>*</span>
        </label>
        <br />
        <textarea
          className="w-full border rounded p-2 mb-4"
          rows={3}
          placeholder="Write something..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          maxLength={3000}
        />
        <br />
        <br />
        <div className="mb-4">
          <label className="block mb-1 font-semibold">Attach Image/GIF</label>
          <br />
          <input
            type="file"
            accept="image/*,image/gif"
            className="block"
            onChange={handleImageChange}
          />
          {imagePreview && (
            <img
              src={imagePreview}
              alt="Preview"
              className="mt-2 max-h-40 rounded"
            />
          )}
        </div>
        <br />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
          disabled={submitting}
        >
          {submitting ? "Posting..." : "Post"}
        </button>
      </form>
    </div>
  );
};

export default PostInput;

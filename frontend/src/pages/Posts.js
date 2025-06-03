import React, { useContext, useState } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";

const Home = () => {
  const { currentUser, logoutUser } = useContext(AuthContext);

  // State for post form
  const [content, setContent] = useState("");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [privacy, setPrivacy] = useState("public");
  const [submitting, setSubmitting] = useState(false);

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.error(err);
    }
  };

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

    // Example: Prepare form data for backend
    const formData = new FormData();
    formData.append("content", content);
    formData.append("privacy", privacy);
    if (image) formData.append("file", image); // 'file' matches Go handler

    try {
      const res = await fetch("http://localhost:8080/api/posts/", {
        method: "POST",
        body: formData,
        credentials: "include", // if you use cookies/session
      });

      if (!res.ok) {
        throw new Error("Failed to create post");
      }

      // Optionally handle the response
      // const data = await res.json();

      setContent("");
      setImage(null);
      setImagePreview(null);
      setPrivacy("public");
    } catch (err) {
      alert("Error creating post: " + err.message);
    } finally {
      setSubmitting(false);
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
            <h2 className="text-2xl mb-4">
              Welcome, {currentUser.first_name || "User"}!
            </h2>
            <div className="mb-4">
              <Link
                to={`/profile/${currentUser.user_uuid}`}
                className="bg-blue-500 hover:bg-blue-700 text-white py-2 px-4 rounded"
              >
                View My Profile
              </Link>
            </div>

            {/* Create Post Form */}
            <div className="bg-white shadow-md rounded p-6 mb-6">
              <form onSubmit={handlePostSubmit}>
                <label className="block mb-2 font-semibold">
                  What's on your mind?
                </label>
                <textarea
                  className="w-full border rounded p-2 mb-4"
                  rows={3}
                  placeholder="Write something..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                />
                <div className="mb-4">
                  <label className="block mb-1 font-semibold">
                    Attach Image/GIF
                  </label>
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
                <div className="mb-4">
                  <label className="block mb-1 font-semibold">Privacy</label>
                  <select
                    className="border rounded p-2"
                    value={privacy}
                    onChange={(e) => setPrivacy(e.target.value)}
                  >
                    <option value="public">Public</option>
                    <option value="semiprivate">Semiprivate</option>
                    <option value="private">Private</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
                  disabled={submitting}
                >
                  {submitting ? "Posting..." : "Post"}
                </button>
              </form>
            </div>
            {/* End Create Post Form */}

            <div className="bg-white shadow-md rounded p-6">
              <p className="mb-4">Your Feed</p>
              <div className="border rounded p-4 mb-4 bg-gray-50">
                <p className="text-gray-700">
                  This is where posts will appear.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <h2 className="text-3xl mb-4">Welcome to Social Network</h2>
            <p className="mb-6 text-xl text-gray-600">
              Connect with friends and the world around you.
            </p>
            <div className="flex justify-center">
              <Link
                to="/login"
                className="bg-blue-500 hover:bg-blue-700 text-white py-2 px-6 rounded-lg text-lg"
                style={{ margin: "20px" }}
              >
                Login
              </Link>
              <Link
                to="/register"
                className="bg-green-500 hover:bg-green-700 text-white py-2 px-6 rounded-lg text-lg"
                style={{ margin: "20px" }}
              >
                Register
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Home;

import React, { useEffect, useState } from "react";
import { checkSession } from "../api/auth.jsx";
import { formatDate } from "../utils/formatDate.jsx";

const Feed = () => {
  const [posts, setPosts] = useState([]);
  const [imageModal, setImageModal] = useState({ open: false, src: "" });
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useEffect(() => {
    const verifySessionAndFetch = async () => {
      try {
        await checkSession(); // If this fails, it jumps to catch
        setIsAuthenticated(true); // Only runs if checkSession succeeds
        // Fetch posts only if authenticated
        const res = await fetch("http://localhost:8080/api/getposts", {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) throw new Error("Failed to fetch posts");
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

  if (!posts) {
    return (
      <div className="border rounded p-4 mb-4 bg-gray-50">
        <p className="text-gray-700">No posts yet.</p>
      </div>
    );
  }
console.log("Posts fetched:", posts); // Debugging line to check fetched posts
  return (
    <div className="max-w-2xl mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-6 text-center text-blue-700">
        Your Feed
      </h2>
      {posts.map((post) => (
        <div
          key={post.post_uuid}
          className="border rounded-lg p-6 mb-6 bg-white shadow hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center mb-2">
            <div>
              <h3 className="font-semibold text-lg text-blue-800">
                {post.nickname}
              </h3>
              <span className="text-xs text-gray-400">
                {formatDate(post.created_at)}
              </span>
            </div>
          </div>
          <p className="text-gray-800 mb-3">{post.content}</p>
          {/* Image preview */}
          {post.filename_new && post.filename_new !== "" && (
            <div className="mb-3">
              <img
                src={`http://localhost:8080/uploads/${post.filename_new}`}
                alt="attachment"
                className="max-w-xs max-h-48 rounded cursor-pointer border"
                onClick={() =>
                  setImageModal({
                    open: true,
                    src: `http://localhost:8080/uploads/${post.filename_new}`,
                  })
                }
              />
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">
              Privacy: {post.privacy}
            </span>
          </div>
        </div>
      ))}

      {/* Modal for large image preview */}
      {imageModal.open && (
        <div
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
          onClick={() => setImageModal({ open: false, src: "" })}
        >
          <img
            src={imageModal.src}
            alt="full"
            className="max-w-3xl max-h-[80vh] rounded shadow-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default Feed;

import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  Box,
  Paper,
  TextField,
  Button,
  Avatar,
  Typography,
  Divider,
  IconButton,
  Card,
  CardContent,
  CardHeader,
} from "@mui/material";
import { Send, Favorite, Comment, Share } from "@mui/icons-material";
import { sanitize } from "../utils/sanitize.jsx";
import { checkSession } from "../api/auth.jsx";
import { formatDateTime } from "../utils/formatDate.jsx";

const SocialFeed = () => {
  const [content, setNewPost] = useState("");
  const [posts, setPosts] = useState([]);
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [privacy, setPrivacy] = useState("public");
  const [submitting, setSubmitting] = useState(false);
  const { currentUser } = useAuth();
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useEffect(() => {
    const verifySessionAndFetch = async () => {
      try {
        await checkSession(); // If this fails, it jumps to catch
        setIsAuthenticated(true); // Only runs if checkSession succeeds
        // Fetch posts only if authenticated
        const res = await fetch("http://localhost:8080/api/getfeedposts", {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) throw new Error("Failed to fetch posts");
        const postData = await res.json();
        setPosts(postData);
      } catch {
        setIsAuthenticated(false);
        setPosts([]);
      }
    };
    verifySessionAndFetch();
  }, []);

  const handleAddPhoto = (e) => {
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

  const handlePost = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    /* const post = {
      id: posts.length + 1,
      user: {
        name: currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : 'Current User',
        username: currentUser ? currentUser.nickname || 'user' : 'user',
        avatar: currentUser ? currentUser.avatar || '' : ''
      },
      content: newPost,
      timestamp: 'Just now',
      likes: 0,
      comments: 0,
      shares: 0,
      liked: false,
      image: ''
    }; */
    /* setPosts([post, ...posts]);
    setNewPost(""); */
    // TODO: Send post to backend API

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

      // Reset the form after successful post
      setNewPost("");
      setImage(null);
      setImagePreview(null);
      setPrivacy("public");
    } catch (err) {
      alert("Error creating post: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = (postId) => {
    setPosts(
      posts.map((post) =>
        post.post_id === postId
          ? {
              ...post,
              liked: !post.liked,
              likes: post.liked ? post.likes - 1 : post.likes + 1,
            }
          : post
      )
    );
    // TODO: Send like status to backend API
  };

  /*   if (loading) {
    return (
      <div className="border rounded p-4 mb-4 bg-gray-50">
        <p className="text-gray-700">Loading feed...</p>
      </div>
    );
  } */
  if (!isAuthenticated) {
    return (
      <div className="border rounded p-4 mb-4 bg-gray-50">
        <p className="text-gray-700">Please log in to view the feed.</p>
      </div>
    );
  }

  return (
    <Box sx={{ maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
      {/* Create Post Section */}
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <form onSubmit={handlePost}>
          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            <Avatar
              src={currentUser ? currentUser.avatar || "" : ""}
              alt={currentUser ? currentUser.nickname || "User" : "User"}
              sx={{ width: 40, height: 40 }}
            />
            <TextField
              placeholder="What's on your mind?"
              value={content}
              onChange={(e) => {
                if (e.target.value.length <= 3000) setNewPost(e.target.value);
              }}
              multiline
              rows={3}
              variant="outlined"
              fullWidth
              sx={{ border: "none" }}
              inputProps={{ maxLength: 3000 }}
              required
            />
          </Box>
          <Box
            sx={{
              display: "flex",
              alignItems: "left",
              mb: 2,
              gap: 2,
              justifyContent: "space-between",
            }}
          >
            <Button
              variant="text"
              size="small"
              component="label"
              sx={{ minWidth: 0 }}
            >
              Add Photo
              <input
                type="file"
                accept="image/*,image/gif"
                hidden
                onChange={handleAddPhoto}
              />
            </Button>
            {imagePreview && (
              <Box sx={{ ml: 2, maxWidth: 100, maxHeight: 100, borderRadius: 2, overflow: "hidden", border: "1px solid #eee", bgcolor: "#fafafa" }}>
                <img
                  src={imagePreview}
                  alt="Preview"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              </Box>
            )}
            <TextField
              select
              label="Privacy"
              value={privacy}
              onChange={(e) => setPrivacy(e.target.value)}
              SelectProps={{ native: true }}
              size="small"
              sx={{ minWidth: 120 }}
              required
            >
              <option value="public">Public</option>
              <option value="semiprivate">Semiprivate</option>
              <option value="private">Private</option>
            </TextField>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting || !content.trim()}
              endIcon={<Send />}
            >
              {submitting ? "Posting..." : "Post"}
            </Button>
          </Box>
        </form>
      </Paper>

      {/* Posts Feed */}
      <Box sx={{ spaceY: 3 }}>
        {(!posts || posts.length === 0) ? (
          <Typography variant="body1" color="text.secondary" align="center">
            No posts yet.
          </Typography>
        ) : (
          posts.map((post) => (
            <Card key={post.post_id} sx={{ mb: 3 }}>
              <CardHeader
                avatar={
                  <Avatar
                    src={post.avatar || ""}
                    alt={post.nickname}
                    sx={{ width: 40, height: 40 }}
                  />
                }
                title={<Typography variant="h6">{post.nickname}</Typography>}
                subheader={
                  <Typography variant="caption">
                    @{post.nickname} · {formatDateTime(post.created_at)}
                  </Typography>
                }
              />
              <CardContent>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {post.content}
                </Typography>
                {post.filename_new && (
                  <Box
                    sx={{
                      mb: 2,
                      borderRadius: 1,
                      overflow: "hidden",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <img
                      src={`http://localhost:8080/uploads/${post.filename_new}`}
                      alt="Post image"
                      style={{ maxWidth: "400px", maxHeight: "400px" }}
                    />
                  </Box>
                )}
                <Box
                  sx={{ display: "flex", justifyContent: "space-between", pt: 2 }}
                >
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <IconButton
                      onClick={() => handleLike(post.post_id)}
                      color={post.liked ? "error" : "default"}
                      size="small"
                    >
                      <Favorite fontSize="small" />
                      <Typography variant="caption" sx={{ ml: 0.5 }}>
                        {post.likes}
                      </Typography>
                    </IconButton>
                    <IconButton size="small">
                      <Comment fontSize="small" />
                      <Typography variant="caption" sx={{ ml: 0.5 }}>
                        {post.comments}
                      </Typography>
                    </IconButton>
                    <IconButton size="small">
                      <Share fontSize="small" />
                      <Typography variant="caption" sx={{ ml: 0.5 }}>
                        {post.shares}
                      </Typography>
                    </IconButton>
                  </Box>
                </Box>
              </CardContent>
              <Divider />
            </Card>
          ))
        )}
      </Box>
    </Box>
  );
};

export default SocialFeed;

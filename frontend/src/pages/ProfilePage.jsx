import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { fetchProfile, updateProfilePrivacy } from "../api/profile";
import { checkSession } from "../api/auth.jsx";
import { formatDateOnly, formatDateTime } from "../utils/formatDate.jsx";
import "./ProfilePage.css";

const ProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();

  // Check if the path is /profile/me since id might not be set by useParams for exact route
  const isMeRoute = location.pathname === "/profile/me";
  const effectiveId = id || (isMeRoute ? "me" : undefined);

  const userId = effectiveId === "me" ? currentUser?.user_uuid : effectiveId;
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isFollowing, setIsFollowing] = useState(false);
  const [followStatus, setFollowStatus] = useState("");
  const [privacy, setPrivacy] = useState("public");
  const [posts, setPosts] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useEffect(() => {
    const verifySessionAndFetch = async () => {
      if (!userId) {
        setError("Invalid user ID");
        setLoading(false);
        return;
      }
      try {
        await checkSession();
        setIsAuthenticated(true);
        const userData = await fetchProfile(userId);
        setProfile(userData.profile);
        setPrivacy(userData.profile.privacy || "public");

        // Check follow status if not own profile
        if (currentUser && currentUser.user_id !== userId && id !== "me") {
          const followResponse = await fetch(
            `http://localhost:8080/api/follow/status/${userId}`,
            {
              credentials: "include",
            }
          );
          const followData = await followResponse.json();
          if (followData.success) {
            setIsFollowing(followData.isFollowing);
            setFollowStatus(followData.status || "");
          }
        }

        // Fetch posts for the profile
        const myPostsRes = await fetch("http://localhost:8080/api/getmyposts", {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        if (!myPostsRes.ok) throw new Error("Failed to getmyposts");
        const myPostsdata = await myPostsRes.json();
        setPosts(myPostsdata);
      } catch (err) {
        setIsAuthenticated(false);
        setError(err.message || "Failed to load profile");
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };
    verifySessionAndFetch();
  }, [userId, currentUser, id]);

  const handlePrivacyToggle = async () => {
    if (
      !currentUser ||
      (currentUser.user_uuid !== userId && effectiveId !== "me")
    )
      return;

    const newPrivacy = profile.privacy === "public" ? "private" : "public";
    try {
      const response = await fetch(
        "http://localhost:8080/api/profile/privacy",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ privacy: newPrivacy }),
          credentials: "include",
        }
      );
      const data = await response.json();
      if (data.success) {
        setProfile({ ...profile, privacy: newPrivacy });
        setPrivacy(newPrivacy);
        if (currentUser.user_uuid === userId || effectiveId === "me") {
          // Update currentUser if it's the user's own profile
          // Assuming AuthContext provides a way to update currentUser, though it might not be directly available
        }
      } else {
        setError(data.message || "Failed to update privacy");
      }
    } catch (err) {
      setError("Error updating privacy");
    }
  };

  const handleFollowToggle = async () => {
    if (!currentUser) {
      navigate("/login");
      return;
    }
    try {
      const response = await fetch(
        `http://localhost:8080/api/follow/${userId}`,
        {
          method: isFollowing ? "DELETE" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );
      const data = await response.json();
      if (data.success) {
        setIsFollowing(data.status === "pending" || data.status === "accepted");
        setFollowStatus(data.status || "");
      } else {
        setError(data.message || "Failed to update follow status");
      }
    } catch (err) {
      setError("Error updating follow status");
    }
  };

  if (loading) return <div className="text-center mt-10">Loading...</div>;
  if (!isAuthenticated) {
    return (
      <div className="border rounded p-4 mb-4 bg-gray-50">
        <p className="text-gray-700">Please log in to view your profile.</p>
      </div>
    );
  }
  if (error)
    return <div className="text-center mt-10 text-red-500">Error: {error}</div>;
  if (!profile)
    return <div className="text-center mt-10">Profile not found</div>;


  const isOwnProfile =
    currentUser && (currentUser.user_uuid === userId || effectiveId === "me");

  return (
    <div className="profile-container">
      <h2>
        {profile.first_name} {profile.last_name}'s Profile
      </h2>
      <div className="profile-info">
        {profile.avatar && (
          <img
            src={`http://localhost:8080${profile.avatar}`}
            alt={`${profile.first_name}'s avatar`}
            className="profile-avatar"
          />
        )}
        {profile.email && (
          <>
            <div>
              <label>Email: </label>
              <span>{profile.email}</span>
            </div>
            {profile.date_of_birth && (
              <div>
                <label>Date of Birth: </label>
                <span>{formatDateOnly(profile.date_of_birth)}</span>
              </div>
            )}
            {profile.nickname && (
              <div>
                <label>Nickname: </label>
                <span>{profile.nickname}</span>
              </div>
            )}
            {profile.about_me && (
              <div>
                <label>About Me: </label>
                <span>{profile.about_me}</span>
              </div>
            )}
            {profile.role && (
              <div>
                <label>Role: </label>
                <span>{profile.role}</span>
              </div>
            )}
            {profile.created_at && (
              <div>
                <label>Joined: </label>
                <span>{formatDateTime(profile.created_at)}</span>
              </div>
            )}
          </>
        )}
        <div>
          <label>Privacy: </label>
          <span>{privacy}</span>
        </div>
        {isOwnProfile && (
          <div>
            <button
              className="privacy-button"
              onClick={handlePrivacyToggle}
              aria-label={`Make profile ${
                profile.privacy === "public" ? "private" : "public"
              }`}
              tabIndex="0"
            >
              Make Profile {profile.privacy === "public" ? "Private" : "Public"}
            </button>
          </div>
        )}
        {!isOwnProfile && (
          <button onClick={handleFollowToggle} className="follow-button">
            {isFollowing
              ? followStatus === "pending"
                ? "Cancel Follow Request"
                : "Unfollow"
              : "Follow"}
          </button>
        )}
      </div>
      {profile.email && (
        <>
          <div className="profile-posts">
            <h3>Posts</h3>
            {!posts ? <p>No posts yet.</p> : posts.map((post) => (
              <div
                key={post.post_uuid}
                className="border rounded-lg p-6 mb-6 bg-white shadow hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center mb-2">
                  <div>
                    <span className="text-xs text-gray-400">
                      Posted on {formatDateTime(post.created_at)}
                    </span>
                  </div>
                </div>
                <p className="text-gray-800 mb-3">{post.content}</p>
                {post.filename_new && post.filename_new !== "" && (
                  <div className="mb-3">
                    <img
                      src={`http://localhost:8080/uploads/${post.filename_new}`}
                      alt="attachment"
                      className="max-w-xs max-h-48 rounded cursor-pointer border"
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
          </div>
          <div className="profile-followers">
            <h3>Followers</h3>
            <p>Coming soon...</p>
          </div>
          <div className="profile-following">
            <h3>Following</h3>
            <p>Coming soon...</p>
          </div>
        </>
      )}
    </div>
  );
};

export default ProfilePage;

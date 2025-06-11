import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { fetchProfile } from "../api/profile";
import { checkSession } from "../api/auth.jsx";
import { formatDateOnly, formatDateTime } from "../utils/formatDate.jsx";
import "./ProfilePage.css";

const ProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();

  const isMeRoute =
    location.pathname === "/profile/me" || location.pathname === "/profile/me/";
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
        setError("Invalid user UUID");
        setLoading(false);
        return;
      }
      try {
        await checkSession();
        setIsAuthenticated(true);
        const profileData = await fetchProfile(userId);
        if (!profileData || !profileData.success) {
          setError(profileData?.message || "Failed to load profile");
          setLoading(false);
          return;
        }
        setProfile(profileData.profile);
        setPrivacy(profileData.profile.privacy || "public");

        if (!profileData.success) {
          setError(profileData.message || "Failed to load profile");
          setLoading(false);
          return;
        }

        // Check follow status if not own profile
        if (
          currentUser &&
          currentUser.user_uuid !== userId &&
          userId !== "me"
        ) {
          try {
            const followResponse = await fetch(
              `http://localhost:8080/api/follow/status/${userId}`,
              { credentials: "include" }
            );
            const followData = await followResponse.json();
            if (followData.success) {
              setIsFollowing(followData.isFollowing);
              setFollowStatus(followData.status || "");
            } else {
              console.warn("Follow status error:", followData.message);
              // Fallback: Check if current user is in followers list
              const isFollower = profileData.followers?.some(
                (f) => f.user_uuid === currentUser.user_uuid
              );
              setIsFollowing(isFollower);
              setFollowStatus(isFollower ? "accepted" : "");
            }
          } catch (err) {
            console.warn("Follow status fetch error:", err);
            // Fallback
            const isFollower = profileData.followers?.some(
              (f) => f.user_uuid === currentUser.user_uuid
            );
            setIsFollowing(isFollower);
            setFollowStatus(isFollower ? "accepted" : "");
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
  }, [userId, currentUser]);

  const handlePrivacyToggle = async () => {
    if (
      !currentUser ||
      (currentUser.user_uuid !== userId && effectiveId !== "me")
    ) {
      navigate("/login");
      return;
    }
    const newPrivacy =
      profile.privacy === "public" ? "private" : "public";
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
        setProfile({
          ...profile,
          profile: { ...profile.profile, privacy: newPrivacy },
        });
        setPrivacy(newPrivacy);
      } else {
        setError(data.message || "Failed to update privacy");
      }
    } catch (err) {
      console.error("Privacy Update Error:", err);
      setError("Error updating privacy");
    }
  };

  const handleFollowToggle = async () => {
    if (!currentUser) {
      window.location.href = "/login";
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
      const followData = await response.json();
      if (followData.success) {
        setIsFollowing(
          followData.status === "pending" || followData.status === "accepted"
        );
        setFollowStatus(followData.status || "");
        // Refresh profile to update followers list
        const updatedProfile = await fetchProfile(userId);
        if (updatedProfile.success) {
          setProfile(updatedProfile);
        }
      } else {
        setError(followData.message || "Failed to update follow status");
      }
    } catch (err) {
      console.error("Follow Toggle Error:", err);
      setError("Error updating follow status");
    }
  };

  const handleRetry = () => {
    setError("");
    setLoading(true);
    setProfile(null);
  };

  if (loading) {
    return <div className="text-center mt-10">Loading...</div>;
  }
  if (!isAuthenticated) {
    return (
      <div className="border rounded p-4 mb-4 bg-gray-50">
        <p className="text-gray-700">Please log in to view your profile.</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="text-center mt-10 text-red-500">
        Error: {error}
        <button onClick={handleRetry} className="retry-button">
          Retry
        </button>
      </div>
    );
  }
  if (!profile) {
    return <div className="text-center mt-10">Profile not found</div>;
  }

  const isOwnProfile =
    currentUser && (currentUser.user_uuid === userId || effectiveId === "me");
    const displayName =
    profile.first_name && profile.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : profile.nickname || "Unknown User";

  return (
    <div className="profile-container">
      <h2>{displayName}'s Profile</h2>
      <div className="profile-info">
        {profile.avatar && (
          <img
            src={`http://localhost:8080${profile.avatar}`}
            alt={`${displayName}'s avatar`}
            className="profile-avatar"
          />
        )}
        <div>
          <p>
            <strong>Privacy: </strong>
            {privacy}
          </p>
        </div>
        {profile.email ? (
          <>
            <div>
              <p>
                <strong>Email:</strong> {profile.email}
              </p>
            </div>
            {formatDateOnly(profile.date_of_birth) && (
              <div>
                <p>
                  <strong>Date of Birth:</strong>{" "}
                  {formatDateOnly(profile.date_of_birth)}
                </p>
              </div>
            )}
            {profile.nickname && (
              <div>
                <p>
                  <strong>Username:</strong> {profile.nickname}
                </p>
              </div>
            )}
            {profile.about_me && (
              <div>
                <p>
                  <strong>About Me:</strong> {profile.about_me}
                </p>
              </div>
            )}
            {profile.role && (
              <div>
                <p>
                  <strong>Role:</strong> {profile.role}
                </p>
              </div>
            )}
            {profile.created_at && (
              <div>
                <p>
                  <strong>Joined:</strong> {formatDateTime(profile.created_at)}
                </p>
              </div>
            )}
          </>
        ) : (
          <p>Limited profile view</p>
        )}
        {isOwnProfile && (
          <div>
            <button
              className="privacy-button"
              onClick={handlePrivacyToggle}
              aria-label={`Make profile ${
                profile.privacy === "public" ? "private" : "public"
              }`}
            >
              Make Profile{" "}
              {profile.privacy === "public" ? "Private" : "Public"}
            </button>
          </div>
        )}
        {!isOwnProfile && currentUser && (
          <button
            onClick={handleFollowToggle}
            className="follow-button"
            aria-label={
              isFollowing
                ? followStatus === "pending"
                  ? "Cancel Follow Request"
                  : "Unfollow"
                : "Follow"
            }
          >
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
            {!posts ? (
              <p>No posts yet.</p>
            ) : (
              posts.map((post) => (
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
              ))
            )}
          </div>
          <div className="profile-followers">
            <h3>Followers ({profile.followers?.length || 0})</h3>
            {profile.followers?.length > 0 ? (
              <ul>
                {profile.followers.map((follower) => (
                  <li key={follower.user_uuid}>
                    <Link to={`/profile/${follower.user_uuid}`}>
                      {follower.first_name || follower.user_uuid}{" "}
                      {follower.last_name || ""}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No followers yet</p>
            )}
          </div>
          <div className="profile-following">
            <h3>Following ({profile.following?.length || 0})</h3>
            {profile.following?.length > 0 ? (
              <ul>
                {profile.following.map((following) => (
                  <li key={following.user_uuid}>
                    <Link to={`/profile/${following.user_uuid}`}>
                      {following.first_name || following.user_uuid}{" "}
                      {following.last_name || ""}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Not following anyone yet</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ProfilePage;

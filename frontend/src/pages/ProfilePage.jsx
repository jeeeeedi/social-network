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
        if (!data.success) {
          setError(data.message || 'Failed to load profile');
          setLoading(false);
          return;
        }
        setProfile(userData); // Set full response
        setPrivacy(userData.profile?.privacy || "public");
        console.log('Set profile followers:', data.followers);

        // Check follow status if not own profile
        if (currentUser && currentUser.user_uuid !== userId && userId !== "me") {
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
              // Fallback: Check if current user is in followers list
              const isFollower = data.followers?.some(f => f.user_uuid === currentUser.user_uuid);
              setIsFollowing(isFollower);
              setFollowStatus(isFollower ? 'accepted' : '');
            }
          } catch (err) {
            // Fallback
            const isFollower = data.followers?.some(f => f.user_uuid === currentUser.user_uuid);
            setIsFollowing(isFollower);
            setFollowStatus(isFollower ? 'accepted' : '');
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
      {
      navigate('/login');
      return;
    }
    const newPrivacy = profile.profile.privacy === "public" ? "private" : "public";
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
      console.log('Privacy Update Response:', data);
      if (data.success) {
        setProfile({ ...profile, profile: { ...profile.profile, privacy: newPrivacy } });
        setPrivacy(newPrivacy);
      } else {
        setError(data.message || "Failed to update privacy");
      }
    } catch (err) {
      setError("Error updating privacy");
    }
  };

  const handleFollowToggle = async () => {
    if (!currentUser) {
      window.location.href = "/login";
      return;
    }
    try {
      console.log('Toggling follow for userId:', userId);
      const response = await fetch(
        `http://localhost:8080/api/follow/${userId}`,
        {
          method: isFollowing ? "DELETE" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );
      console.log('Follow Toggle Response Status:', response.status);
      const followData = await response.json();
      console.log('Follow Toggle Response:', followData);
      if (followData.success) {
        setIsFollowing(followData.status === "pending" || followData.status === "accepted");
        setFollowStatus(followData.status || "");
        // Refresh profile to update followers list
        const updatedProfile = await fetchProfile(userId);
        if (updatedProfile.success) {
          setProfile(updatedProfile);
          console.log('Refreshed profile followers:', updatedProfile.followers);
        }
      } else {
        setError(followData.message || "Failed to update follow status");
      }
    } catch (err) {
      console.error('Follow Toggle Error:', err);
      setError("Error updating follow status");
    }
  };

  const handleRetry = () => {
    console.log('Retrying profile fetch');
    setError('');
    setLoading(true);
    setProfile(null);
  };

  if (loading) {
    console.log('Rendering: Loading state');
    return <div className="text-center mt-10">Loading...</div>;
  }
  if (error) {
    console.log('Rendering: Error state:', error);
    return (
      <div className="text-center mt-10 text-red-500">
        Error: {error}
        <button onClick={handleRetry} className="retry-button">Retry</button>
      </div>
    );
  }
  if (!profile) {
    console.log('Rendering: Profile not found');
    return <div className="text-center mt-10">Profile not found</div>;
  }
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


  const isOwnProfile = currentUser && (currentUser.user_uuid === userId || effectiveId === 'me');
  console.log('Debug - isOwnProfile:', isOwnProfile);
  console.log('Debug - currentUser.user_uuid:', currentUser?.user_uuid);
  console.log('Debug - userId:', userId);
  console.log('Debug - effectiveId:', effectiveId);

  const displayName = profile.profile.first_name && profile.profile.last_name
    ? `${profile.profile.first_name} ${profile.profile.last_name}`
    : profile.profile.nickname || 'Unknown User';

  const formattedDateOfBirth = profile.profile.date_of_birth
    ? new Date(profile.profile.date_of_birth).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  return (
    <div className="profile-container">
      <h2>{displayName}'s Profile</h2>
      <div className="profile-info">
        {profile.profile.avatar && (
          <img
            src={`http://localhost:8080${profile.profile.avatar}`}
            alt={`${displayName}'s avatar`}
            className="profile-avatar"
          />
        )}
        <div>
          <p><strong>Privacy: </strong>{privacy}</p>
        </div>
        {profile.profile.email ? (
          <>
            <div>
              <p><strong>Email:</strong> {profile.profile.email}</p>
            </div>
            {formattedDateOfBirth && (
              <div>
                <p><strong>Date of Birth:</strong> {formatDateOnly(profile.date_of_birth)}</p>
              </div>
            )}
            {profile.profile.nickname && (
              <div>
                <p><strong>Username:</strong> {profile.profile.nickname}</p>
              </div>
            )}
            {profile.profile.about_me && (
              <div>
                <p><strong>About Me:</strong> {profile.profile.about_me}</p>
              </div>
            )}
            {profile.profile.role && (
              <div>
                <p><strong>Role:</strong> {profile.profile.role}</p>
              </div>
            )}
            {profile.profile.created_at && (
              <div>
                <p><strong>Joined:</strong> {formatDateTime(profile.profile.created_at)}</p>
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
             
              aria-label={`Make profile ${profile.
                profile.privacy === "public" ? "private" : "public"
              }`}
            
            >
              Make Profile {profile.profile.privacy === "public" ? "Private" : "Public"}
            </button>
          </div>
        )}
        {!isOwnProfile && currentUser && (
          <button
            onClick={handleFollowToggle}
            className="follow-button"
            aria-label={isFollowing ? (followStatus === 'pending' ? 'Cancel Follow Request' : 'Unfollow') : 'Follow'}
          >
            {isFollowing
              ? followStatus === "pending"
                ? "Cancel Follow Request"
                : "Unfollow"
              : "Follow"}
          </button>
        )}
      </div>
      {profile.profile.email && (
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
            {console.log('Rendering followers:', profile.followers)}
            <h3>Followers ({profile.followers?.length || 0})</h3>
            {profile.followers?.length > 0 ? (
              <ul>
                {profile.followers.map((follower) => (
                  <li key={follower.user_uuid}>
                    <Link to={`/profile/${follower.user_uuid}`}>
                      {follower.first_name || follower.user_uuid} {follower.last_name || ''}
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
                      {following.first_name || following.user_uuid} {following.last_name || ''}
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

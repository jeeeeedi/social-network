import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "../../contexts/AuthContext";
import { fetchProfile } from "../../lib/profile";
import { checkSession } from "../../lib/auth";
import { formatDateOnly, formatDateTime } from "../../utils/formatDate";
import styles from "./ProfilePage.module.css";

const ProfilePage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { currentUser } = useAuth();

  const isMeRoute = id === "me";
  const effectiveId = id || (isMeRoute ? "me" : undefined);
  const userId = effectiveId === "me" ? currentUser?.user_uuid : effectiveId;

  const [profile, setProfile] = useState(null);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isFollowing, setIsFollowing] = useState(false);
  const [followStatus, setFollowStatus] = useState("");
  const [privacy, setPrivacy] = useState("public");
  const [posts, setPosts] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useEffect(() => {
    if (!router.isReady) return; // Wait for router to be ready
    
    const verifySessionAndFetch = async () => {
      if (!userId) {
        setError("Invalid user UUID");
        setLoading(false);
        return;
      }
      try {
        await checkSession();
        setIsAuthenticated(true);

        // Fetch profile
        const profileData = await fetchProfile(userId);
        console.log("Profile Response:", profileData);
        if (!profileData || !profileData.success) {
          setError(profileData?.message || "Failed to load profile");
          setLoading(false);
          return;
        }
        setProfile(profileData.profile);
        setPrivacy(profileData.profile.privacy || "public");

        // Fetch followers
        const followersResponse = await fetch(
          `http://localhost:8080/api/followers/${userId}`,
          {
            method: "GET",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
          }
        );
        const followersData = await followersResponse.json();
        console.log("Followers Response:", followersData);
        if (followersData.success) {
          setFollowers(followersData.followers || []);
        } else {
          console.warn("Followers fetch error:", followersData.message);
          setFollowers([]);
        }

        // Fetch following
        const followingResponse = await fetch(
          `http://localhost:8080/api/following/${userId}`,
          {
            method: "GET",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
          }
        );
        const followingData = await followingResponse.json();
        console.log("Following Response:", followingData);
        if (followingData.success) {
          setFollowing(followingData.following || []);
        } else {
          console.warn("Following fetch error:", followingData.message);
          setFollowing([]);
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
              const isFollower = followersData.followers?.some(
                (f) => f.user_uuid === currentUser.user_uuid
              );
              setIsFollowing(isFollower);
              setFollowStatus(isFollower ? "accepted" : "");
            }
          } catch (err) {
            console.warn("Follow status fetch error:", err);
            // Fallback
            const isFollower = followersData.followers?.some(
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
        setFollowers([]);
        setFollowing([]);
      } finally {
        setLoading(false);
      }
    };
    verifySessionAndFetch();
  }, [router.isReady, userId, currentUser]);

  const handlePrivacyToggle = async () => {
    if (
      !currentUser ||
      (currentUser.user_uuid !== userId && effectiveId !== "me")
    ) {
      router.push("/login");
      return;
    }
    const newPrivacy = privacy === "public" ? "private" : "public";
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
      router.push("/login");
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
        // Refresh followers and following
        const followersResponse = await fetch(
          `http://localhost:8080/api/followers/${userId}`,
          {
            method: "GET",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
          }
        );
        const followersData = await followersResponse.json();
        if (followersData.success) {
          setFollowers(followersData.followers || []);
        }
        const followingResponse = await fetch(
          `http://localhost:8080/api/following/${userId}`,
          {
            method: "GET",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
          }
        );
        const followingData = await followingResponse.json();
        if (followingData.success) {
          setFollowing(followingData.following || []);
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
    setFollowers([]);
    setFollowing([]);
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
        <button onClick={handleRetry} className={styles.retryButton}>
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
    <div className={styles.profileContainer}>
      <h2>{displayName}'s Profile</h2>
      <div className={styles.profileInfo}>
        {profile.avatar && (
          <img
            src={`http://localhost:8080${profile.avatar}`}
            alt={`${displayName}'s avatar`}
            className={styles.profileAvatar}
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
              className={styles.privacyButton}
              onClick={handlePrivacyToggle}
              aria-label={`Make profile ${privacy === "public" ? "private" : "public"}`}
            >
              Make Profile {privacy === "public" ? "Private" : "Public"}
            </button>
          </div>
        )}
        {!isOwnProfile && currentUser && (
          <button
            onClick={handleFollowToggle}
            className={styles.followButton}
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
          <div className={styles.profilePosts}>
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
          <div className={styles.profileFollowers}>
            {console.log("Rendering followers:", followers)}
            <h3>Followers ({followers?.length || 0})</h3>
            {followers?.length > 0 ? (
              <ul>
                {followers.map((follower) => (
                  <li key={follower.user_uuid}>
                    <Link href={`/profile/${follower.user_uuid}`}>
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
          <div className={styles.profileFollowing}>
            {console.log("Rendering following:", following)}
            <h3>Following ({following?.length || 0})</h3>
            {following?.length > 0 ? (
              <ul>
                {following.map((follow) => (
                  <li key={follow.user_uuid}>
                    <Link href={`/profile/${follow.user_uuid}`}>
                      {follow.first_name || follow.user_uuid}{" "}
                      {follow.last_name || ""}
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
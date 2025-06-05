import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { fetchProfile, updateProfilePrivacy } from '../api/profile';
import './ProfilePage.css';

const ProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  console.log('Current User Object:', currentUser);

  // Check if the path is /profile/me since id might not be set by useParams for exact route
  const isMeRoute = location.pathname === '/profile/me';
  const effectiveId = id || (isMeRoute ? 'me' : undefined);

  const userId = effectiveId === 'me' ? currentUser?.user_uuid : effectiveId;
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followStatus, setFollowStatus] = useState('');
  const [privacy, setPrivacy] = useState('public');

  useEffect(() => {
    const loadProfile = async () => {
      if (!userId) {
        setError('Invalid user ID');
        setLoading(false);
        return;
      }
      try {
        const data = await fetchProfile(userId);
        setProfile(data.profile);
        setPrivacy(data.profile.privacy || 'public');

        // Check follow status if not own profile
        if (currentUser && currentUser.user_id !== userId && id !== 'me') {
          const followResponse = await fetch(
            `http://localhost:8080/api/follow/status/${userId}`,
            {
              credentials: 'include',
            }
          );
          const followData = await followResponse.json();
          if (followData.success) {
            setIsFollowing(followData.isFollowing);
            setFollowStatus(followData.status || '');
          }
        }
      } catch (err) {
        setError(err.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [userId, currentUser, id]);

  const handlePrivacyChange = async (e) => {
    const newPrivacy = e.target.value;
    setPrivacy(newPrivacy);
    try {
      await updateProfilePrivacy(newPrivacy);
      setProfile({ ...profile, privacy: newPrivacy });
    } catch (err) {
      setError(err.message || 'Failed to update privacy');
    }
  };

  const handlePrivacyToggle = async () => {
    if (!currentUser || (currentUser.user_uuid !== userId && effectiveId !== 'me')) return;

    const newPrivacy = profile.privacy === 'public' ? 'private' : 'public';
    try {
      const response = await fetch('http://localhost:8080/api/profile/privacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privacy: newPrivacy }),
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        setProfile({ ...profile, privacy: newPrivacy });
        setPrivacy(newPrivacy);
        if (currentUser.user_uuid === userId || effectiveId === 'me') {
          // Update currentUser if it's the user's own profile
          // Assuming AuthContext provides a way to update currentUser, though it might not be directly available
        }
      } else {
        setError(data.message || 'Failed to update privacy');
      }
    } catch (err) {
      setError('Error updating privacy');
    }
  };

  const handleFollowToggle = async () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    try {
      const response = await fetch(`http://localhost:8080/api/follow/${userId}`, {
        method: isFollowing ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        setIsFollowing(data.status === 'pending' || data.status === 'accepted');
        setFollowStatus(data.status || '');
      } else {
        setError(data.message || 'Failed to update follow status');
      }
    } catch (err) {
      setError('Error updating follow status');
    }
  };

  if (loading) return <div className="text-center mt-10">Loading...</div>;
  if (error) return <div className="text-center mt-10 text-red-500">Error: {error}</div>;
  if (!profile) return <div className="text-center mt-10">Profile not found</div>;

  const isOwnProfile = currentUser && (currentUser.user_uuid === userId || effectiveId === 'me');
  console.log('Debug - isOwnProfile:', isOwnProfile);
  console.log('Debug - currentUser.user_uuid:', currentUser?.user_uuid);
  console.log('Debug - userId:', userId);
  console.log('Debug - effectiveId:', effectiveId);

  // Format date_of_birth
  const formattedDateOfBirth = profile.date_of_birth
    ? new Date(profile.date_of_birth).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  return (
    <div className="profile-container">
      <h2>{profile.first_name} {profile.last_name}'s Profile</h2>
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
                <span>{formattedDateOfBirth}</span>
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
                <span>{new Date(profile.created_at).toLocaleDateString()}</span>
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
            <button className="privacy-button" onClick={handlePrivacyToggle} aria-label={`Make profile ${profile.privacy === 'public' ? 'private' : 'public'}`}
              tabIndex="0">
              Make Profile {profile.privacy === 'public' ? 'Private' : 'Public'}
            </button>
          </div>
        )}
        {!isOwnProfile && (
          <button
            onClick={handleFollowToggle}
            className="follow-button"
          >
            {isFollowing
              ? followStatus === 'pending'
                ? 'Cancel Follow Request'
                : 'Unfollow'
              : 'Follow'}
          </button>
        )}
      </div>
      {profile.email && (
        <>
          <div className="profile-posts">
            <h3>Posts</h3>
            <p>Coming soon...</p>
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
import React, { useState, useEffect, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import './ProfilePage.css';

const ProfilePage = () => {
  const { user_uuid } = useParams();
  const { currentUser, setCurrentUser } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followStatus, setFollowStatus] = useState('');

  useEffect(() => {
    if (!user_uuid) {
      setError('Invalid user ID');
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchProfile = async () => {
      try {
        const endpoint = user_uuid === 'me' ? 'http://localhost:8080/api/profile/me' : `http://localhost:8080/api/profile/${user_uuid}`;
        const response = await fetch(endpoint, {
          credentials: 'include',
        });
        const data = await response.json();
        if (!isMounted) return;

        if (!data.success) {
          setError(data.message || 'Failed to load profile');
          return;
        }
        setProfile(data);

        // Check follow status if not own profile
        if (currentUser && currentUser.user_uuid !== user_uuid && user_uuid !== 'me') {
          const followResponse = await fetch(
            `http://localhost:8080/api/follow/status/${user_uuid}`,
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
        if (isMounted) {
          setError(err.message || 'Error fetching profile');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchProfile();

    return () => {
      isMounted = false;
    };
  }, [user_uuid, currentUser]);

  const handlePrivacyToggle = async () => {
    if (!currentUser || (currentUser.user_uuid !== user_uuid && user_uuid !== 'me')) return;

    const newPrivacy = profile.profile.privacy === 'public' ? 'private' : 'public';
    try {
      const response = await fetch('http://localhost:8080/api/profile/privacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privacy: newPrivacy }),
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        setProfile({ ...profile, profile: { ...profile.profile, privacy: newPrivacy } });
        if (currentUser.user_uuid === user_uuid || user_uuid === 'me') {
          setCurrentUser({ ...currentUser, privacy: newPrivacy });
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
      window.location.href = '/login';
      return;
    }
    try {
      const response = await fetch(`http://localhost:8080/api/follow/${user_uuid}`, {
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

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!profile) return <div>Profile not found</div>;

  const isOwnProfile = currentUser && (currentUser.user_uuid === user_uuid || user_uuid === 'me');

  // Format date_of_birth
  const formattedDateOfBirth = profile.profile.date_of_birth
    ? new Date(profile.profile.date_of_birth).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  return (
    <div className="profile-container">
      <h2>{profile.profile.first_name} {profile.profile.last_name}'s Profile</h2>
      <div className="profile-info">
        {profile.profile.avatar && (
          <img
            src={`http://localhost:8080${profile.profile.avatar}`}
            alt={`${profile.profile.first_name}'s avatar`}
            className="profile-avatar"
          />
        )}
        {profile.profile.email && (
          <>
            <p><strong>Email:</strong> {profile.profile.email}</p>
            {profile.profile.date_of_birth && (
              <p><strong>Date of Birth:</strong> {formattedDateOfBirth}</p>
            )}
            {profile.profile.nickname && (
              <p><strong>Nickname:</strong> {profile.profile.nickname}</p>
            )}
            {profile.profile.about_me && (
              <p><strong>About Me:</strong> {profile.profile.about_me}</p>
            )}
            {profile.profile.role && (
              <p><strong>Role:</strong> {profile.profile.role}</p>
            )}
            {profile.profile.created_at && (
              <p><strong>Joined:</strong> {new Date(profile.profile.created_at).toLocaleDateString()}</p>
            )}
          </>
        )}
        <p><strong>Privacy:</strong> {profile.profile.privacy}</p>
        {isOwnProfile && (
          <button className="privacy-button" onClick={handlePrivacyToggle}>
            Make Profile {profile.profile.privacy === 'public' ? 'Private' : 'Public'}
          </button>
        )}
        {!isOwnProfile && (
          <button className="follow-button" onClick={handleFollowToggle}>
            {isFollowing
              ? followStatus === 'pending'
                ? 'Cancel Follow Request'
                : 'Unfollow'
              : 'Follow'}
          </button>
        )}
      </div>
      {profile.profile.email && (
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
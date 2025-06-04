import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import './ProfilePage.css';

const ProfilePage = () => {
  const { user_uuid } = useParams();
  const { currentUser, setCurrentUser } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user_uuid) {
      setError('Invalid user UUID');
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
        console.log('Profile API response:', data);
        if (!isMounted) return;

        if (!data.success) {
          setError(data.message || 'Failed to load profile');
          return;
        }
        setProfile(data);
      } catch (err) {
        if (isMounted) {
          console.error('Profile fetch error:', err.message);
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
        method: profile.is_following ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        setProfile({
          ...profile,
          is_following: data.status === 'pending' || data.status === 'accepted',
          follow_status: data.status || '',
        });
      } else {
        setError(data.message || 'Failed to update follow status');
      }
    } catch (err) {
      setError('Error updating follow status');
    }
  };

  const handleRetry = () => {
    setError('');
    setLoading(true);
    setProfile(null);
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return (
    <div className="error">
      Error: {error}
      <button onClick={handleRetry} className="retry-button">Retry</button>
    </div>
  );
  if (!profile) return <div className="error">Profile not found</div>;

  const isOwnProfile = currentUser && (currentUser.user_uuid === user_uuid || user_uuid === 'me');

  // Format date_of_birth
  const formattedDateOfBirth = profile.profile?.date_of_birth
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
        {profile.profile?.avatar && (
          <img
            src={`http://localhost:8080${profile.profile.avatar}`}
            alt={`${profile.profile.nickname || profile.profile.first_name}'s avatar`}
            className="profile-avatar"
          />
        )}
        {profile.profile?.email ? (
          <>
            <p><strong>Email:</strong> {profile.profile.email}</p>
            {formattedDateOfBirth && (
              <p><strong>Date of Birth:</strong> {formattedDateOfBirth}</p>
            )}
            {profile.profile?.nickname && (
              <p><strong>Username:</strong> {profile.profile.nickname}</p>
            )}
            {profile.profile?.about_me && (
              <p><strong>About Me:</strong> {profile.profile.about_me}</p>
            )}
            {profile.profile?.role && (
              <p><strong>Role:</strong> {profile.profile.role}</p>
            )}
            {profile.profile?.created_at && (
              <p><strong>Joined:</strong> {new Date(profile.profile.created_at).toLocaleDateString()}</p>
            )}
          </>
        ) : (
          <p>Limited profile view</p>
        )}
        <p><strong>Privacy:</strong> {profile.profile?.privacy}</p>
        {isOwnProfile ? (
          <button className="privacy-button" onClick={handlePrivacyToggle}>
            Make Profile {profile.profile?.privacy === 'public' ? 'Private' : 'Public'}
          </button>
        ) : (
          currentUser && (
            <button className="follow-button" onClick={handleFollowToggle}>
              {profile.is_following
                ? profile.follow_status === 'pending'
                  ? 'Cancel Follow Request'
                  : 'Unfollow'
                : 'Follow'}
            </button>
          )
        )}
      </div>
      {profile.profile?.email && (
        <>
          <div className="profile-posts">
            <h3>Posts</h3>
            <p>Coming soon...</p>
          </div>
          <div className="profile-followers">
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
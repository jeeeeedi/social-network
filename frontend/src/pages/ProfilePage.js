import React, { useState, useEffect, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import './ProfilePage.css'; // Adjust if in pages/

const ProfilePage = () => {
  const { user_uuid } = useParams();
  const { currentUser, setCurrentUser } = useContext(AuthContext); // Updated to currentUser
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user_uuid) {
      setError('Invalid user ID');
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchProfile = async () => {
      try {
        const response = await fetch(`http://localhost:8080/api/profile/${user_uuid}`, {
          credentials: 'include',
        });
        const data = await response.json();
        if (!isMounted) return;

        if (!data.success) {
          setError(data.message || 'Failed to load profile');
          return;
        }
        setProfile(data);
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
  }, [user_uuid]);

  const handlePrivacyToggle = async () => {
    if (!currentUser || currentUser.user_uuid !== user_uuid) return;

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
        if (currentUser.user_uuid === user_uuid) {
          setCurrentUser({ ...currentUser, privacy: newPrivacy });
        }
      } else {
        setError(data.message || 'Failed to update privacy');
      }
    } catch (err) {
      setError('Error updating privacy');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!profile) return <div>Profile not found</div>;

  const isOwnProfile = currentUser && currentUser.user_uuid === user_uuid;

  return (
    <div className="profile-container">
      <h2>{profile.profile.first_name} {profile.profile.last_name}'s Profile</h2>
      <div className="profile-info">
        {profile.profile.avatar && (
          <img
            src={`http://localhost:8080${profile.profile.avatar}`}
            alt="Avatar"
            className="profile-avatar"
          />
        )}
        <p><strong>Email:</strong> {profile.profile.email}</p>
        <p><strong>Nickname:</strong> {profile.profile.nickname || 'N/A'}</p>
        <p><strong>About Me:</strong> {profile.profile.about_me || 'N/A'}</p>
        <p><strong>Date of Birth:</strong> {profile.profile.date_of_birth}</p>
        <p><strong>Privacy:</strong> {profile.profile.privacy}</p>
        <p><strong>Role:</strong> {profile.profile.role}</p>
        <p><strong>Joined:</strong> {new Date(profile.profile.created_at).toLocaleDateString()}</p>
        {isOwnProfile && (
          <button onClick={handlePrivacyToggle}>
            Make Profile {profile.profile.privacy === 'public' ? 'Private' : 'Public'}
          </button>
        )}
      </div>
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
    </div>
  );
};

export default ProfilePage;
import React, { useState, useEffect, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { fetchProfile, updateProfilePrivacy } from '../api/profile';

const ProfilePage = () => {
  const { user_uuid } = useParams();
  const { currentUser, setCurrentUser } = useContext(AuthContext);
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

    const loadProfile = async () => {
      try {
        const data = await fetchProfile(user_uuid);
        if (!isMounted) return;
        setProfile(data);
      } catch (err) {
        if (isMounted) setError(err.message || 'Error fetching profile');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [user_uuid]);

  const handlePrivacyToggle = async () => {
    if (!currentUser || currentUser.user_uuid !== user_uuid) return;

    const newPrivacy = profile.profile.privacy === 'public' ? 'private' : 'public';
    try {
      await updateProfilePrivacy(newPrivacy);
      setProfile({ ...profile, profile: { ...profile.profile, privacy: newPrivacy } });
      if (currentUser.user_uuid === user_uuid) {
        setCurrentUser({ ...currentUser, privacy: newPrivacy });
      }
    } catch (err) {
      setError(err.message || 'Error updating privacy');
    }
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;
  if (error) return <div className="text-red-500 text-center py-8">Error: {error}</div>;
  if (!profile) return <div className="text-center py-8">Profile not found</div>;

  const isOwnProfile = currentUser && currentUser.user_uuid === user_uuid;

  return (
    <>
      <div className="max-w-2xl mx-auto p-5">
        <h2 className="text-2xl font-bold mb-4">
          {profile.profile.first_name} {profile.profile.last_name}'s Profile
        </h2>
        <div className="border rounded p-5">
          {profile.profile.avatar && (
            <img
              src={`http://localhost:8080${profile.profile.avatar}`}
              alt="Avatar"
              className="max-w-[150px] rounded-full mb-4"
            />
          )}
          <p className="mb-2"><strong>Email:</strong> {profile.profile.email}</p>
          <p className="mb-2"><strong>Nickname:</strong> {profile.profile.nickname || 'N/A'}</p>
          <p className="mb-2"><strong>About Me:</strong> {profile.profile.about_me || 'N/A'}</p>
          <p className="mb-2"><strong>Date of Birth:</strong> {profile.profile.date_of_birth}</p>
          <p className="mb-2"><strong>Privacy:</strong> {profile.profile.privacy}</p>
          <p className="mb-2"><strong>Role:</strong> {profile.profile.role}</p>
          <p className="mb-2"><strong>Joined:</strong> {new Date(profile.profile.created_at).toLocaleDateString()}</p>
          {isOwnProfile && (
            <button
              onClick={handlePrivacyToggle}
              className="bg-blue-500 hover:bg-blue-700 text-white py-2 px-4 rounded mt-4"
            >
              Make Profile {profile.profile.privacy === 'public' ? 'Private' : 'Public'}
            </button>
          )}
        </div>
        <div className="border rounded p-5 mt-5">
          <h3 className="text-xl font-semibold mb-2">Posts</h3>
          <p className="text-gray-600">Coming soon...</p>
        </div>
        <div className="border rounded p-5 mt-5">
          <h3 className="text-xl font-semibold mb-2">Followers</h3>
          <p className="text-gray-600">Coming soon...</p>
        </div>
        <div className="border rounded p-5 mt-5">
          <h3 className="text-xl font-semibold mb-2">Following</h3>
          <p className="text-gray-600">Coming soon...</p>
        </div>
      </div>
    </>
  );
};

export default ProfilePage;
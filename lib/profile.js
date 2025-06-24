const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const fetchProfile = async (userId) => {
  const response = await fetch(`${API_URL}/profile/${userId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.message || 'Failed to load profile');
  }
  return data;
};

export const updateProfilePrivacy = async (privacy) => {
  const response = await fetch(`${API_URL}/profile/privacy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ privacy }),
    credentials: 'include',
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.message || 'Failed to update privacy');
  }
  return data;
};
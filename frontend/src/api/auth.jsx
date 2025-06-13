const API_URL = 'http://localhost:8080/api';

export const registerUser = async (formData) => {
  const response = await fetch(`${API_URL}/register`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  if (!response.ok) {
    throw new Error((data && data.message) || data || 'Registration failed');
  }
  if (data && data.success === false) {
    throw new Error(data.message || 'Registration failed');
  }
  return data;
};

export const loginUser = async ({ email, password }) => {
  
  const response = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include',
  });
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error(`Server returned non-JSON response: ${text}`);
  }
  if (!response.ok) {
    throw new Error((data && data.message) || text || 'Login failed');
  }
  if (!data.success) {
    throw new Error(data.message || 'Login failed');
  }
  return data.user;
};

export const logoutUser = async () => {
  const response = await fetch(`${API_URL}/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  if (!response.ok || (data && !data.success)) {
    throw new Error((data && data.message) || 'Logout failed');
  }
  return data;
};

export const checkSession = async () => {
  const response = await fetch(`${API_URL}/session-check`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  if (!response.ok || (data && !data.success)) {
    throw new Error((data && data.message) || 'Session check failed');
  }
  return data.user;
};
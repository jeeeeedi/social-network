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
  const data = await response.json();
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
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Logout failed');
  }
};

export const checkSession = async () => {
  const response = await fetch(`${API_URL}/session-check`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.message || 'Session check failed');
  }
  return data.user;
};
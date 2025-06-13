export const uploadImage = async (file, userId) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('uploader_id', userId);

  const res = await fetch('http://localhost:8080/api/upload', {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Image upload failed');
  const data = await res.json();
  return data.url; // e.g., "/uploads/filename.jpg"
};

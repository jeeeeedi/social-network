import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { validateRegister } from '../utils/validate';
import { registerUser } from '../api/auth';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    dob: '',
    nickname: '',
    aboutMe: '',
    avatar: null,
  });
  const [errors, setErrors] = useState({});
  const { error } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setFormData({ ...formData, avatar: file });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validateRegister(formData);
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    const submitData = new FormData();
    submitData.append('email', formData.email);
    submitData.append('password', formData.password);
    submitData.append('firstName', formData.firstName);
    submitData.append('lastName', formData.lastName);
    submitData.append('dob', formData.dob);
    if (formData.nickname) submitData.append('nickname', formData.nickname);
    if (formData.aboutMe) submitData.append('aboutMe', formData.aboutMe);
    if (formData.avatar) submitData.append('avatar', formData.avatar);

    try {
      await registerUser(submitData);
      navigate('/login');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md mx-auto mt-10">
      <h2 className="text-2xl font-bold text-center mb-4">Register</h2>
      {error && <p className="text-red-500 text-center mb-4">{error}</p>}
      <form onSubmit={handleSubmit} encType="multipart/form-data" className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.email ? 'border-red-500' : ''}`}
          />
          {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.password ? 'border-red-500' : ''}`}
          />
          {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}
        </div>
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium">First Name</label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.firstName ? 'border-red-500' : ''}`}
          />
          {errors.firstName && <p className="text-red-500 text-sm">{errors.firstName}</p>}
        </div>
        <div>
          <label htmlFor="lastName" className="block text-sm font-medium">Last Name</label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.lastName ? 'border-red-500' : ''}`}
          />
          {errors.lastName && <p className="text-red-500 text-sm">{errors.lastName}</p>}
        </div>
        <div>
          <label htmlFor="dob" className="block text-sm font-medium">Date of Birth</label>
          <input
            type="date"
            id="dob"
            name="dob"
            value={formData.dob}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.dob ? 'border-red-500' : ''}`}
          />
          {errors.dob && <p className="text-red-500 text-sm">{errors.dob}</p>}
        </div>
        <div>
          <label htmlFor="nickname" className="block text-sm font-medium">Nickname (Optional)</label>
          <input
            type="text"
            id="nickname"
            name="nickname"
            value={formData.nickname}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label htmlFor="aboutMe" className="block text-sm font-medium">About Me (Optional)</label>
          <textarea
            id="aboutMe"
            name="aboutMe"
            value={formData.aboutMe}
            onChange={handleChange}
            rows={4}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          ></textarea>
        </div>
        <div>
          <label htmlFor="avatar" className="block text-sm font-medium">Avatar (Optional, JPEG/PNG/GIF)</label>
          <input
            type="file"
            id="avatar"
            name="avatar"
            accept=".jpg,.jpeg,.png,.gif"
            onChange={handleFileChange}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none ${errors.avatar ? 'border-red-500' : ''}`}
          />
          {errors.avatar && <p className="text-red-500 text-sm">{errors.avatar}</p>}
        </div>
        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600"
        >
          Register
        </button>
      </form>
    </div>
  );
};

export default RegisterPage;
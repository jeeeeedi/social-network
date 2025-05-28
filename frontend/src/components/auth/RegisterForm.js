import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import RegisterFormUI from './RegisterFormUI';

const RegisterForm = () => {
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
  const { registerNewUser, error } = useContext(AuthContext);
  const navigate = useNavigate();

  // Handle input changes
  const handleInputUpdate = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Handle file input change
  const handleFileUpdate = (e) => {
    const file = e.target.files?.[0] || null;
    setFormData({
      ...formData,
      avatar: file,
    });
  };

  // Validate form
  const validate = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }
    if (!formData.firstName) {
      newErrors.firstName = 'First Name is required';
    }
    if (!formData.lastName) {
      newErrors.lastName = 'Last Name is required';
    }
    if (!formData.dob) {
      newErrors.dob = 'Date of Birth is required';
    }
    if (formData.avatar) {
      const ext = formData.avatar.name.toLowerCase().split('.').pop();
      if (!['jpg', 'jpeg', 'png', 'gif'].includes(ext)) {
        newErrors.avatar = 'Only JPEG, PNG, and GIF files are allowed';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

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
    // Call register function from AuthContext
      await registerNewUser(submitData);
      navigate('/login'); // Switch to login view
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <RegisterFormUI
      formData={formData}
      errors={errors}
      error={error}
      handleChange={handleInputUpdate}
      handleFileChange={handleFileUpdate}
      handleSubmit={handleSubmit}
    />
  );
};

export default RegisterForm;
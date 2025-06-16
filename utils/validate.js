export const validateLogin = ({ email, password }) => {
    const errors = {};
    if (!email) errors.email = 'Email is required';
    if (!password) errors.password = 'Password is required';
    return errors;
  };
  
  export const validateRegister = ({ email, password, firstName, lastName, dob, avatar }) => {
    const errors = {};
    if (!email) errors.email = 'Email is required';
    if (!password) errors.password = 'Password is required';
    if (!firstName) errors.firstName = 'First Name is required';
    if (!lastName) errors.lastName = 'Last Name is required';
    if (!dob) errors.dob = 'Date of Birth is required';
    if (avatar) {
      const ext = avatar.name.toLowerCase().split('.').pop();
      if (!['jpg', 'jpeg', 'png', 'gif'].includes(ext)) {
        errors.avatar = 'Only JPEG, PNG, and GIF files are allowed';
      }
    }
    return errors;
  };
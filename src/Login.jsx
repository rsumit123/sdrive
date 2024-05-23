import React, { useState } from 'react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');


   const loginUser = async (email, password) => {
    try {
        const response = await axios.post('http://localhost:8000/api/login/', {
        email,
        password
        });
        if (response.data.token) {
        localStorage.setItem('token', response.data.token);  // Save token to local storage
        return response.data;
        }
    } catch (error) {
        console.error('Login error:', error.response.data);
        throw error;
    }
    };
    
    const logoutUser = () => {
        localStorage.removeItem('token');  // Remove the stored token
        // Additional actions like redirecting the user or refreshing the state can be performed here
      };
      


  const handleLogin = async () => {
    try {
      await loginUser(email, password);
      console.log('Logged in successfully!');
      // Redirect or perform additional actions
    } catch (error) {
      console.error('Failed to log in');
    }
  };

  return (
    <div>
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />
      <button onClick={handleLogin}>Log In</button>
    </div>
  );
};

export default Login;

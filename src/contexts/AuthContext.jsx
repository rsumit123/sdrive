// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import axiosS3 from '../axioS3'; // Import the S3 axios instance
// import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Add loading state
  
  useEffect(() => {
    const checkAuthStatus = async () => {
      console.log("AuthContext: Starting auth check..."); // Log start
      const token = localStorage.getItem('authToken'); // Use 'authToken' instead of 'token'
      console.log("AuthContext: Token found in localStorage:", token ? "Yes" : "No"); // Log token found
      
      if (token) {
        setUser({ token });
        console.log("AuthContext: User state SET based on token presence.");
      } else {
        setUser(null);
        console.log("AuthContext: User state set to NULL because no token found.");
      }
      
      console.log("AuthContext: FINISHED auth check. Setting loading to false."); // Log before setting loading false
      setLoading(false);
    };
    
    checkAuthStatus();
  }, []);

  // Note: We don't need a separate interceptor here because App.jsx already has a global
  // axios interceptor that reads from localStorage directly, which is more reliable.

  const register = async (email, password) => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/auth/register/`, {
        email,
        password
      });
      // Don't automatically log in - user needs to verify email first
      // The backend will send a verification email, and we'll only log them in after verification
      // If the backend returns a token immediately (for testing), we can optionally handle that,
      // but typically registration should require email verification first
      return response.data;
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const login = (token) => {
    // Simplified login that just accepts a token
    localStorage.setItem('authToken', token); // Use 'authToken'
    setUser({ token });
  };

  const logout = () => {
    localStorage.removeItem('authToken'); // Use 'authToken'
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
};

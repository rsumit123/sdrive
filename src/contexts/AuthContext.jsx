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
      if (response.data.token) {
        localStorage.setItem('authToken', response.data.token); // Use 'authToken'
        setUser({ email, token: response.data.token });
        return response.data; // Optional: return data in case it needs to be used
      }
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

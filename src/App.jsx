// src/App.jsx
import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import FileUpload from './components/FileUpload';
import Login from './components/Login';
import Auth from './components/Auth';
import axios from 'axios';

function AppContent() {
  const { user } = useAuth();

  if (!user) {
    return <Auth />;
  }

  return <FileUpload />;
}
// Setting up Axios Interceptors in App.jsx or a dedicated setup file
axios.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Token ${token}`;  // Ensure the header is correctly set
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

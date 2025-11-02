// src/App.jsx
import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import FileUpload from './components/FileUpload';
import CmdLineUpload from './components/CmdLineUpload';
import Auth from './components/Auth';
import EmailVerification from './components/EmailVerification';
import axios from 'axios';

// This component now handles the conditional rendering based on showCmdUpload
function MainApp() {
  const [showCmdUpload, setShowCmdUpload] = useState(false);
  if (showCmdUpload) {
    return <CmdLineUpload setShowCmdUpload={setShowCmdUpload} />;
  }
  return <FileUpload setShowCmdUpload={setShowCmdUpload} />;
}

// ProtectedRoute component to guard the main application
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    // While auth state is loading, render nothing or a loading spinner
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>; // Or return null, or a proper spinner component
  }

  if (!user) {
    // If not loading and user is not authenticated, redirect to login page
    return <Navigate to="/login" replace />;
  }

  // If not loading and user is authenticated, render the children
  return children;
}

// The AppContent component now simply defines the routes
function AppContent() {
  return (
    <Routes>
      <Route path="/login" element={<Auth />} />
      <Route path="/verify-email" element={<EmailVerification />} />
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <MainApp />
          </ProtectedRoute>
        }
      />
      {/* Add other routes here if needed */}
      <Route path="*" element={<Navigate to="/" replace />} /> {/* Optional: Redirect unknown paths to home */}
    </Routes>
  );
}

// Setting up Axios Interceptors in App.jsx or a dedicated setup file
axios.interceptors.request.use(
  config => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;  // Use Bearer instead of Token
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Update the response interceptor to redirect to /login
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      console.error('Global Axios interceptor caught auth error:', error.response.status);
      const currentToken = localStorage.getItem('authToken');
      if (currentToken) {
          localStorage.removeItem('authToken');
          // Redirect to the /login route
          window.location.replace('/login'); 
      }
    }
    return Promise.reject(error); 
  }
);

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>  {/* Wrap with BrowserRouter */}
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

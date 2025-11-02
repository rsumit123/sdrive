import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import axios from 'axios';

function EmailVerification() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verificationStatus, setVerificationStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [error, setError] = useState('');
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setVerificationStatus('error');
      setError('Verification token is missing. Please check your email for the complete verification link.');
      return;
    }

    verifyEmail(token);
  }, [token]);

  const verifyEmail = async (verificationToken) => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/auth/verify-email/`,
        { token: verificationToken }
      );

      if (response.status === 200) {
        setVerificationStatus('success');
      } else {
        setVerificationStatus('error');
        setError('Verification failed. Please try again.');
      }
    } catch (err) {
      setVerificationStatus('error');
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Verification failed. The link may have expired. Please request a new verification email.'
      );
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: { xs: 2, sm: 3 },
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={24}
          sx={{
            padding: { xs: 3, sm: 4 },
            borderRadius: 3,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(10px)',
            textAlign: 'center',
          }}
        >
          <Box
            sx={{
              mb: 3,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                backgroundColor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}
            >
              <CloudUploadIcon sx={{ color: 'white', fontSize: 32 }} />
            </Box>

            {verificationStatus === 'verifying' && (
              <>
                <CircularProgress size={48} sx={{ mb: 2 }} />
                <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                  Verifying Email...
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Please wait while we verify your email address.
                </Typography>
              </>
            )}

            {verificationStatus === 'success' && (
              <>
                <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
                <Typography 
                  variant="h4" 
                  sx={{ 
                    fontWeight: 700,
                    mb: 1,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Email Verified!
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  Your email has been successfully verified. You can now sign in to your account.
                </Typography>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => navigate('/login')}
                  sx={{
                    py: 1.5,
                    borderRadius: 2,
                    fontSize: '1rem',
                    fontWeight: 600,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
                    '&:hover': {
                      boxShadow: '0 6px 16px rgba(102, 126, 234, 0.5)',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    },
                  }}
                >
                  Go to Sign In
                </Button>
              </>
            )}

            {verificationStatus === 'error' && (
              <>
                <ErrorIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
                <Typography variant="h5" sx={{ fontWeight: 600, mb: 2, color: 'error.main' }}>
                  Verification Failed
                </Typography>
                {error && (
                  <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
                    {error}
                  </Alert>
                )}
                <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => navigate('/login')}
                    sx={{
                      borderRadius: 2,
                    }}
                  >
                    Go to Sign In
                  </Button>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => navigate('/register')}
                    sx={{
                      borderRadius: 2,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    }}
                  >
                    Register Again
                  </Button>
                </Box>
              </>
            )}
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}

export default EmailVerification;


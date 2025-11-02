import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  TextField, 
  Button, 
  Typography, 
  Box, 
  CircularProgress,
  Paper,
  Alert,
  InputAdornment,
  IconButton,
  Link as MUILink
} from '@mui/material';
import { Link } from 'react-router-dom';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import CloudIcon from '@mui/icons-material/Cloud';
import EmailIcon from '@mui/icons-material/Email';

function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [emailError, setEmailError] = useState('');
  const { register } = useAuth();

  // Basic email validation
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    
    if (value && !validateEmail(value)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError('');
    }
  };

  const handleRegister = async (event) => {
    event?.preventDefault();
    setError('');
    setEmailError('');
    
    // Validate email format
    if (!email) {
      setEmailError('Email is required');
      return;
    }
    
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    try {
      setLoading(true);
      await register(email, password);
      setSuccess(true);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Registration failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #4f6ddf 0%, #6f49d6 100%)',
        padding: { xs: 1.5, sm: 3 },
      }}
    >
      <Box sx={{ width: '100%', maxWidth: { xs: '100%', sm: '448px' }, mx: 'auto' }}>
        <Paper
          elevation={0}
          sx={{
            padding: { xs: 3, sm: 4 },
            borderRadius: 3,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: 'white',
            border: '1px solid #f1f5f9',
            boxShadow: '0 10px 30px rgba(15, 23, 42, 0.1)',
            position: 'relative',
          }}
        >
          <Box
            sx={{
              mb: 3,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              mt: { xs: -2, sm: -4 },
            }}
          >
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                backgroundColor: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2,
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
              }}
            >
              <CloudIcon sx={{ color: 'white', fontSize: 28 }} />
            </Box>
            <Typography 
              component="h1" 
              variant="h5"
              sx={{ 
                fontWeight: 600,
                fontSize: { xs: '1.5rem', sm: '1.75rem' },
                mb: 0.5,
                color: '#0f172a',
                textAlign: 'center',
              }}
            >
              Create Account
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.875rem', textAlign: 'center' }}>
              Start storing your files today
            </Typography>
          </Box>

          {success ? (
            <Box sx={{ width: '100%', mt: 1, textAlign: 'center' }}>
              <Box
                sx={{
                  mb: 3,
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                <EmailIcon sx={{ fontSize: 64, color: 'primary.main' }} />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
                Check Your Email!
              </Typography>
              <Alert 
                severity="success" 
                sx={{ 
                  mb: 3,
                  borderRadius: 2,
                  textAlign: 'left',
                }}
              >
                <Typography variant="body1" sx={{ mb: 1 }}>
                  We've sent a verification email to <strong>{email}</strong>
                </Typography>
                <Typography variant="body2">
                  Please click the link in the email to verify your account before signing in. 
                  The verification link will expire in 24 hours.
                </Typography>
              </Alert>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Didn't receive the email? Check your spam folder or try registering again.
              </Typography>
            </Box>
          ) : (
            <Box component="form" noValidate onSubmit={handleRegister} sx={{ width: '100%', mt: 1 }}>
              {error && (
                <Alert 
                  severity="error" 
                  sx={{ 
                    mb: 3,
                    borderRadius: 2,
                    width: '100%',
                  }}
                >
                  {error}
                </Alert>
              )}
              
              <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  variant="outlined"
                  required
                  fullWidth
                  id="email"
                  label="Email Address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={handleEmailChange}
                  error={!!emailError}
                  helperText={emailError}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 3,
                      backgroundColor: '#f8fafc',
                      height: 44,
                      '& fieldset': {
                        borderColor: '#e2e8f0',
                      },
                      '&:hover fieldset': {
                        borderColor: '#cbd5e1',
                      },
                      '&.Mui-focused': {
                        '& fieldset': {
                          borderColor: '#6366f1',
                          borderWidth: '2px',
                        },
                        boxShadow: '0 0 0 2px rgba(99, 102, 241, 0.1)',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      fontSize: '0.875rem',
                    },
                  }}
                />
              
                <TextField
                  variant="outlined"
                  required
                  fullWidth
                  name="password"
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 3,
                      backgroundColor: '#f8fafc',
                      height: 44,
                      '& fieldset': {
                        borderColor: '#e2e8f0',
                      },
                      '&:hover fieldset': {
                        borderColor: '#cbd5e1',
                      },
                      '&.Mui-focused': {
                        '& fieldset': {
                          borderColor: '#6366f1',
                          borderWidth: '2px',
                        },
                        boxShadow: '0 0 0 2px rgba(99, 102, 241, 0.1)',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      fontSize: '0.875rem',
                    },
                  }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          sx={{
                            width: 42,
                            height: 42,
                            mr: -1,
                            borderLeft: '1px solid #e2e8f0',
                            borderRadius: '0 12px 12px 0',
                          }}
                        >
                          {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              
                <TextField
                  variant="outlined"
                  required
                  fullWidth
                  name="confirmPassword"
                  label="Confirm Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 3,
                      backgroundColor: '#f8fafc',
                      height: 44,
                      '& fieldset': {
                        borderColor: '#e2e8f0',
                      },
                      '&:hover fieldset': {
                        borderColor: '#cbd5e1',
                      },
                      '&.Mui-focused': {
                        '& fieldset': {
                          borderColor: '#6366f1',
                          borderWidth: '2px',
                        },
                        boxShadow: '0 0 0 2px rgba(99, 102, 241, 0.1)',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      fontSize: '0.875rem',
                    },
                  }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle confirm password visibility"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          edge="end"
                          sx={{
                            width: 42,
                            height: 42,
                            mr: -1,
                            borderLeft: '1px solid #e2e8f0',
                            borderRadius: '0 12px 12px 0',
                          }}
                        >
                          {showConfirmPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={loading}
                  sx={{
                    mt: 1,
                    mb: 2,
                    height: 44,
                    borderRadius: 3,
                    fontSize: '0.938rem',
                    fontWeight: 500,
                    backgroundColor: '#2563eb',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    textTransform: 'none',
                    '&:hover': {
                      backgroundColor: '#1d4ed8',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    },
                    '&:disabled': {
                      backgroundColor: '#2563eb',
                      opacity: 0.7,
                    },
                  }}
                >
                  {loading ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    'Sign Up'
                  )}
                </Button>
              </Box>

              <Box sx={{ width: '100%', textAlign: 'center', mt: 1 }}>
                <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.813rem' }}>
                  Already have an account?{' '}
                  <MUILink
                    component={Link}
                    to="/login"
                    underline="hover"
                    sx={{
                      color: '#2563eb',
                      '&:hover': {
                        color: '#1d4ed8',
                      },
                    }}
                  >
                    Sign in
                  </MUILink>
                </Typography>
              </Box>
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
}

export default Register;

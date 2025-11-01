import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Container, 
  TextField, 
  Button, 
  Typography, 
  Box, 
  CircularProgress,
  Paper,
  Alert,
  InputAdornment,
  IconButton
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();

  const handleRegister = async (event) => {
    event?.preventDefault();
    setError('');
    
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
      alert('Registration successful. Please sign in.');
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
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: { xs: 2, sm: 3 },
      }}
    >
      <Container maxWidth="xs">
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
            <Typography 
              component="h1" 
              variant="h4" 
              sx={{ 
                fontWeight: 700,
                mb: 0.5,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textAlign: 'center',
              }}
            >
              Create Account
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
              Start storing your files today
            </Typography>
          </Box>

          <Box component="form" noValidate onSubmit={handleRegister} sx={{ width: '100%', mt: 1 }}>
            {error && (
              <Alert 
                severity="error" 
                sx={{ 
                  mb: 2,
                  borderRadius: 2,
                }}
              >
                {error}
              </Alert>
            )}
            
            <TextField
              variant="outlined"
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
                mb: 2,
              }}
            />
            
            <TextField
              variant="outlined"
              margin="normal"
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
                  borderRadius: 2,
                },
                mb: 2,
              }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            
            <TextField
              variant="outlined"
              margin="normal"
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
                  borderRadius: 2,
                },
                mb: 3,
              }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle confirm password visibility"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
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
                '&:disabled': {
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  opacity: 0.7,
                },
              }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                'Sign Up'
              )}
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}

export default Register;

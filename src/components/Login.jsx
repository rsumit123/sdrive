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
import { useNavigate } from 'react-router-dom';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import axios from 'axios';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (event) => {
    event?.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/auth/login/`,
        { email, password }
      );

      const token = response.data.token;

      if (token) {
        login(token);
        navigate('/');
      } else {
        setError('Login failed: No token received.');
      }
    } catch (err) {
      console.error("Login error:", err);
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Login failed. Please check your credentials.';
      setError(errorMsg);
    } finally {
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
              Welcome Back
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
              Sign in to access your files
            </Typography>
          </Box>

          <Box component="form" noValidate onSubmit={handleLogin} sx={{ width: '100%', mt: 1 }}>
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
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
                'Sign In'
              )}
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}

export default Login;

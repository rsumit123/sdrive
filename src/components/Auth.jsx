import React, { useState } from 'react';
import Login from './Login';
import Register from './Register';
import { Button, Box, Paper } from '@mui/material';

function Auth() {
  const [showLogin, setShowLogin] = useState(true);

  return (
    <Box sx={{ position: 'relative' }}>
      {showLogin ? <Login /> : <Register />}
      <Box
        sx={{
          position: 'fixed',
          bottom: { xs: 16, sm: 24 },
          left: '50%',
          transform: 'translateX(-50%)',
          width: { xs: 'calc(100% - 32px)', sm: 'auto' },
          maxWidth: 400,
          zIndex: 1000,
        }}
      >
        <Paper
          elevation={8}
          sx={{
            p: 1.5,
            borderRadius: 3,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Button
            fullWidth
            onClick={() => setShowLogin(!showLogin)}
            variant="text"
            sx={{
              color: 'primary.main',
              fontWeight: 500,
              textTransform: 'none',
              fontSize: '0.9rem',
            }}
          >
            {showLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </Button>
        </Paper>
      </Box>
    </Box>
  );
}

export default Auth;

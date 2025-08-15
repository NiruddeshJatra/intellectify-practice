import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { initiateGoogleAuth, initiateGithubAuth } from '../../utils/oauth';
import {
  Modal,
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Divider,
  IconButton,
} from '@mui/material';
import { Google, GitHub, Close } from '@mui/icons-material';

const AuthModal = ({ open, onClose }) => {
  const { loading, error, clearError } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);

  const handleClose = () => {
    if (error) {
      clearError();
    } else {
      onClose();
    }
  };

  const modalStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
    bgcolor: 'background.paper',
    borderRadius: 2,
    boxShadow: 24,
    p: 0,
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      console.log('Redirecting to Google OAuth...');
      // This will redirect to Google OAuth page
      initiateGoogleAuth();
    } catch (err) {
      console.error('Google auth error:', err);
      setGoogleLoading(false);
    }
  };

  const handleGithubLogin = async () => {
    setGithubLoading(true);
    try {
      console.log('Redirecting to GitHub OAuth...');
      // This will redirect to GitHub OAuth page
      initiateGithubAuth();
    } catch (err) {
      console.error('GitHub auth error:', err);
      setGithubLoading(false);
    }
  };

  return (
    <Modal 
      open={open} 
      onClose={handleClose}
    >
      <Box sx={modalStyle}>
        <Card>
          <CardContent sx={{ p: 3 }}>
            {/* Header with Close Button */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 3,
              }}
            >
              <Typography variant="h5" component="h2">
                Sign in to Intellectify
              </Typography>
              <IconButton
                onClick={handleClose}
                size="small"
                disabled={loading || googleLoading || githubLoading}
                sx={{ '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' } }}
              >
                <Close />
              </IconButton>
            </Box>

            {/* Error Alert */}
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            {/* OAuth Buttons */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button
                variant="outlined"
                size="large"
                startIcon={
                  googleLoading ? <CircularProgress size={20} /> : <Google />
                }
                onClick={handleGoogleLogin}
                disabled={loading || googleLoading}
                sx={{
                  py: 1.5,
                  textTransform: 'none',
                  fontSize: '16px',
                  borderColor: '#dadce0',
                  color: '#3c4043',
                  '&:hover': {
                    backgroundColor: '#f8f9fa',
                    borderColor: '#dadce0',
                  },
                  '&:disabled': {
                    backgroundColor: '#f8f9fa',
                    borderColor: '#dadce0',
                  },
                }}
              >
                {googleLoading ? 'Redirecting to Google...' : 'Continue with Google'}
              </Button>

              <Divider>
                <Typography variant="body2" color="text.secondary">
                  or
                </Typography>
              </Divider>

              <Button
                variant="outlined"
                size="large"
                startIcon={
                  githubLoading ? <CircularProgress size={20} /> : <GitHub />
                }
                disabled={loading || githubLoading}
                onClick={handleGithubLogin}
                sx={{
                  py: 1.5,
                  textTransform: 'none',
                  fontSize: '16px',
                  borderColor: '#d1d9e0',
                  color: '#24292f',
                  '&:hover': {
                    backgroundColor: '#f6f8fa',
                    borderColor: '#d1d9e0',
                  },
                  '&:disabled': {
                    backgroundColor: '#f6f8fa',
                    borderColor: '#d1d9e0',
                  },
                }}
              >
                {githubLoading ? 'Redirecting to GitHub...' : 'Continue with GitHub'}
              </Button>
            </Box>

            {/* Footer */}
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ textAlign: 'center', mt: 3 }}
            >
              By signing in, you agree to our Terms & Privacy Policy
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Modal>
  );
};

export default AuthModal;

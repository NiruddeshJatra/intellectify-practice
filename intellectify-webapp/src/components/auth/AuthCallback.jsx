// OAuth Callback Handler Component
//
// This component is the "landing page" where users arrive after OAuth login.
// It's like the "Welcome Back" desk at a hotel - it checks if login succeeded or failed.
//
// What this component does:
// - Reads URL parameters (success/error)
// - Shows appropriate loading/success/error UI
// - Calls checkAuthStatus() to update user state
// - Redirects to dashboard on success
// - Cleans up old OAuth states from localStorage

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { cleanupOldStates } from '../../utils/oauth';
import { ROUTES } from '../../config/app';
import {
  Box,
  CircularProgress,
  Typography,
  Button,
  Paper,
} from '@mui/material';
import { CheckCircle, Error } from '@mui/icons-material';

const AuthCallback = () => {
  const { checkAuthStatus, user } = useAuth();
  const navigate = useNavigate(); // For redirecting to dashboard or login

  // Component state for UI display
  // This controls what the user sees: loading spinner, success checkmark, or error message
  const [status, setStatus] = useState('processing'); // 'processing' | 'success' | 'error'
  const [message, setMessage] = useState('Processing your login...');

  // Main logic: Process the OAuth callback when component loads
  useEffect(() => {
    const processCallback = async () => {
      try {
        // Step 1: Clean up old OAuth states from localStorage
        cleanupOldStates();

        // Step 2: Parse URL parameters to see what happened
        // Backend redirects here with either success=true or error=message
        const urlParams = new URLSearchParams(window.location.search);
        const success = urlParams.get('success');
        const error = urlParams.get('error');

        // Step 3: Handle error case
        if (error) {
          setStatus('error');
          // decodeURIComponent converts URL-encoded text back to readable text
          // "Invalid%20OAuth%20state" becomes "Invalid OAuth state"
          setMessage(`Authentication failed: ${decodeURIComponent(error)}`);
          return;
        }

        // Step 4: Handle success case
        if (success === 'true') {
          // Case A: User is already authenticated (rare, but possible)
          if (user) {
            setStatus('success');
            setMessage('Login successful!');
            // Quick redirect since we already have user data
            setTimeout(() => {
              navigate(ROUTES.dashboard);
            }, 1000);
          }
          // Case B: Backend set cookies, but frontend doesn't have user data yet
          else {
            // Call checkAuthStatus to fetch user data from backend
            // This uses the cookies that backend just set
            await checkAuthStatus();
            setStatus('success');
            setMessage('Login successful!');
            // Slightly longer delay to show success message
            setTimeout(() => {
              navigate(ROUTES.dashboard);
            }, 1500);
          }
        }
        // Step 5: Handle invalid callback (no success or error parameter)
        else {
          setStatus('error');
          setMessage('Invalid callback parameters');
        }
      } catch (error) {
        // Step 6: Handle any unexpected errors
        console.error('Auth callback error:', error);
        setStatus('error');
        setMessage('An error occurred during authentication');
      }
    };

    // Run the callback processing when component mounts
    processCallback();
  }, [checkAuthStatus, navigate, user]); // Re-run if these dependencies change

  // Render different UI based on current status
  // This function returns the appropriate JSX for each state
  const renderContent = () => {
    switch (status) {
      // Show loading spinner while processing OAuth callback
      case 'processing':
        return (
          <>
            <CircularProgress size={60} style={{ marginBottom: '20px' }} />
            <Typography variant="h6" color="textPrimary">
              {message} {/* "Processing your login..." */}
            </Typography>
          </>
        );

      // Show success checkmark and redirect message
      case 'success':
        return (
          <>
            <CheckCircle
              style={{ fontSize: 60, color: '#4caf50', marginBottom: '20px' }}
            />
            <Typography variant="h5" color="textPrimary">
              {message} {/* "Login successful!" */}
            </Typography>
            <Typography
              variant="body1"
              color="textSecondary"
              style={{ marginTop: '10px' }}
            >
              You will be redirected shortly...
            </Typography>
          </>
        );

      // Show error icon and retry button
      case 'error':
        return (
          <>
            <Error
              style={{ fontSize: 60, color: '#f44336', marginBottom: '20px' }}
            />
            <Typography variant="h6" color="error">
              {message} {/* Error message from backend or generic error */}
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={() => navigate(ROUTES.home)} // Navigate to home since we don't have a dedicated login route
              style={{ marginTop: '20px' }}
            >
              Back to Login
            </Button>
          </>
        );

      default:
        return null; // Shouldn't happen, but good practice
    }
  };

  // Render the callback page UI
  // This creates a centered card that shows the appropriate content
  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh" // Full screen height
      padding={2}
    >
      <Paper
        elevation={3} // Material-UI shadow effect
        style={{
          padding: '40px',
          borderRadius: '8px',
          maxWidth: '500px',
          width: '100%',
          textAlign: 'center',
        }}
      >
        {renderContent()} {/* Show loading/success/error content */}
      </Paper>
    </Box>
  );
};

export default AuthCallback;

import React from 'react';
import { Box, Typography, Button, Alert, Container } from '@mui/material';
import { Refresh, Home } from '@mui/icons-material';

/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors anywhere in the component tree and
 * displays a fallback UI instead of crashing the entire app.
 * 
 * Particularly useful for authentication-related errors that
 * might occur during app initialization.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details for debugging
    console.error('Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  handleRefresh = () => {
    // Clear error state and reload the page
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  handleGoHome = () => {
    // Clear error state and navigate to home
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <Container maxWidth="md">
          <Box
            display="flex"
            flexDirection="column"
            justifyContent="center"
            alignItems="center"
            minHeight="100vh"
            gap={3}
            textAlign="center"
          >
            <Alert severity="error" sx={{ width: '100%', maxWidth: 600 }}>
              <Typography variant="h5" gutterBottom>
                Oops! Something went wrong
              </Typography>
              <Typography variant="body1" paragraph>
                We encountered an unexpected error. This might be related to authentication
                or a temporary issue with the application.
              </Typography>
              
              {/* Show error details in development */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <Box sx={{ mt: 2, textAlign: 'left' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Error Details (Development Only):
                  </Typography>
                  <Typography variant="body2" component="pre" sx={{ 
                    fontSize: '0.75rem',
                    backgroundColor: '#f5f5f5',
                    p: 1,
                    borderRadius: 1,
                    overflow: 'auto',
                    maxHeight: 200
                  }}>
                    {this.state.error.toString()}
                    {this.state.errorInfo.componentStack}
                  </Typography>
                </Box>
              )}
            </Alert>

            <Box display="flex" gap={2} flexWrap="wrap" justifyContent="center">
              <Button
                variant="contained"
                startIcon={<Refresh />}
                onClick={this.handleRefresh}
                size="large"
              >
                Refresh Page
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<Home />}
                onClick={this.handleGoHome}
                size="large"
              >
                Go to Home
              </Button>
            </Box>

            <Typography variant="body2" color="text.secondary">
              If this problem persists, please contact support or try clearing your browser cache.
            </Typography>
          </Box>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
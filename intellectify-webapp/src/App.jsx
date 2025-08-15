import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box, CircularProgress, Typography } from '@mui/material';

// Components
import Navbar from './components/layout/Navbar';
import PrivateRoute from './components/PrivateRoute';
import GoogleOneTap from './components/auth/GoogleOneTap';

// Pages
import HomePage from './pages/home';
import Dashboard from './pages/dashboard';
import AuthCallback from './components/auth/AuthCallback';

// Context
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Configuration
import { ROUTES } from './config/app';

// Create Material-UI theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

/**
 * App Loading Component
 * 
 * Shows loading state while authentication is being initialized.
 * This prevents flash of unauthenticated content (FOUC) during app startup.
 */
const AppLoading = () => (
  <Box
    display="flex"
    flexDirection="column"
    justifyContent="center"
    alignItems="center"
    minHeight="100vh"
    gap={2}
  >
    <CircularProgress size={50} />
    <Typography variant="h6" color="text.secondary">
      Initializing Intellectify...
    </Typography>
  </Box>
);

/**
 * Main App Content Component
 * 
 * Contains the main application routes and navigation.
 * Only renders after authentication has been initialized.
 */
const AppContent = () => {
  const { loading } = useAuth();

  // Show loading screen during initial authentication check
  if (loading) {
    return <AppLoading />;
  }

  return (
    /* 
      Router is like a manager that keeps track of the current URL and 
      provides routing capabilities to all components inside it.
      Think of it as a GPS system that knows where you are in your app.
    */
    <Router>
      <div className="App">
        <Navbar />
        
        {/* Google One Tap - shows on homepage for unauthenticated users */}
        <GoogleOneTap />

        {/* 
          Routes is like a switchboard that looks at the current URL and 
          decides which component to show. It's like a traffic cop that 
          directs you to the right page based on the URL.
          
          All your route definitions go inside this component.

          Router handles the "where are we?" part, Routes handles "what should we show?"
        */}
        <Routes>
          {/* Public routes */}
          <Route path={ROUTES.home} element={<HomePage />} />
          
          {/* OAuth callback routes - handle JSON responses from backend */}
          <Route path={ROUTES.googleCallback} element={<AuthCallback />} />
          <Route path={ROUTES.githubCallback} element={<AuthCallback />} />

          {/* Protected routes */}
          <Route element={<PrivateRoute />}>
            <Route path={ROUTES.dashboard} element={<Dashboard />} />
            {/* Add more protected routes here */}
          </Route>

          {/* 404 Not Found - redirect to home */}
          <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
        </Routes>
      </div>
    </Router>
  );
};

/**
 * Main App Component
 * Sets up the application with theme, authentication context,
 * and renders the main content component.
 */
function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

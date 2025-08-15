import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CircularProgress, Box, Typography, Alert } from '@mui/material';
import { ROUTES } from '../config/app';

/**
 * Role-Based Protected Route Component
 * 
 * Protects routes based on user authentication and role requirements.
 * Extends the basic PrivateRoute with role-based access control.
 */
const RoleBasedRoute = ({ allowedRoles = [], redirectTo = ROUTES.home }) => {
  const { user, loading } = useAuth();

  // Show loading spinner while checking authentication status
  if (loading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="80vh"
        gap={2}
      >
        <CircularProgress size={40} />
        <Typography variant="body2" color="text.secondary">
          Checking authentication...
        </Typography>
      </Box>
    );
  }

  // Redirect if not authenticated
  if (!user) {
    return <Navigate to={redirectTo} replace />;
  }

  // Check role-based access
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="80vh"
        gap={2}
        px={3}
      >
        <Alert severity="warning" sx={{ maxWidth: 500 }}>
          <Typography variant="h6" gutterBottom>
            Access Denied
          </Typography>
          <Typography variant="body2">
            You don't have permission to access this page. Required roles: {allowedRoles.join(', ')}
          </Typography>
        </Alert>
      </Box>
    );
  }

  // User is authenticated and has required role
  return <Outlet />;
};

export default RoleBasedRoute;
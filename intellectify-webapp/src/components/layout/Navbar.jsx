import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Avatar,
  Menu,
  MenuItem,
  Box,
  Chip,
  CircularProgress,
} from '@mui/material';
import { Login, ExpandMore, Person, ExitToApp } from '@mui/icons-material';
import AuthModal from '../auth/AuthModal';
import { useAuth } from '../../contexts/AuthContext';

const Navbar = () => {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const { user, logout, loading } = useAuth();

  const handleUserMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleUserMenuClose();
    await logout();
  };

  const handleProfile = () => {
    handleUserMenuClose();
    // Navigate to profile page (implement later)
    console.log('Navigate to profile');
  };

  return (
    <>
      <AppBar
        position="static"
        sx={{ bgcolor: 'white', color: 'text.primary', boxShadow: 1 }}
      >
        <Container maxWidth="lg">
          <Toolbar sx={{ justifyContent: 'space-between' }}>
            {/* Logo */}
            <Typography
              variant="h6"
              component="div"
              sx={{ fontWeight: 'bold', color: 'primary.main' }}
            >
              Intellectify
            </Typography>

            {/* Right Side - Auth Section */}
            {loading ? (
              <CircularProgress size={24} />
            ) : user ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {/* User Role Chip */}
                <Chip
                  label={user.role}
                  size="small"
                  color={
                    user.role === 'ADMIN'
                      ? 'error'
                      : user.role === 'MENTOR'
                        ? 'primary'
                        : 'default'
                  }
                  variant="outlined"
                />

                {/* User Menu Button */}
                <Button
                  onClick={handleUserMenuClick}
                  sx={{
                    textTransform: 'none',
                    color: 'text.primary',
                    '&:hover': { bgcolor: 'grey.100' },
                  }}
                  endIcon={<ExpandMore />}
                >
                  <Avatar
                    src={user.avatar}
                    sx={{ width: 32, height: 32, mr: 1 }}
                  >
                    {user.name?.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box
                    sx={{
                      textAlign: 'left',
                      display: { xs: 'none', sm: 'block' },
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {user.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {user.email}
                    </Typography>
                  </Box>
                </Button>

                {/* User Menu */}
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleUserMenuClose}
                  PaperProps={{
                    sx: { minWidth: 200, mt: 1 },
                  }}
                >
                  <MenuItem onClick={handleProfile}>
                    <Person sx={{ mr: 2 }} fontSize="small" />
                    Profile Settings
                  </MenuItem>
                  <MenuItem onClick={handleLogout}>
                    <ExitToApp sx={{ mr: 2 }} fontSize="small" />
                    Sign Out
                  </MenuItem>
                </Menu>
              </Box>
            ) : (
              <Button
                variant="contained"
                startIcon={<Login />}
                onClick={() => setAuthModalOpen(true)}
                sx={{ textTransform: 'none' }}
              >
                Sign In
              </Button>
            )}
          </Toolbar>
        </Container>
      </AppBar>

      {/* Auth Modal */}
      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  );
};

export default Navbar;

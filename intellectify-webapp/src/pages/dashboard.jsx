import React from 'react';
import { Box, Card, CardContent, Typography, Avatar, Button } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const { user, logout } = useAuth();

  return (
    <Box sx={{ py: 4, px: 2 }}>
      <Box sx={{ maxWidth: 800, mx: 'auto' }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Dashboard
        </Typography>
        
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Avatar 
                src={user?.avatar} 
                alt={user?.name}
                sx={{ width: 64, height: 64 }}
              >
                {user?.name?.charAt(0)}
              </Avatar>
              <Box>
                <Typography variant="h5" component="h2">
                  Welcome, {user?.name}!
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {user?.email}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Role: {user?.role}
                </Typography>
              </Box>
            </Box>
            
            <Button 
              variant="outlined" 
              color="error" 
              onClick={logout}
              sx={{ mt: 2 }}
            >
              Logout
            </Button>
          </CardContent>
        </Card>

        <Typography variant="h4" component="h2" gutterBottom>
          Your Mentorship Dashboard
        </Typography>
        <Typography variant="body1" paragraph>
          This is where you'll manage your mentorship activities, connect with mentors or mentees, 
          and track your progress.
        </Typography>
        
        {/* Add more dashboard content here */}
      </Box>
    </Box>
  );
};

export default Dashboard;

import React from 'react';
import { Box } from '@mui/material';
import GoogleOneTap from '../components/auth/GoogleOneTap';

const HomePage = () => {
  return (
    <Box sx={{ py: 4, px: 2 }}>
      {/* Add GoogleOneTap component here */}
      <GoogleOneTap />

      <Box sx={{ textAlign: 'center', maxWidth: 800, mx: 'auto' }}>
        <h1>Welcome to Intellectify</h1>
        <p>Your mentorship platform for connecting learners with experts.</p>

        <Box sx={{ mt: 4 }}>
          <h2>Find Your Mentor</h2>
          <p>Connect with experienced professionals in your field.</p>
        </Box>

        <Box sx={{ mt: 4 }}>
          <h2>Become a Mentor</h2>
          <p>Share your knowledge and help others grow.</p>
        </Box>
      </Box>
    </Box>
  );
};

export default HomePage;

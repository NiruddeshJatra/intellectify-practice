module.exports = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback',
  },
  github: {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    redirectUri: process.env.GITHUB_REDIRECT_URI || 'http://localhost:3000/api/auth/github/callback',
  },
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'your-jwt-secret-key',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'your-jwt-refresh-secret-key',
  
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  backendUrl: process.env.BACKEND_URL || 'http://localhost:3000',

  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development'
};

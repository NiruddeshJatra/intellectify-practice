/**
 * Application Configuration
 *
 * Centralized configuration for the Intellectify application.
 * Includes settings for authentication, API, and environment-specific options.
 * 
 * Benefits of centralized config:
 * - Single source of truth for all configuration values
 * - Easy to change URLs, feature flags, and settings in one place
 * - Better maintainability and consistency across the codebase
 * - Environment-specific configurations are handled centrally
 * 
 * This file is imported by:
 * - services/api.js (API configuration)
 * - utils/oauth.js (OAuth provider settings)
 * - components/auth/GoogleOneTap.jsx (Client ID and feature flags)
 * - App.jsx (Route definitions)
 * - All route components (Route constants)
 */

// Environment detection
export const isDevelopment = import.meta.env.MODE === 'development';
export const isProduction = import.meta.env.MODE === 'production';

// API Configuration
export const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 10000, // 10 seconds
  withCredentials: true, // Required for cookie-based auth
};

// Authentication Configuration
export const AUTH_CONFIG = {
  // Google OAuth
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,

  // GitHub OAuth
  githubClientId: import.meta.env.VITE_GITHUB_CLIENT_ID,

  // Backend URL for OAuth redirects
  backendUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000',

  // Frontend URL
  frontendUrl: import.meta.env.VITE_FRONTEND_URL || 'http://localhost:5173',

  // Cookie settings (informational - actual settings are on backend)
  cookieSettings: {
    httpOnly: true, // Set by backend
    secure: isProduction, // Set by backend
    sameSite: 'lax', // Set by backend
  },
};

// App Configuration
export const APP_CONFIG = {
  name: 'Intellectify',
  version: '1.0.0',

  // Feature flags
  features: {
    googleOneTap: true,
    serviceWorker: false, // Disabled by default
    errorBoundary: true,
    devTools: isDevelopment,
  },

  // UI Configuration
  ui: {
    theme: 'light', // 'light' | 'dark' | 'auto'
    loadingTimeout: 30000, // 30 seconds
  },
};

// Route Configuration
export const ROUTES = {
  home: '/',
  dashboard: '/dashboard',
  profile: '/profile',
  admin: '/admin',
  mentor: '/mentor',
  login: '/login', // Added login route

  // Auth routes
  authCallback: '/auth/callback',
  googleCallback: '/auth/google/callback',
  githubCallback: '/auth/github/callback',
};

// Validation
const validateConfig = () => {
  const errors = [];

  if (!AUTH_CONFIG.googleClientId) {
    errors.push('VITE_GOOGLE_CLIENT_ID is not configured');
  }

  if (!AUTH_CONFIG.githubClientId) {
    errors.push('VITE_GITHUB_CLIENT_ID is not configured');
  }

  if (errors.length > 0 && isDevelopment) {
    console.warn('Configuration warnings:', errors);
  }

  return errors.length === 0;
};

// Validate configuration on import
validateConfig();

export default {
  API_CONFIG,
  AUTH_CONFIG,
  APP_CONFIG,
  ROUTES,
  isDevelopment,
  isProduction,
};

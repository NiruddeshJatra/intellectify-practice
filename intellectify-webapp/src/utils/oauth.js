// OAuth Redirect Flow Utilities
//
// This file handles the "redirect-based" OAuth flow where:
// 1. User clicks "Login with Google/GitHub"
// 2. Browser redirects to Google/GitHub login page
// 3. User authorizes the app
// 4. Google/GitHub redirects back to our backend
// 5. Backend processes the login and redirects to frontend

// Import centralized configuration
import { AUTH_CONFIG } from '../config/app';

// Security: OAuth State Management
//
// What is "state" in OAuth?
// It's a random string that prevents CSRF attacks. Here's how:
// 1. We generate random string: "abc123"
// 2. Send user to Google with: "Hey Google, remember abc123"
// 3. Google sends user back with: "Here's the login code, and you said to remember abc123"
// 4. We check: "Did we really send abc123? Yes? Good, it's legitimate!"
//
// Without state, hackers could trick Google into sending login codes to their site!
const STATE_KEY_PREFIX = 'oauth_state_key';

// Generate a random security token (state) for OAuth
//
// Why do we need this?
// Security! It prevents CSRF attacks where malicious sites could trick
// OAuth providers into sending login codes to the wrong place.
//
// What does this function do?
// 1. Creates a random string like "k2j8x9m4"
// 2. Stores it in localStorage with timestamp and origin
// 3. Returns the string to include in OAuth URL
// 4. Backend will validate this when user comes back
const generateState = () => {
  // Create random string using Math.random() and base36 encoding
  // .slice(2) removes the "0." prefix, giving us something like "k2j8x9m4"
  const state = `${Math.random().toString(36).slice(2)}`;

  // Store additional data with the state for security validation
  const stateData = {
    value: state, // The random string itself
    createdAt: Date.now(), // When it was created (for expiry)
    origin: window.location.origin, // Which website created it (security check)
  };

  // Store in localStorage with a unique key
  // Key format: "oauth_state_key_k2j8x9m4"
  const stateKey = `${STATE_KEY_PREFIX}_${state}`;
  localStorage.setItem(stateKey, JSON.stringify(stateData));

  // Clean up old states to prevent localStorage from filling up
  cleanupOldStates();

  console.log('Generated OAuth state:', state);
  return state;
};

// Clean up expired OAuth states from localStorage
//
// Why do we need this?
// Every time a user starts OAuth login, we store a state in localStorage.
// Without cleanup, localStorage would fill up with old, unused states.
//
// When is this called?
// 1. Every time we generate a new state (automatic cleanup)
// 2. When user returns from OAuth (manual cleanup in AuthCallback)
//
// What does it do?
// Removes any states older than 1 hour (they're expired anyway)
export const cleanupOldStates = () => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000; // 1 hour

  // Go through all localStorage keys
  Object.keys(localStorage).forEach((key) => {
    // Only look at our OAuth state keys
    if (key.startsWith(STATE_KEY_PREFIX)) {
      try {
        // Parse the stored state data
        const stateData = JSON.parse(localStorage.getItem(key));

        // If it's older than 1 hour, remove it
        if (stateData && stateData.createdAt < oneHourAgo) {
          localStorage.removeItem(key);
          console.log('Cleaned up expired OAuth state:', key);
        }
      } catch (_e) {
        // If we can't parse it, it's corrupted - remove it
        localStorage.removeItem(key);
        console.log('Removed corrupted OAuth state:', key);
      }
    }
  });
};

// Start Google OAuth login flow
//
// This is called when user clicks "Login with Google" button
//
// What happens:
// 1. Generate security state token
// 2. Build Google OAuth URL with all required parameters
// 3. Redirect user's browser to Google login page
// 4. User will authorize and Google will redirect back to our backend
//
// The user journey:
// Your App → Google Login Page → User Authorizes → Backend → Your App (success page)
export const initiateGoogleAuth = () => {
  // Generate random security token
  const state = generateState();

  // Build the OAuth URL parameters
  // These tell Google what we want and where to send the user back
  const params = new URLSearchParams({
    client_id: AUTH_CONFIG.googleClientId,
    redirect_uri: `${AUTH_CONFIG.backendUrl}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state: state,
    access_type: 'offline',
    prompt: 'consent',
  });

  // Redirect user to Google OAuth page
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;

  // Note: After this line, the user leaves your app and goes to Google!
  // They'll come back to your backend at: /api/auth/google/callback?code=xyz&state=abc123
};

// Start GitHub OAuth login flow
export const initiateGithubAuth = () => {
  const state = generateState();

  const params = new URLSearchParams({
    client_id: AUTH_CONFIG.githubClientId,
    redirect_uri: `${AUTH_CONFIG.backendUrl}/api/auth/github/callback`,
    scope: 'user:email',
    state: state,
  });

  // Redirect to GitHub OAuth page
  window.location.href = `https://github.com/login/oauth/authorize?${params}`;
};

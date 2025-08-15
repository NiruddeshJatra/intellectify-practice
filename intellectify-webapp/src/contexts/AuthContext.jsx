/**
 * Authentication Context
 * Think of this like a building's security system:
 * - AuthContext = The security system blueprint
 * - AuthProvider = The actual security system installation
 * - useAuth = The security badges that let people access secure areas
 * 
 * Why Context instead of regular functions?
 * 1. Centralized State: All components see the same auth state
 * 2. Avoid Prop Drilling: No need to pass user/auth through multiple levels
 * 3. Consistent Updates: When auth state changes, all components update

 * Authentication Context - Cookie-Based Authentication
 * 
 * Updated for HTTP-only cookie authentication system:
 * - No localStorage token management
 * - Cookies are automatically sent with requests
 * - Backend handles token validation and refresh
 * - Frontend only manages user state and auth status
 * 
 * Security Benefits:
 * - HTTP-only cookies prevent XSS attacks
 * - Automatic token refresh via refresh tokens
 * - No client-side token storage vulnerabilities
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { authAPI } from '../services/api';

// Create the context (like creating a WiFi network name)
const AuthContext = createContext();

/**
 * Custom Hook for Authentication
 *
 * This is like creating a standardized security badge scanner:
 * - Provides consistent access to auth system
 * - Includes error checking
 * - Makes auth access simpler in components
 *
 * Instead of:
 *   const context = useContext(AuthContext);
 *   if (!context) throw new Error();
 *
 * Components can just:
 *   const { user, login, logout } = useAuth();
 *
 * @throws {Error} If used outside of AuthProvider
 * @returns {Object} Auth methods and state
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * Authentication Provider Component
 *
 * This is the central hub for all authentication-related state and functions.
 * It provides:
 * 1. State Management:
 *    - user: Current user information
 *    - loading: Loading states for auth operations
 *    - error: Authentication errors
 *
 * 2. Auth Functions:
 *    - login: Handle different login methods (Google, GitHub)
 *    - logout: Clean up user session
 *    - checkAuthStatus: Verify existing sessions
 *
 */
export const AuthProvider = ({ children }) => {
  /**
   * Core authentication state management
   *
   * @state {Object|null} user - The currently authenticated user's data.
   *   - `null` when no user is logged in
   *   - User object with { id, name, email, role, ... } when authenticated
   *   - Updated on login/logout and session validation
   */
  const [user, setUser] = useState(null);

  /**
   * @state {boolean} loading - Indicates if an authentication operation is in progress.
   *   - `true` when:
   *     - App first loads and checks for existing session
   *     - During login/logout operations
   *   - `false` when:
   *     - Initial auth check is complete
   *     - Auth operation (login/logout) completes
   *   Used to show loading states in the UI
   */
  const [loading, setLoading] = useState(true);

  /**
   * @state {string|null} error - Contains error messages from auth operations.
   *   - `null` when there's no error
   *   - Contains error message string when an auth operation fails
   */
  const [error, setError] = useState(null);

  // Used to prevent unnecessary auth checks
  // and to ensure certain operations only happen after 
  // the auth state is known. 
  // It's a ref instead of state to avoid
  // triggering re-renders when it changes.
  const isInitialized = useRef(false);

  /**
   * Check authentication status using HTTP-only cookies
   *
   * Cookie-based flow:
   * 1. No need to check localStorage - cookies are automatic
   * 2. Call /me endpoint which validates access token from cookie
   * 3. Backend automatically handles token refresh if needed
   * 4. Restore user session if valid
   *
   * Security Benefits:
   * - No client-side token storage to check
   * - Automatic token refresh handled by backend
   * - HTTP-only cookies prevent XSS token theft
   */
  // Using useCallback to memoize the function and prevent unnecessary re-renders
  // This is important because:
  // 1. It's used in a useEffect dependency array
  // 2. It's passed to child components
  // Without useCallback, a new function would be created on each render,
  // which could cause unnecessary re-renders or effect re-runs
  // Track if we've already checked auth status to prevent multiple checks

  const checkAuthStatus = useCallback(async () => {
    try {
      setLoading(true);
      const response = await authAPI.getMe();
      
      if (response.data) {
        setUser(response.data);
        return response.data;
      } else {
        setUser(null);
        return null;
      }
    } catch (error) {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
      isInitialized.current = true;
    }
  }, []);

  // Check if user is logged in on app start
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Listen for authentication failures from API interceptors
  //
  // Why this useEffect is necessary:
  // When a user's session expires, it doesn't happen during login - it happens during
  // normal API calls throughout the app. The API interceptor (in api.js) tries to
  // refresh the token, and if that fails, it dispatches an 'auth-failure' event.
  //
  // Without this listener:
  // - User's session expires silently
  // - API calls fail but user state stays "logged in"
  // - User sees confusing "authenticated but API failing" state
  //
  // With this listener:
  // - Session expiry is detected automatically
  // - User is logged out immediately with clear error message
  // - Creates communication bridge between API layer and Auth Context

  /**
   * The cleanup function 'removeEventListener' runs when the component unmounts, ensuring that event listeners are properly removed to prevent memory leaks.
   * Component unmounting happens in React when:
   *   1.The component is removed from the DOM (e.g., when navigating to a different route)
   *   2.A parent component stops rendering the component
   *   3. The application is closed/refreshed
   */

  useEffect(() => {
    const handleAuthFailure = () => {
      setUser(null);
      setError('Session expired. Please log in again.');
      setLoading(false); // Ensure loading is set to false
      isInitialized.current = true; // Ensure we're marked as initialized
    };

    // Listen for custom auth failure events from API interceptors
    window.addEventListener('auth-failure', handleAuthFailure);

    return () => {
      window.removeEventListener('auth-failure', handleAuthFailure);
    };
  }, []);

  /**
   * Logout and clean up user session (Cookie-based)
   *
   * Cookie-based logout flow:
   * 1. Call backend logout endpoint
   * 2. Backend revokes refresh tokens and clears cookies
   * 3. Reset frontend user state
   *
   * Security Benefits:
   * - Backend handles token revocation
   * - HTTP-only cookies are cleared by backend
   * - No client-side token cleanup needed
   */
  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout request failed:', error);
      // Continue with logout even if request fails
    } finally {
      // Only need to clear user state - cookies are cleared by backend
      setUser(null);
      sessionStorage.setItem('auth_logged_out', 'true');
      isInitialized.current = true; // Ensure we stay initialized
    }
  };

  /**
   * Refresh authentication token
   *
   * Calls the refresh endpoint which handles token rotation
   * using HTTP-only cookies automatically
   */
  const refreshToken = async () => {
    try {
      const response = await authAPI.refreshToken();
      if (response.success) {
        // Token refreshed successfully - cookies updated by backend
        return true;
      }
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      // If refresh fails, user needs to login again
      setUser(null);
      return false;
    }
  };

  const clearError = () => {
    setError(null);
  };

  /**
   * Why do we need Context instead of simple functions?
   *
   * Imagine a shopping mall:
   * WITHOUT Context (simple functions):
   * - Every shop needs its own security guard (duplicate code)
   * - Guards don't know about each other (no shared state)
   * - Customer needs new ID check at each shop (repetitive checks)
   *
   * WITH Context:
   * - One security system for the whole mall (centralized)
   * - Get wristband once, use everywhere (shared state)
   * - All shops know if you're allowed in (consistent access)
   *
   * Why all these values?
   * user: The shopper's ID (who are you?)
   *    const { user } = useAuth();
   *    console.log(user.name); // "John Doe"
   *
   * loading: Are we checking your ID?
   *    if (loading) return <LoadingSpinner />;
   *
   * error: Did your ID check fail?
   *    if (error) return <div>Login failed: {error}</div>;
   *
   * login: Getting your ID checked
   *    <button onClick={() => login('google')}>Login</button>
   *
   * logout: Leaving the mall
   *    <button onClick={logout}>Sign Out</button>
   *
   * clearError: Reset after ID check fails
   *    <button onClick={clearError}>Try Again</button>
   *
   * user: Check authentication and get user data
   *    if (!user) return <LoginPage />;
   *
   * Real Example - Profile Page:
   * function ProfilePage() {
   *   const { user, loading, error } = useAuth();
   *
   *   if (loading) return <Spinner />;
   *   if (error) return <ErrorMessage />;
   *   if (!user) return <LoginPrompt />;
   *
   *   return <h1>Welcome {user.name}!</h1>;
   * }
   */
  /**
   * Create the value object that will be shared through context
   *
   * These values will be available to any component using useAuth():
   * - user: Current user information (null if not authenticated)
   * - loading: Loading state for async operations
   * - error: Any auth-related errors
   * - login: Function to log user in
   * - logout: Function to log user out
   * - clearError: Reset error state
   */
  const value = {
    user,
    loading,
    error,
    logout,
    clearError,
    refreshToken,
    checkAuthStatus,
  };

  // Provide auth context to all child components
  // This is like installing the security system in the building
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

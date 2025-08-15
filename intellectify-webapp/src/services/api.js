import axios from 'axios';
import { API_CONFIG } from '../config/app';

// Create axios instance with base configuration for cookie-based auth
//
// What is axios.create()?
// - It's a factory function that creates a customized axios instance
// - Like creating a "phone with speed dial" instead of dialing full numbers each time
// - Sets up default configuration that applies to ALL requests made with this instance
//
// Why use it instead of basic axios?
// Instead of: axios.get('http://localhost:3000/api/auth/me', { headers: {...}, withCredentials: true })
// We can do: api.get('/auth/me') // All config is automatically applied!
const api = axios.create({
  // baseURL: Automatically prepends this to all request URLs
  // So api.get('/auth/me') becomes GET http://localhost:3000/api/auth/me
  // Now using centralized config instead of hardcoded values
  baseURL: API_CONFIG.baseURL,

  // headers: Default headers sent with every request
  // Tells backend "I'm sending JSON data, please expect JSON"
  headers: {
    'Content-Type': 'application/json',
  },

  // withCredentials: Automatically sends cookies with every request
  // Critical for auth! Without this, backend won't receive auth cookies
  // Like always carrying your ID card when entering a building
  withCredentials: API_CONFIG.withCredentials,
  
  // Request timeout from centralized config
  timeout: API_CONFIG.timeout,
});

// Variables for managing automatic token refresh
//
// Why do we need these?
// Scenario: User opens dashboard → 5 API calls happen at once → All get 401 (token expired)
// Without these: We'd try to refresh token 5 times simultaneously! 💥
// With these: We refresh once, queue the other 4, then retry all together ✅
let isRefreshing = false; // Flag: "Are we currently refreshing the token?"
let failedQueue = []; // Array: Store API calls that failed while refreshing

// Process all queued requests after token refresh completes
//
// Think of it like a restaurant:
// - Chef (token refresh) is cooking
// - Customers (API calls) wait in line (failedQueue)
// - When food is ready, serve all customers at once!
const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error); // Tell all waiting requests: "Sorry, refresh failed"
    } else {
      resolve(token); // Tell all waiting requests: "Success! You can retry now"
    }
  });

  failedQueue = []; // Clear the queue
};

// Request interceptor - no need to add Authorization header (cookies are automatic)
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor with automatic token refresh
// Success case: Just return response.data (so you get {user: {...}} instead of {data: {user: {...}}})
// Error case: If 401 (token expired), automatically refresh token and retry the request
api.interceptors.response.use(
  (response) => response.data, // Return just the data part
  async (error) => {
    const originalRequest = error.config;

    // Don't attempt refresh for auth endpoints or if already retried
    const isAuthEndpoint = originalRequest.url?.includes('/auth/');
    const shouldSkipRefresh = isAuthEndpoint || originalRequest._retry;

    // Handle 401 errors with automatic token refresh
    if (error.response?.status === 401 && !shouldSkipRefresh) {
      if (isRefreshing) {
        // Token refresh is already in progress - don't start another one!
        // Instead, create a Promise that will wait for the current refresh to finish
        //
        // Think of it like: "I'll wait in line, and when the chef finishes cooking, serve me too"
        return new Promise((resolve, reject) => {
          // Add this request's resolve/reject functions to the waiting queue
          // When processQueue() runs, it will call resolve() or reject() for this request
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            // When refresh succeeds, retry this original request
            return api(originalRequest);
          })
          .catch((err) => {
            // When refresh fails, this request fails too
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Attempt to refresh the token
        await api.post('/auth/refresh-token');

        // Token refreshed successfully, process queued requests
        processQueue(null);
        isRefreshing = false;

        // Retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, notify auth context and redirect to login
        processQueue(refreshError);
        isRefreshing = false;

        // Dispatch custom event to notify AuthContext of auth failure
        window.dispatchEvent(
          new CustomEvent('auth-failure', {
            detail: { error: refreshError },
          })
        );

        return Promise.reject(refreshError);
      }
    }

    // For auth endpoints or other errors, just reject without refresh attempt
    return Promise.reject(error.response?.data || error.message);
  }
);

// Auth API methods for cookie-based authentication
export const authAPI = {
  // Google One Tap credential verification (direct credential flow)
  googleOneTap: (credential) =>
    api.post('/auth/google-one-tap', { credential }),

  // Get current user info (uses access token from HTTP-only cookie)
  getMe: () => api.get('/auth/me'),

  // Refresh access token using refresh token cookie
  refreshToken: () => api.post('/auth/refresh-token'),

  // Logout and clear cookies
  logout: () => api.post('/auth/logout'),
};

export default api;

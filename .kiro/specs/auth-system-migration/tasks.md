# Implementation Plan

- [x] 1. Fix critical backend import and logic errors

  - Add missing crypto import to tokenService.js
  - Add missing tokenService import to authController.js
  - Fix token rotation logic to properly hash tokens for database lookups
  - Standardize JWT secret usage across all modules
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Enhance CORS configuration for better development experience

  - Replace single origin CORS with multiple allowed origins array
  - Add support for localhost and 127.0.0.1 variations
  - Implement origin validation callback with proper error handling
  - _Requirements: 1.4_

- [x] 3. Implement proper logout functionality

  - Add refresh token revocation to logout endpoint
  - Clear authentication cookies on logout
  - Ensure logout is idempotent and handles missing tokens gracefully
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 4. Clean up unused configuration

  - Check whether COOKIE_SECRET should applied or not
  - If needed, implement it properly in the application
  - If not needed:
    - Remove unused configuration variables from .env file
    - Remove COOKIE_SECRET from .env file
  - Remove unused frontendUrl variable from authController
  - Update oauth.js configuration to be consistent
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 5. Create authentication context for frontend

  - Implement React context for authentication state management
  - Add user state, loading state, and authentication methods
  - Remove all localStorage dependencies for token storage
  - _Requirements: 4.1, 4.2_

- [x] 6. Update API client for cookie-based authentication


  - Remove Authorization header logic from axios interceptors
  - Implement automatic token refresh on 401 responses
  - Add proper error handling for authentication failures
  - Configure axios to include cookies in requests
  - _Requirements: 4.1, 4.3, 4.4_

- [x] 7. Implement automatic token refresh logic

  - Add token refresh function to authentication context
  - Handle 401 responses by attempting token refresh once
  - Clear authentication state on refresh failure
  - _Requirements: 4.2, 4.4_

- [x] 8. Implement OAuth JSON response handling








  - Create OAuth popup/redirect handler for Google and GitHub authentication
  - Implement OAuth callback processor to handle JSON responses from backend
  - Add error handling for OAuth authentication failures
  - Integrate OAuth responses with authentication context state



  - _Requirements: 4.6, 4.7_

- [x] 9. Update authentication flow components


  - Modify login components to work with cookie-based auth and JSON responses
  - Update logout functionality to call backend logout endpoint
  - Remove token handling from frontend OAuth callback components
  - Replace redirect-based OAuth with JSON response handling
  - _Requirements: 4.3, 4.5, 4.6, 4.7_

- [x] 10. Create protected route component




  - Implement route protection using authentication context
  - Add loading states during authentication checks
  - Handle unauthenticated users appropriately
  - _Requirements: 4.5_

- [x] 11. Update application initialization




  - Add authentication status check on app load using /me endpoint
  - Handle initial loading state while checking authentication
  - Set up proper error boundaries for authentication failures
  - _Requirements: 4.5_

- [x] 12. Test backend authentication fixes








  - Write unit tests for token service functions
  - Test token rotation with proper hashing
  - Verify logout functionality revokes tokens and clears cookies
  - Test CORS configuration with multiple origins
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2_









- [ ] 13. Test frontend authentication integration
  - Test complete authentication flow from login to logout with JSON OAuth responses
  - Verify automatic token refresh works correctly
  - Test protected route access control
  - Verify authentication state persistence across page reloads
  - Test OAuth popup/redirect flow with JSON response handling
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

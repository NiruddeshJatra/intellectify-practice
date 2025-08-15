# Frontend Authentication Tests

This directory contains comprehensive tests for the cookie-based authentication system.

## Test Files

### AuthContext.test.jsx

Tests the core authentication context functionality:

- ✅ Initial authentication state management
- ✅ Successful login flows (Google/GitHub)
- ✅ Logout functionality
- ✅ OAuth callback handling
- ✅ Authentication error handling
- ✅ Automatic token refresh on auth failure
- ✅ Protected route access control

### AuthIntegration.test.jsx

Tests the complete authentication integration with routing:

- ✅ Unauthenticated user redirection to login
- ✅ Authenticated user access to protected routes
- ✅ Complete Google OAuth flow with navigation
- ✅ Complete GitHub OAuth flow with navigation
- ✅ Logout flow with redirection
- ✅ Authentication state persistence across page reloads
- ✅ Automatic token refresh handling
- ✅ OAuth authentication error handling
- ✅ Loading states during authentication

## Test Coverage

The tests cover all requirements from task 13:

### ✅ Complete Authentication Flow

- Login to logout with JSON OAuth responses
- Google and GitHub OAuth integration
- Proper navigation between login and protected pages

### ✅ Automatic Token Refresh

- Tests verify token refresh works correctly
- Auth failure events properly clear user state
- Failed refresh attempts redirect to login

### ✅ Protected Route Access Control

- Unauthenticated users redirected to login
- Authenticated users can access protected content
- Loading states handled properly during auth checks

### ✅ Authentication State Persistence

- State persists across page reloads via /me endpoint
- Initial authentication check on app load
- Proper handling of authentication status

### ✅ OAuth Popup/Redirect Flow

- JSON response handling (no redirect-based OAuth)
- Error handling for OAuth failures
- Integration with authentication context

## Running Tests

```bash
# Run all tests
yarn test:run

# Run tests in watch mode
yarn test

# Run with UI
yarn test:ui
```

## Test Setup

The tests use:

- **Vitest** - Fast test runner with Vite integration
- **React Testing Library** - Component testing utilities
- **jsdom** - Browser environment simulation
- **MemoryRouter** - In-memory routing for integration tests

## Mock Strategy

Tests mock:

- API calls (`authAPI` methods)
- Browser environment (window.location, etc.)
- OAuth utilities (for future implementation)

This ensures tests are:

- Fast and reliable
- Independent of external services
- Focused on frontend logic

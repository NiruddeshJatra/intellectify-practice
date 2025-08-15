/**
 * AuthContext Tests
 * 
 * Tests the cookie-based authentication context functionality
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';

// Mock the API module
vi.mock('../services/api', () => ({
  authAPI: {
    getMe: vi.fn(),
    googleOneTap: vi.fn(),
    logout: vi.fn(),
    refreshToken: vi.fn(),
  },
}));

// Mock OAuth utilities
vi.mock('../utils/oauth', () => ({
  initiateGoogleAuth: vi.fn(),
  initiateGithubAuth: vi.fn(),
}));

// Test component to access AuthContext
const TestComponent = () => {
  const { user, loading, login, logout } = useAuth();
  
  return (
    <div>
      <div data-testid="loading">{loading ? 'loading' : 'not-loading'}</div>
      <div data-testid="authenticated">{user ? 'authenticated' : 'not-authenticated'}</div>
      <div data-testid="user">{user ? user.name : 'no-user'}</div>
      <button data-testid="login-google" onClick={() => login('google')}>
        Login Google
      </button>
      <button data-testid="login-github" onClick={() => login('github')}>
        Login GitHub
      </button>
      <button data-testid="logout" onClick={logout}>
        Logout
      </button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  test('should provide initial state', async () => {
    // Mock the getMe API call to return no user
    authAPI.getMe.mockRejectedValue(new Error('Not authenticated'));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Should start with loading
    expect(screen.getByTestId('loading')).toHaveTextContent('loading');

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
    });

    // Should be not authenticated
    expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated');
    expect(screen.getByTestId('user')).toHaveTextContent('no-user');
  });

  test('should initiate OAuth login', async () => {
    const { initiateGoogleAuth } = await import('../utils/oauth');
    
    // Mock initial unauthenticated state
    authAPI.getMe.mockRejectedValue(new Error('Not authenticated'));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for initial loading to complete
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
    });

    // Click login button
    await act(async () => {
      screen.getByTestId('login-google').click();
    });

    // Should call OAuth initiation
    expect(initiateGoogleAuth).toHaveBeenCalled();
  });

  test('should handle logout', async () => {
    // Mock initial authenticated state
    authAPI.getMe.mockResolvedValue({
      success: true,
      data: { id: '1', name: 'Test User', email: 'test@example.com' }
    });
    authAPI.logout.mockResolvedValue({ success: true });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for authentication check
    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated');
    });

    // Click logout
    await act(async () => {
      screen.getByTestId('logout').click();
    });

    // Should be logged out
    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated');
      expect(screen.getByTestId('user')).toHaveTextContent('no-user');
    });
  });

  test('should handle OAuth callback', async () => {
    authAPI.getMe.mockRejectedValue(new Error('Not authenticated'));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
    });

    // Simulate OAuth callback
    await act(async () => {
      screen.getByTestId('oauth-callback').click();
    });

    // Should be authenticated after callback
    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated');
      expect(screen.getByTestId('user')).toHaveTextContent('Test User');
    });
  });

  test('should handle OAuth initiation', async () => {
    const { initiateGoogleAuth } = await import('../utils/oauth');
    
    authAPI.getMe.mockRejectedValue(new Error('Not authenticated'));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
    });

    // Attempt login
    await act(async () => {
      screen.getByTestId('login-google').click();
    });

    // Should call OAuth initiation
    expect(initiateGoogleAuth).toHaveBeenCalled();
  });

  test('should handle automatic token refresh', async () => {
    // Mock initial authenticated state
    authAPI.getMe.mockResolvedValue({
      success: true,
      data: { id: '1', name: 'Test User', email: 'test@example.com' }
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for authentication check
    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated');
    });

    // Simulate auth failure event (which would trigger token refresh)
    act(() => {
      window.dispatchEvent(new CustomEvent('auth-failure', { 
        detail: { error: new Error('Token expired') } 
      }));
    });

    // Should be logged out after auth failure
    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated');
    });
  });

  test('should handle protected route access', async () => {
    // Mock authenticated state
    authAPI.getMe.mockResolvedValue({
      success: true,
      data: { id: '1', name: 'Test User', email: 'test@example.com' }
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Should be authenticated
    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated');
      expect(screen.getByTestId('user')).toHaveTextContent('Test User');
    });
  });
});
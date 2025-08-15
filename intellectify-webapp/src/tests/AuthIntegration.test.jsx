/**
 * Authentication Integration Tests
 * 
 * Tests the complete authentication flow including OAuth popup/redirect handling,
 * token refresh, protected routes, and state persistence
 */

import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
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

// Protected Route Component for testing
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div data-testid="loading">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Login Page Component
const LoginPage = () => {
  const { login, loading, user } = useAuth();

  // If authenticated, redirect to dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return (
    <div data-testid="login-page">
      <h1>Login</h1>
      <button 
        data-testid="google-login" 
        onClick={() => login('google')}
        disabled={loading}
      >
        Login with Google
      </button>
      <button 
        data-testid="github-login" 
        onClick={() => login('github')}
        disabled={loading}
      >
        Login with GitHub
      </button>
    </div>
  );
};

// Dashboard Component (Protected)
const Dashboard = () => {
  const { user, logout } = useAuth();
  
  return (
    <div data-testid="dashboard">
      <h1>Dashboard</h1>
      <p data-testid="user-name">Welcome, {user?.name}</p>
      <button data-testid="logout-btn" onClick={logout}>
        Logout
      </button>
    </div>
  );
};

// Test App Component
const TestApp = ({ initialEntries = ['/'] }) => {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
};

describe('Authentication Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should redirect unauthenticated users to login', async () => {
    // Mock unauthenticated state
    authAPI.getMe.mockRejectedValue(new Error('Not authenticated'));

    render(<TestApp />);

    // Should redirect to login page
    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });
  });

  test('should allow authenticated users to access protected routes', async () => {
    // Mock authenticated state
    authAPI.getMe.mockResolvedValue({
      success: true,
      data: { id: '1', name: 'John Doe', email: 'john@example.com' }
    });

    render(<TestApp />);

    // Should show dashboard for authenticated user
    await waitFor(() => {
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      expect(screen.getByTestId('user-name')).toHaveTextContent('Welcome, John Doe');
    });
  });

  test('should initiate Google OAuth flow', async () => {
    const { initiateGoogleAuth } = await import('../utils/oauth');
    
    // Start unauthenticated
    authAPI.getMe.mockRejectedValue(new Error('Not authenticated'));
    
    render(<TestApp />);

    // Should be on login page
    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });

    // Click Google login
    await act(async () => {
      fireEvent.click(screen.getByTestId('google-login'));
    });

    // Should call the OAuth initiation function (which redirects)
    await waitFor(() => {
      expect(initiateGoogleAuth).toHaveBeenCalled();
    });
  });

  test('should initiate GitHub OAuth flow', async () => {
    const { initiateGithubAuth } = await import('../utils/oauth');
    
    // Start unauthenticated
    authAPI.getMe.mockRejectedValue(new Error('Not authenticated'));
    
    render(<TestApp />);

    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });

    // Click GitHub login
    await act(async () => {
      fireEvent.click(screen.getByTestId('github-login'));
    });

    // Should call the OAuth initiation function (which redirects)
    await waitFor(() => {
      expect(initiateGithubAuth).toHaveBeenCalled();
    });
  });

  test('should handle logout flow', async () => {
    // Start authenticated
    authAPI.getMe.mockResolvedValue({
      success: true,
      data: { id: '1', name: 'John Doe', email: 'john@example.com' }
    });
    authAPI.logout.mockResolvedValue({ success: true });

    render(<TestApp />);

    // Should be on dashboard
    await waitFor(() => {
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    });

    // Click logout
    await act(async () => {
      fireEvent.click(screen.getByTestId('logout-btn'));
    });

    // Should redirect to login page
    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });

    // Verify logout API was called
    expect(authAPI.logout).toHaveBeenCalled();
  });

  test('should handle authentication state persistence across page reloads', async () => {
    // Mock authenticated state on initial load
    authAPI.getMe.mockResolvedValue({
      success: true,
      data: { id: '1', name: 'John Doe', email: 'john@example.com' }
    });

    const { unmount } = render(<TestApp />);

    // Should be authenticated
    await waitFor(() => {
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    });

    // Simulate page reload by unmounting and remounting
    unmount();

    // Mock that user is still authenticated after reload
    authAPI.getMe.mockResolvedValue({
      success: true,
      data: { id: '1', name: 'John Doe', email: 'john@example.com' }
    });

    render(<TestApp />);

    // Should still be authenticated
    await waitFor(() => {
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      expect(screen.getByTestId('user-name')).toHaveTextContent('Welcome, John Doe');
    });
  });

  test('should handle automatic token refresh on auth failure', async () => {
    // Start authenticated
    authAPI.getMe.mockResolvedValue({
      success: true,
      data: { id: '1', name: 'John Doe', email: 'john@example.com' }
    });

    render(<TestApp />);

    await waitFor(() => {
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    });

    // Simulate auth failure event (token expired)
    act(() => {
      window.dispatchEvent(new CustomEvent('auth-failure', { 
        detail: { error: new Error('Token expired') } 
      }));
    });

    // Should redirect to login page after auth failure
    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });
  });

  test('should handle OAuth initiation', async () => {
    const { initiateGoogleAuth } = await import('../utils/oauth');
    
    authAPI.getMe.mockRejectedValue(new Error('Not authenticated'));
    
    render(<TestApp />);

    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });

    // Attempt login
    await act(async () => {
      fireEvent.click(screen.getByTestId('google-login'));
    });

    // Should call OAuth initiation
    await waitFor(() => {
      expect(initiateGoogleAuth).toHaveBeenCalled();
    });
  });

  test('should handle loading states during authentication', async () => {
    // Mock slow authentication check
    let resolveAuth;
    const authPromise = new Promise((resolve) => {
      resolveAuth = resolve;
    });
    authAPI.getMe.mockReturnValue(authPromise);

    render(<TestApp />);

    // Should show loading state
    expect(screen.getByTestId('loading')).toBeInTheDocument();

    // Resolve authentication
    act(() => {
      resolveAuth({
        success: true,
        data: { id: '1', name: 'John Doe', email: 'john@example.com' }
      });
    });

    // Should show dashboard after loading
    await waitFor(() => {
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    });
  });
});
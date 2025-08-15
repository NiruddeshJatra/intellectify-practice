import { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AUTH_CONFIG, APP_CONFIG } from '../../config/app';

const GoogleOneTap = () => {
  const { login, user } = useAuth();

  useEffect(() => {
    // Don't show One Tap if feature is disabled
    if (!APP_CONFIG.features.googleOneTap) {
      return;
    }

    // Don't show One Tap if user is already authenticated
    if (user) {
      return;
    }

    // Check if Google One Tap is available
    if (!window.google?.accounts?.id) {
      console.warn('Google One Tap not available');
      return;
    }

    const handleCredentialResponse = async (response) => {
      try {
        // The response.credential contains the JWT token from Google
        const result = await login('google-one-tap', response.credential);
        
        if (result.success) {
          console.log('Google One Tap login successful');
          // No need to store tokens - backend sets HTTP-only cookies
        } else {
          console.error('Google One Tap login failed:', result.error);
        }
      } catch (error) {
        console.error('Google One Tap error:', error);
      }
    };

    // Initialize Google One Tap
    window.google.accounts.id.initialize({
      client_id: AUTH_CONFIG.googleClientId, // Using centralized config
      callback: handleCredentialResponse,
      auto_select: false, // Don't auto-select credentials
      cancel_on_tap_outside: true, // Cancel if user taps outside
    });

    // Display the One Tap prompt
    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed()) {
        console.log('Google One Tap not displayed:', notification.getNotDisplayedReason());
      } else if (notification.isSkippedMoment()) {
        console.log('Google One Tap skipped:', notification.getSkippedReason());
      }
    });

    // Cleanup function
    return () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.cancel();
      }
    };
  }, [login, user]);

  // This component doesn't render anything visible
  // The One Tap prompt is handled by Google's library
  return null;
};

export default GoogleOneTap;
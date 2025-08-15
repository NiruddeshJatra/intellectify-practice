import { useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AUTH_CONFIG, APP_CONFIG } from '../../config/app';
import { handleGoogleOneTapAuth } from '../../utils/oauth';

/**
 * This component automatically initializes Google One Tap sign-in when:
 * - The feature is enabled in APP_CONFIG
 * - User is not already authenticated
 * - Google Client ID is properly configured
 * - The Google API is loaded
 * 
 * It shows a non-intrusive sign-in prompt that appears automatically
 * when the component mounts and the conditions are met.
 */
const GoogleOneTap = () => {
  const { user, loading } = useAuth();
  const oneTapInitialized = useRef(false);

  useEffect(() => {
    // Skip initialization if:
    // - Feature is disabled
    // - Auth is still loading
    // - User is already authenticated
    // - Already initialized
    // - Missing Google Client ID
    if (!APP_CONFIG.features.googleOneTap || 
        loading || 
        user || 
        oneTapInitialized.current ||
        !AUTH_CONFIG.googleClientId) {
      return;
    }

    /**
     * Handles the credential response from Google One Tap
     * @param {Object} response - The credential response from Google
     */
    const handleCredentialResponse = async (response) => {
      await handleGoogleOneTapAuth(response.credential);
    };

    /**
     * Initializes the Google One Tap prompt
     */
    const initialize = () => {
      if (!window.google?.accounts?.id) {
        return;
      }

      // Cancel any existing prompts
      window.google.accounts.id.cancel();

      // Initialize with configuration
      window.google.accounts.id.initialize({
        client_id: AUTH_CONFIG.googleClientId,
        callback: handleCredentialResponse,
        use_fedcm_for_prompt: true, // Enable FedCM for better UX
        auto_select: false, // Don't auto-select the account
        context: 'signin', // Context for the sign-in flow
        ux_mode: 'popup', // Display as a popup
      });

      // Show the One Tap prompt
      window.google.accounts.id.prompt();
    };

    // Delay initialization to allow the page to load
    const timer = setTimeout(() => {
      oneTapInitialized.current = true;
      initialize();
    }, 2000); // 2 second delay

    // Cleanup function
    return () => {
      clearTimeout(timer);
      // Cancel any pending prompts when unmounting
      if (window.google?.accounts?.id) {
        window.google.accounts.id.cancel();
      }
    };
  }, [user, loading]);

  // This is a non-visual component
  return null;
};

export default GoogleOneTap;
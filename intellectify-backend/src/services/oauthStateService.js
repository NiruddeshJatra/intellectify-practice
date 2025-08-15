const crypto = require('crypto');

/**
 * OAuth State Service
 * 
 * Handles OAuth state parameter validation for CSRF protection.
 * 
 * Security Flow:
 * 1. Frontend generates random state and stores it locally
 * 2. Frontend sends user to OAuth provider with state parameter
 * 3. OAuth provider redirects back to backend with same state
 * 4. Backend validates the state to prevent CSRF attacks
 * 
 * Why State Validation is Important:
 * - Prevents CSRF attacks where malicious sites initiate OAuth flows
 * - Ensures the OAuth callback is from a legitimate request
 * - Validates the request originated from our frontend
 */

class OAuthStateService {
  /**
   * Validates OAuth state parameter
   * 
   * Current Implementation:
   * - Basic format validation (exists, not empty, reasonable length)
   * - Could be enhanced with server-side state storage for stronger security
   * 
   * @param {string} receivedState - State parameter from OAuth callback
   * @param {string} userAgent - User agent for additional validation
   * @returns {Object} Validation result
   */
  validateState(receivedState, userAgent = null) {
    // Basic validation - state must exist and be non-empty
    if (!receivedState) {
      return {
        valid: false,
        error: 'Missing state parameter',
        code: 'MISSING_STATE'
      };
    }

    // State should be a reasonable length (not too short, not too long)
    if (receivedState.length < 8) {
      return {
        valid: false,
        error: 'State parameter too short',
        code: 'INVALID_STATE_LENGTH'
      };
    }

    if (receivedState.length > 128) {
      return {
        valid: false,
        error: 'State parameter too long',
        code: 'INVALID_STATE_LENGTH'
      };
    }

    // State should only contain safe characters (alphanumeric)
    if (!/^[a-zA-Z0-9]+$/.test(receivedState)) {
      return {
        valid: false,
        error: 'State parameter contains invalid characters',
        code: 'INVALID_STATE_FORMAT'
      };
    }

    // Additional validation could be added here:
    // - Check against server-side stored states
    // - Validate timestamp if encoded in state
    // - Check user agent consistency
    
    return {
      valid: true,
      state: receivedState
    };
  }

  /**
   * Enhanced state validation (for future implementation)
   * 
   * This would require storing states server-side (Redis/Database)
   * and validating against stored values for stronger security.
   * 
   * @param {string} receivedState 
   * @param {string} sessionId 
   * @returns {Object} Validation result
   */
  async validateStoredState(receivedState, sessionId) {
    // TODO: Implement server-side state storage validation
    // 1. Check if state exists in storage (Redis/Database)
    // 2. Validate it hasn't expired (e.g., 10 minutes)
    // 3. Ensure it hasn't been used before (one-time use)
    // 4. Remove from storage after validation
    
    return this.validateState(receivedState);
  }

  /**
   * Generates a cryptographically secure state parameter
   * 
   * Note: Currently the frontend generates the state.
   * This method is provided for potential server-side state generation.
   * 
   * @returns {string} Secure random state
   */
  generateSecureState() {
    return crypto.randomBytes(16).toString('hex');
  }
}

module.exports = new OAuthStateService();
const oauthStateService = require('../services/oauthStateService');

describe('OAuthStateService', () => {
  describe('validateState', () => {
    test('should accept valid state', () => {
      const validState = 'abc123def456';
      const result = oauthStateService.validateState(validState);
      
      expect(result.valid).toBe(true);
      expect(result.state).toBe(validState);
    });

    test('should reject missing state', () => {
      const result = oauthStateService.validateState(null);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing state parameter');
      expect(result.code).toBe('MISSING_STATE');
    });

    test('should reject empty state', () => {
      const result = oauthStateService.validateState('');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing state parameter');
    });

    test('should reject state that is too short', () => {
      const result = oauthStateService.validateState('abc123');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('State parameter too short');
      expect(result.code).toBe('INVALID_STATE_LENGTH');
    });

    test('should reject state that is too long', () => {
      const longState = 'a'.repeat(129);
      const result = oauthStateService.validateState(longState);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('State parameter too long');
      expect(result.code).toBe('INVALID_STATE_LENGTH');
    });

    test('should reject state with invalid characters', () => {
      const result = oauthStateService.validateState('abc123!@#');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('State parameter contains invalid characters');
      expect(result.code).toBe('INVALID_STATE_FORMAT');
    });

    test('should accept state with mixed alphanumeric characters', () => {
      const result = oauthStateService.validateState('AbC123dEf456GhI789');
      
      expect(result.valid).toBe(true);
      expect(result.state).toBe('AbC123dEf456GhI789');
    });
  });

  describe('generateSecureState', () => {
    test('should generate a secure state', () => {
      const state = oauthStateService.generateSecureState();
      
      expect(state).toBeDefined();
      expect(typeof state).toBe('string');
      expect(state.length).toBe(32); // 16 bytes = 32 hex chars
      expect(/^[a-f0-9]+$/.test(state)).toBe(true);
    });

    test('should generate unique states', () => {
      const state1 = oauthStateService.generateSecureState();
      const state2 = oauthStateService.generateSecureState();
      
      expect(state1).not.toBe(state2);
    });
  });
});
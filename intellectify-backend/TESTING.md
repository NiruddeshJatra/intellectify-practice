# Testing Guide for Authentication System

## Installation

First, install the testing dependencies:

```bash
yarn add --dev jest supertest
```

## Test Scripts

### 1. Unit Tests
Comprehensive tests for authentication system:
```bash
yarn test
```

### 2. Manual API Testing
Live server testing with real HTTP requests:
```bash
yarn test:manual
```

### 4. Watch Mode (for development)
```bash
yarn test:watch
```

### 5. Coverage Report
```bash
yarn test:coverage
```

## Test Categories

### Critical Fixes Tests (`test-fixes.js`)
- ✅ Crypto import in tokenService
- ✅ TokenService import in authController  
- ✅ JWT secret consistency
- ✅ Basic token generation
- ✅ App initialization

### API Integration Tests (`scripts/test-auth.js`)
- 🌐 Health check endpoint
- 🔒 CORS configuration
- 🔐 Authentication endpoints
- 📱 OAuth callback endpoints
- 🛡️ Error handling

### Unit Tests (`tests/auth.test.js`)
- 🧪 Token service functions
- 🔍 Authentication middleware
- 📊 Controller methods
- 🚨 Error scenarios

## Running Tests

### Prerequisites
1. **Environment Variables**: Ensure `.env` file has required variables
2. **Database**: Some tests require database connection
3. **Server**: Manual tests require running server (`yarn dev`)

### Test Order
1. **Start with**: `yarn test` (comprehensive unit tests)
2. **Then run**: `yarn test:manual` (requires running server)

## Test Results Interpretation

### ✅ Success Indicators
- All imports work without errors
- Tokens generate correctly
- API endpoints respond as expected
- CORS allows correct origins
- Error handling works properly

### ❌ Failure Indicators
- Import errors (missing dependencies)
- Token generation failures
- Unexpected API responses
- CORS blocks legitimate requests
- Poor error handling

## Manual Testing Checklist

After automated tests pass, manually verify:

- [ ] Complete Google OAuth flow
- [ ] Complete GitHub OAuth flow  
- [ ] HTTP-only cookies are set
- [ ] Token refresh works
- [ ] Logout clears cookies
- [ ] Frontend integration works

## Troubleshooting

### Common Issues

1. **"Cannot find module 'jest'"**
   ```bash
   yarn add --dev jest supertest
   ```

2. **"Prisma client not found"**
   ```bash
   yarn prisma generate
   ```

3. **"Database connection failed"**
   - Check DATABASE_URL in .env
   - Ensure PostgreSQL is running

4. **"CORS errors in manual tests"**
   - Verify FRONTEND_URL in .env
   - Check server is running on correct port

### Environment Setup

Create `.env.test` for test-specific variables:
```env
NODE_ENV=test
DATABASE_URL=postgresql://test:test@localhost:5432/test_db
JWT_ACCESS_SECRET=test-access-secret
JWT_REFRESH_SECRET=test-refresh-secret
```

## CI/CD Integration

Add to your CI pipeline:
```yaml
- name: Install dependencies
  run: yarn install --frozen-lockfile

- name: Run tests
  run: yarn test

- name: Test critical fixes
  run: yarn test:fixes
```
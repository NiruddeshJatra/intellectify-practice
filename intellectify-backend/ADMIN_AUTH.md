# Admin Authentication System

This document describes the admin authentication system implemented for the Content Writing System feature.

## Overview

The admin authentication system provides email/password authentication for admin users, separate from the existing OAuth-based authentication for regular users. It integrates seamlessly with the existing JWT token system.

## Components

### 1. AdminAuthService (`src/services/adminAuthService.js`)

Handles admin-specific authentication logic:

- **`authenticateAdmin(email, password)`** - Authenticates admin with email/password
- **`createAdmin(email, password, name)`** - Creates new admin user (script use only)
- **`validateAdminCredentials(email, password)`** - Validates credentials without full auth
- **`hashPassword(password)`** - Hashes passwords using bcrypt (12 salt rounds)
- **`verifyPassword(password, hash)`** - Verifies password against hash
- **`setAdminAuthCookies(user, userAgent, res)`** - Sets JWT cookies for admin

### 2. AdminAuthController (`src/controllers/adminAuthController.js`)

HTTP request handlers for admin authentication:

- **`adminLogin`** - Handles POST `/api/admin/auth/login`
- **`validateAdminCredentials`** - Handles POST `/api/admin/auth/validate`

### 3. Admin Auth Routes (`src/routes/adminAuth.js`)

Defines admin authentication endpoints:

- `POST /api/admin/auth/login` - Admin login
- `POST /api/admin/auth/validate` - Credential validation
- `GET /api/admin/auth/me` - Get admin user info (protected)

### 4. Enhanced Auth Middleware (`src/middleware/auth.js`)

Extended existing middleware with:

- **`authenticateAdmin`** - Combined authentication + admin role check

### 5. Admin Creation Script (`scripts/createAdmin.js`)

Secure script for creating admin users:

- Interactive password input (hidden)
- Password strength validation
- Email format validation
- Duplicate user checking
- Colorized terminal output

## API Endpoints

### POST /api/admin/auth/login

Authenticates admin user with email/password.

**Request:**
```json
{
  "email": "admin@example.com",
  "password": "SecurePassword123!"
}
```

**Response (Success):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "admin@example.com",
    "name": "Admin User",
    "avatar": null,
    "role": "ADMIN"
  }
}
```

**Cookies Set:**
- `access_token` (HTTP-only)
- `refresh_token` (HTTP-only)

### POST /api/admin/auth/validate

Validates admin credentials (internal use).

**Request:**
```json
{
  "email": "admin@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "valid": true
}
```

### GET /api/admin/auth/me

Gets current admin user information (requires authentication).

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "admin@example.com",
    "name": "Admin User",
    "avatar": null,
    "role": "ADMIN",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

## Usage

### Creating Admin Users

Use the secure creation script:

```bash
npm run admin:create
```

Or directly:

```bash
node scripts/createAdmin.js
```

The script will prompt for:
- Admin email (validated)
- Admin name (minimum 2 characters)
- Password (strength validated)
- Password confirmation

### Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### Integration with Existing System

The admin authentication system:

- Uses the same JWT token system as OAuth users
- Shares the same authentication middleware
- Uses the same cookie-based token storage
- Integrates with existing refresh token rotation
- Maintains the same security standards

## Security Features

### Password Security
- bcrypt hashing with 12 salt rounds
- Password strength validation
- Generic error messages (prevents user enumeration)

### Authentication Security
- HTTP-only cookies for token storage
- JWT token integration with existing system
- Admin role validation
- Session management with refresh tokens

### Input Validation
- Email format validation
- Password strength requirements
- Duplicate user prevention
- Sanitized error responses

## Database Schema

Admin users use the existing User model with:

- `password`: Hashed password (nullable for OAuth users)
- `provider`: NULL for admin users
- `providerAccountId`: NULL for admin users
- `role`: 'ADMIN' for admin users

## Testing

Run admin authentication tests:

```bash
npm test -- --testPathPatterns=adminAuth.test.js
```

Tests cover:
- Password hashing and verification
- API endpoint responses
- Error handling
- Input validation

## Error Codes

- `MISSING_CREDENTIALS` - Email or password not provided
- `INVALID_CREDENTIALS` - Authentication failed
- `ADMIN_ACCESS_REQUIRED` - User is not admin
- `VALIDATION_FAILED` - Credential validation error
- `AUTH_FAILED` - General authentication failure

## Environment Variables

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_ACCESS_SECRET` - JWT signing secret

## Future Enhancements

Potential improvements:
- Account lockout after failed attempts
- Password reset functionality
- Two-factor authentication
- Admin activity logging
- Session management dashboard
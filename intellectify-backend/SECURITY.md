# 🔒 Security Implementation

## Overview

This document details the security measures implemented in the Intellectify backend, covering authentication, authorization, data protection, and secure coding practices.

## 🔐 Authentication

### JWT Authentication
- **Token-based authentication** using JSON Web Tokens (JWT)
- **Dual-token system**: Access token (15min) and Refresh token (7 days)
- **Secure storage**: HTTP-only, same-site cookies for both tokens
- **Token validation**: Signature verification and expiration checks
- **Token refresh**: Secure refresh token rotation

### OAuth 2.0 Integration
- **Google OAuth 2.0** with state parameter validation
- **GitHub OAuth** with state parameter validation
- **Secure callback handling** with CSRF protection
- **Automatic user creation** for new OAuth users

### Admin Authentication
- **Email/Password authentication** for admin users
- **Role-based access control** (RBAC) with 'ADMIN' role
- **Rate limiting**: 100 requests/15 minutes for admin endpoints
- **Secure password hashing** with bcrypt (12 rounds)
- **Account lockout** after multiple failed attempts

## 🛡️ Authorization

### Role-Based Access Control (RBAC)
- **ADMIN**: Full system access (content management, user management)
- **User**: Access to published content, own profile management

### Endpoint Protection
- **Authentication middleware** for protected routes
- **Admin-only middleware** for admin endpoints
- **Content ownership validation** for modifications
- **Rate limiting** on sensitive endpoints

## 🛡️ Data Protection

### Input Validation & Sanitization
- **Request validation** using custom validators
- **HTML sanitization** for rich text content (DOMPurify)
- **File type validation** for uploads (JPG, PNG, GIF, WebP)
- **File size limits** (5MB per file)
- **Parameter sanitization** to prevent injection attacks

### Security Headers
- **Strict-Transport-Security (HSTS)**
- **X-Content-Type-Options: nosniff**
- **X-Frame-Options: DENY**
- **X-XSS-Protection: 1; mode=block**
- **Content-Security-Policy** with strict directives
- **Referrer-Policy: strict-origin-when-cross-origin**
- **X-Frame-Options: DENY**
- **X-XSS-Protection: 1; mode=block**
- **Referrer-Policy: strict-origin-when-cross-origin**

### File Upload Security
- **File type verification** (whitelist approach)
- **File size limits** (configurable)
- **Malware scanning** (if integrated with antivirus)
- **Content-Disposition headers** for secure file downloads
- **Virus scanning** for uploaded files

## 🔄 Session Management

### Secure Session Configuration
- **HTTP-only cookies** for token storage
- **Secure flag** for HTTPS-only transmission
- **SameSite=Lax** to prevent CSRF
- **Token expiration** and automatic renewal
- **Concurrent session control**

## 🚨 Security Headers

All responses include the following security headers:

```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self';
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

## 🛡️ OAuth Security

### State Parameter Validation
- **Random state generation** for each OAuth flow
- **State validation** on callback
- **State expiration** (default: 10 minutes)
- **One-time use** state tokens

### Secure Token Handling
- **No token storage** in client-side storage
- **Short-lived access tokens**
- **Secure refresh token rotation**
- **Token binding** to client IP/user agent

## 🚦 Rate Limiting

- **Login attempts**: 5 attempts per 15 minutes
- **API requests**: 1000 requests per hour (per IP)
- **Password reset**: 3 requests per hour (per account)
- **OAuth flows**: 10 requests per minute (per IP)
- **Admin endpoints**: 100 requests per 15 minutes
- **File uploads**: 20 requests per hour
- **Authentication endpoints**: 10 requests per minute
- **IP-based tracking** to prevent abuse
- **Redis-based rate limiting** for distributed environments

## Security Middleware Components

### 1. Admin Security Middleware (`adminSecurityMiddleware`)

**Location**: `src/middleware/security.js`

**Purpose**: Provides additional security checks beyond basic authentication for admin endpoints.

**Features**:
- Verifies user is authenticated and has ADMIN role
- Adds security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection)
- Consistent error response format with timestamps

**Usage**:
```javascript
router.post('/admin-endpoint', 
  authenticateAdmin, 
  adminSecurityMiddleware,
  controllerFunction
);
```

### 2. Content Ownership Validation (`validateContentOwnership`)

**Location**: `src/middleware/security.js`

**Purpose**: Ensures users can only access/modify their own content.

**Features**:
- Validates UUID format for content IDs
- Prevents invalid content ID formats from reaching the database
- Stores validated content ID for use in controllers
- Comprehensive error handling with specific error codes

**Usage**:
```javascript
router.put('/:id', 
  authenticateAdmin, 
  adminSecurityMiddleware,
  validateContentOwnership,
  contentController.updateContent
);
```

### 3. Input Sanitization (`sanitizeRichTextInput`)

**Location**: `src/middleware/security.js`

**Purpose**: Prevents XSS attacks while preserving safe HTML formatting.

**Features**:
- Uses DOMPurify for HTML sanitization
- Allows safe HTML tags for rich text content
- Sanitizes text fields (title, excerpt, meta fields)
- Configurable allowed tags and attributes

**Allowed HTML Tags**:
- Text formatting: `p`, `br`, `strong`, `em`, `u`
- Headers: `h1`, `h2`, `h3`, `h4`, `h5`, `h6`
- Lists: `ul`, `ol`, `li`
- Other: `blockquote`, `a`, `img`, `figure`, `figcaption`, `table`, `thead`, `tbody`, `tr`, `th`, `td`, `div`, `span`

**Allowed Attributes**:
- `href`, `src`, `alt`, `title`, `class`, `id`, `style`, `width`, `height`, `target`, `rel`

### 4. File Upload Security (`validateFileUpload`)

**Location**: `src/middleware/security.js`

**Purpose**: Enhanced security checks for uploaded files.

**Features**:
- File size validation (5MB limit)
- MIME type validation (images only)
- File extension validation
- Magic byte validation for file content verification
- Filename sanitization
- Comprehensive error handling

**Supported File Types**:
- JPEG/JPG
- PNG
- GIF
- WebP

### 5. Rate Limiting

**Admin Rate Limit**: 100 requests per 15 minutes per IP
**Upload Rate Limit**: 20 uploads per 15 minutes per IP

## Enhanced Authentication Middleware

### Updated `authenticateUser`

**Location**: `src/middleware/auth.js`

**Enhancements**:
- Enhanced token payload validation
- Additional JWT error handling (NotBeforeError)
- Security headers for all authenticated requests
- Consistent error response format with timestamps

### Updated `authenticateAdmin`

**Location**: `src/middleware/auth.js`

**Enhancements**:
- Improved role validation with logging
- Additional security headers for admin endpoints
- Enhanced error handling and logging
- Consistent error response format

## Security Headers

### Global Security Headers

Applied to all responses via `app.js`:

```javascript
res.setHeader('X-Content-Type-Options', 'nosniff');
res.setHeader('X-Frame-Options', 'DENY');
res.setHeader('X-XSS-Protection', '1; mode=block');
res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
```

### Admin-Specific Headers

Additional headers for admin endpoints:
- `Referrer-Policy: strict-origin-when-cross-origin`
- Enhanced XSS protection

## Input Validation

### Content Validation

**Title**: Maximum 200 characters
**Content**: Maximum 100,000 characters
**Priority**: Non-negative numbers only

### File Upload Validation

**Size**: Maximum 5MB
**Types**: Images only (JPEG, PNG, GIF, WebP)
**Content**: Magic byte validation
**Filename**: Sanitized to prevent directory traversal

## Error Handling

### Consistent Error Format

All security-related errors follow this format:

```javascript
{
  success: false,
  error: "Error message",
  code: "ERROR_CODE",
  timestamp: "2024-01-15T10:30:00Z"
}
```

### Error Codes

- `MISSING_TOKEN`: No authentication token provided
- `INVALID_TOKEN`: Invalid JWT token
- `TOKEN_EXPIRED`: JWT token has expired
- `ADMIN_ACCESS_REQUIRED`: Admin role required
- `INVALID_CONTENT_ID`: Invalid UUID format for content ID
- `VALIDATION_ERROR`: Input validation failed
- `FILE_SIZE_EXCEEDED`: File size too large
- `INVALID_FILE_TYPE`: Unsupported file type
- `EXTENSION_MISMATCH`: File extension doesn't match MIME type
- `INVALID_FILE_CONTENT`: File content doesn't match declared type
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `UPLOAD_RATE_LIMIT_EXCEEDED`: Too many file uploads

## Route Protection

### Admin-Only Routes

All admin routes are protected with multiple middleware layers:

```javascript
router.post('/content', 
  adminRateLimit,           // Rate limiting
  authenticateAdmin,        // Authentication + role check
  adminSecurityMiddleware,  // Additional security checks
  sanitizeRichTextInput,    // Input sanitization
  contentController.createContent
);
```

### Content Management Routes

Content CRUD operations include ownership validation:

```javascript
router.put('/content/:id', 
  authenticateAdmin, 
  adminSecurityMiddleware,
  validateContentOwnership,  // Ownership validation
  sanitizeRichTextInput,
  contentController.updateContent
);
```

### File Upload Routes

File uploads have the most restrictive security:

```javascript
router.post('/images/upload',
  uploadRateLimit,          // Stricter rate limiting
  authenticateAdmin,
  adminSecurityMiddleware,
  upload.single('image'),   // Multer with file filtering
  validateFileUpload,       // Enhanced file validation
  imageController.uploadImage
);
```

## Testing

### Security Test Coverage

**Location**: `tests/security.test.js`, `tests/security-integration.test.js`

**Test Categories**:
1. Admin-only endpoint protection
2. Content ownership validation
3. Input sanitization
4. File upload security validation
5. Error handling consistency
6. Security headers verification
7. Input validation limits

### Running Security Tests

```bash
# Basic security tests
yarn test -- --testPathPatterns=security.test.js

# Integration tests (requires database)
yarn test -- --testPathPatterns=security-integration.test.js
```

## Security Best Practices Implemented

1. **Defense in Depth**: Multiple layers of security checks
2. **Principle of Least Privilege**: Admin-only access to sensitive operations
3. **Input Validation**: All user inputs are validated and sanitized
4. **Output Encoding**: HTML content is properly sanitized
5. **Rate Limiting**: Prevents brute force and DoS attacks
6. **Secure Headers**: Comprehensive security headers
7. **Error Handling**: Consistent, secure error responses
8. **Logging**: Security events are logged for monitoring
9. **File Upload Security**: Comprehensive file validation
10. **Content Security**: XSS prevention and content sanitization

## Monitoring and Logging

### Security Events Logged

- Failed authentication attempts
- Non-admin users attempting admin endpoints
- File upload violations
- Rate limit violations
- Input validation failures

### Log Format

```javascript
{
  timestamp: "2024-01-15T10:30:00Z",
  level: "WARN",
  message: "Security event description",
  userId: "user-id",
  endpoint: "/api/endpoint",
  ip: "client-ip"
}
```

## Future Security Enhancements

1. **CSRF Protection**: Implement CSRF tokens for state-changing operations
2. **Content Security Policy**: More restrictive CSP headers
3. **Session Management**: Enhanced session security
4. **Audit Logging**: Comprehensive audit trail
5. **Intrusion Detection**: Automated threat detection
6. **File Scanning**: Virus/malware scanning for uploads
7. **IP Whitelisting**: Admin access restrictions
8. **Two-Factor Authentication**: Additional authentication layer

## Dependencies

### Security-Related Packages

- `express-rate-limit`: Rate limiting middleware
- `helmet`: Security headers middleware
- `isomorphic-dompurify`: HTML sanitization
- `validator`: Input validation utilities
- `bcrypt`: Password hashing (existing)
- `jsonwebtoken`: JWT token handling (existing)

### Installation

```bash
yarn add express-rate-limit helmet isomorphic-dompurify validator
```

## Configuration

### Environment Variables

Security-related environment variables should be configured:

```env
JWT_ACCESS_SECRET=your-secret-key
NODE_ENV=production
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100
UPLOAD_RATE_LIMIT_MAX=20
MAX_FILE_SIZE=5242880        # 5MB
```

This comprehensive security implementation ensures that the Content Writing System is protected against common web vulnerabilities while maintaining usability for legitimate admin users.
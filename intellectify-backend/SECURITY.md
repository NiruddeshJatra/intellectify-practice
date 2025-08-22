# Security Implementation Documentation

This document outlines the comprehensive security measures implemented for the Content Writing System.

## Overview

The security implementation includes multiple layers of protection:

1. **Admin-only endpoint protection middleware**
2. **Content ownership validation for edit/delete operations**
3. **Input sanitization for rich text content to prevent XSS**
4. **Comprehensive error handling for all admin and content endpoints**
5. **File upload security validation (file type, size limits)**

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
npm test -- --testPathPatterns=security.test.js

# Integration tests (requires database)
npm test -- --testPathPatterns=security-integration.test.js
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
npm install express-rate-limit helmet isomorphic-dompurify validator
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
# Intellectify Backend

[![Node.js](https://img.shields.io/badge/Node.js-18.x-green)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-lightgrey)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.x-2D3748?logo=prisma)](https://www.prisma.io/)
[![Jest](https://img.shields.io/badge/Jest-29.x-C21325?logo=jest)](https://jestjs.io/)

## Overview

Intellectify is a secure content management system with comprehensive authentication and authorization. This backend service is built with Node.js, Express, and Prisma, providing RESTful APIs for content management, user authentication, and admin operations.

## ✨ Features

- **Authentication & Authorization**
  - JWT with access/refresh tokens
  - Google & GitHub OAuth 2.0 with state validation
  - Admin-specific email/password authentication
  - Role-based access control (ADMIN/User)
  - Rate limiting (100 requests/15min for admin endpoints)
  - Secure HTTP-only cookies for token storage

- **Content Management**
  - Rich text content with HTML sanitization
  - Image uploads (5MB max, JPG/PNG/GIF/WebP)
  - Content categorization and subcategorization
  - Draft/Published content states
  - Priority-based content ordering

- **Security**
  - CSRF protection with same-site cookies
  - XSS prevention through input sanitization
  - Secure file upload validation
  - Content ownership validation
  - Security headers (CSP, HSTS, XSS-Protection)
  - Request rate limiting

## 🚀 Quick Start

### Prerequisites

- Node.js 18.x or later
- npm 9.x or later
- PostgreSQL 14.x or later
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/intellectify/intellectify-backend.git
cd intellectify-backend

# Install dependencies
yarn install

# Set up environment variables
cp .env.example .env
```

### Database Setup

```bash
# Run database migrations
npx prisma migrate dev

# Create an admin user (follow prompts)
node scripts/createAdmin.js

# Seed initial data (if available)
npx prisma db seed

# Open Prisma Studio (optional)
npx prisma studio
```

### Running the Server

```bash
# Development mode with hot-reload
yarn dev

# Production mode
yarn start

# Run tests
yarn test
```

## 🛠 Development

### Available Scripts

```bash
# Run tests
yarn test

# Run tests with coverage
yarn test:coverage

# Lint code
yarn lint

# Format code
yarn format

# Check for security vulnerabilities
yarn audit
```

### Environment Variables

Required environment variables (`.env`):

```env
# Server
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/intellectify"

# JWT Authentication
JWT_ACCESS_SECRET=your_access_token_secret
JWT_REFRESH_SECRET=your_refresh_token_secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://localhost:3000/api/auth/github/callback

# File Uploads
MAX_FILE_SIZE=5242880  # 5MB in bytes
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,image/webp
UPLOAD_PATH=./uploads

# Rate Limiting
ADMIN_RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
ADMIN_RATE_LIMIT_MAX=100           # Max requests per window
UPLOAD_RATE_LIMIT_WINDOW_MS=3600000 # 1 hour
UPLOAD_RATE_LIMIT_MAX=20           # Max uploads per hour
```

## 📚 API Documentation

### Authentication

#### Admin Authentication

##### Login
```http
POST /api/admin/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "securepassword"
}

# Response (200 OK)
{
  "success": true,
  "user": {
    "id": "user-id",
    "email": "admin@example.com",
    "name": "Admin User",
    "avatar": "https://...",
    "role": "ADMIN"
  }
}
# Sets HTTP-only cookies: access_token, refresh_token
```

##### Get Current Admin
```http
GET /api/admin/auth/me
Authorization: Bearer <admin_token>

# Response (200 OK)
{
  "id": "user-id",
  "email": "admin@example.com",
  "name": "Admin User",
  "avatar": "https://...",
  "role": "ADMIN"
}
```

### OAuth Authentication

#### Google OAuth
```http
# Start OAuth flow
GET /api/auth/google

# OAuth callback
GET /api/auth/google/callback

# One-Tap Sign-In
POST /api/auth/google-one-tap
Content-Type: application/json

{
  "credential": "google-jwt-token"
}
```

#### GitHub OAuth
```http
# Start OAuth flow
GET /api/auth/github

# OAuth callback
GET /api/auth/github/callback
```

### Session Management

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>

# Response (200 OK)
{
  "id": "user-id",
  "email": "user@example.com",
  "name": "User Name",
  "avatar": "https://...",
  "role": "USER"
}
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>

# Response (200 OK)
{
  "success": true,
  "message": "Successfully logged out"
}
# Clears HTTP-only cookies
```

### Content Management (Admin)

#### Create Content
```http
POST /api/admin/content
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "title": "New Article",
  "content": "<p>Article content</p>",
  "excerpt": "Article excerpt",
  "category": "WEB_DEVELOPMENT",
  "status": "DRAFT",
  "subcategory": "Optional subcategory",
  "priority": 1,
  "metaTitle": "SEO Title",
  "metaDescription": "SEO Description"
}

# Response (201 Created)
{
  "id": "content-id",
  "title": "New Article",
  "status": "DRAFT",
  "createdAt": "2023-01-01T00:00:00.000Z"
}
```

#### Update Content
```http
PUT /api/admin/content/:id
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "title": "Updated Title",
  "status": "PUBLISHED"
  // Other fields are optional
}
```

### Media Management (Admin)

#### Upload Temporary Image
```http
POST /api/images/upload-temp
Content-Type: multipart/form-data
Authorization: Bearer <admin_token>

# Form data: file=<image_file>

# Response (200 OK)
{
  "filename": "unique-filename.jpg",
  "path": "/uploads/temp/unique-filename.jpg",
  "url": "http://localhost:3000/uploads/temp/unique-filename.jpg",
  "size": 12345,
  "mimetype": "image/jpeg"
}
```

## 🔒 Security

Security is a top priority. Key security features include:

- **Authentication**: JWT with access/refresh tokens
- **Authorization**: Role-based access control (RBAC)
- **Input Validation**: All user inputs are validated and sanitized
- **File Uploads**: Strict validation of file types and sizes (max 5MB)
- **Cookies**: HTTP-only, secure, same-site cookies for token storage
- **Password Hashing**: bcrypt with minimum 12 rounds of hashing
- **CSRF Protection**: Implemented via same-site cookies
- **Rate Limiting**: Protection against brute force attacks

For detailed security practices, see [SECURITY.md](./SECURITY.md).

## 🧪 Testing

The test suite includes:

- Unit tests for services and utilities
- Integration tests for API endpoints
- Security tests for authentication and authorization
- Performance tests for critical paths

Run tests:
```bash
yarn test
yarn test:coverage  # For coverage report
```

See [TESTING.md](./TESTING.md) for more details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---


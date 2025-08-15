# Intellectify Backend

## Overview
This is the backend service for the Intellectify application, built with Node.js, Express, and Prisma. It provides RESTful API endpoints for user authentication, authorization, and core application functionality.

## Features

### Authentication
- Google OAuth 2.0 authentication
- GitHub OAuth authentication
- JWT-based session management
- Secure password hashing

### User Management
- User registration and profile management
- Session management
- Role-based access control

## Prerequisites

- Node.js 16.x or later
- npm 8.x or later
- PostgreSQL 13.x or later
- Git

## Getting Started

### 1. Clone the repository
```bash
git clone <repository-url>
cd intellectify-backend
```

### 2. Install dependencies
```bash
npm install
```

### 4. Database Setup
```bash
# Run database migrations
npx prisma migrate dev

# Seed initial data (if applicable)
npx prisma db seed
```

### 5. Start the development server
```bash
# Development mode with hot-reload
npm run dev

# Production mode
npm start
```

## Available Scripts

- `npm run dev`: Start the development server with hot-reload
- `npm start`: Start the production server
- `npm test`: Run tests
- `npm run lint`: Run ESLint
- `npm run format`: Format code with Prettier
- `npx prisma studio`: Open Prisma Studio for database management

## API Documentation

### Authentication Endpoints

#### Google OAuth
- `GET /api/auth/google/callback`: Google OAuth callback URL
- `POST /api/auth/google-one-tap`: Handle Google One-Tap sign-in

#### GitHub OAuth
- `GET /api/auth/github/callback`: GitHub OAuth callback URL

#### Session Management
- `GET /api/auth/me`: Get current user session (Protected)
- `POST /api/auth/logout`: Logout current user (Protected)

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| PORT | Server port | No | 3000 |
| NODE_ENV | Environment (development/production) | Yes | - |
| DATABASE_URL | PostgreSQL connection URL | Yes | - |
| GOOGLE_CLIENT_ID | Google OAuth client ID | Yes | - |
| GOOGLE_CLIENT_SECRET | Google OAuth client secret | Yes | - |
| GITHUB_CLIENT_ID | GitHub OAuth client ID | Yes | - |
| GITHUB_CLIENT_SECRET | GitHub OAuth client secret | Yes | - |
| JWT_SECRET | Secret key for JWT tokens | Yes | - |
| SESSION_SECRET | Secret key for session encryption | Yes | - |

## Testing

Run the test suite:
```bash
npm test
```

## Troubleshooting

- **Database connection issues**: Verify `DATABASE_URL` in `.env`
- **OAuth errors**: Ensure callback URLs are correctly configured in OAuth providers
- **CORS issues**: Verify `FRONTEND_URL` and `BACKEND_URL` in `.env`

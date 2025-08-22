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

### Content Categories

The following categories are available for content classification. These are defined as an enum in the database and are case-sensitive.

| Category Enum | Display Name |
|--------------|-------------|
| `GENERAL` | General |
| `PROGRAMMING_LANGUAGES` | Programming Languages |
| `DATA_STRUCTURES_ALGORITHMS` | Data Structures & Algorithms |
| `SYSTEM_DESIGN` | System Design |
| `TECH_INSIGHTS` | Tech Insights |
| `DATA_AI` | Data & AI |
| `WEB_DEVELOPMENT` | Web Development |

### Content Endpoints

#### Get All Categories
- `GET /api/categories`: Get a list of all available content categories
  - Response format:
    ```json
    {
      "status": "success",
      "results": 7,
      "data": [
        { "value": "GENERAL", "label": "General" },
        { "value": "PROGRAMMING_LANGUAGES", "label": "Programming Languages" },
        // ... other categories
      ]
    }
    ```

#### Content Management
- `GET /api/content`: Get published content (filterable by category)
  - Query Parameters:
    - `category`: Filter by category (optional, case-sensitive, must match enum values exactly)
    - `limit`: Number of results per page (default: 50)
    - `offset`: Number of results to skip (for pagination, default: 0)

- `POST /api/content`: Create new content (Admin only)
  - Request body should include:
    ```json
    {
      "title": "Article Title",
      "content": "<p>Article content in HTML format</p>",
      "excerpt": "Short excerpt of the article",
      "category": "TECH_INSIGHTS",
      "subcategory": "Optional subcategory",
      "status": "DRAFT"
    }
    ```
  - The `category` field must be one of the valid enum values

- `PUT /api/content/:id`: Update existing content (Admin only)
  - Same request body format as create, but all fields are optional

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

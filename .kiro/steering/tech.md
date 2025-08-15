# Technology Stack & Build System

## Backend (intellectify-backend)
- **Runtime**: Node.js 16+ with CommonJS modules
- **Framework**: Express.js 5.x
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT + Google Auth Library + OAuth 2.0
- **HTTP Client**: Axios
- **Logging**: Morgan middleware

### Backend Dependencies
- `@prisma/client`, `prisma` - Database ORM and migrations
- `express` - Web framework
- `jsonwebtoken` - JWT token handling
- `google-auth-library` - Google OAuth integration
- `cors` - Cross-origin resource sharing
- `dotenv` - Environment variable management

## Frontend (intellectify-webapp)
- **Framework**: React 19 with Vite build tool
- **UI Library**: Material-UI (MUI) v7
- **Routing**: React Router v7
- **HTTP Client**: Axios
- **Authentication**: @react-oauth/google

## Code Quality Tools
- **Linting**: ESLint 9.x with recommended configs
- **Formatting**: Prettier with consistent settings across projects
- **Git Hooks**: Husky for pre-commit quality checks
- **Package Manager**: Yarn (preferred) or npm

### Prettier Configuration (Consistent across projects)
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "endOfLine": "lf"
}
```

## Common Commands

### Backend Development
```bash
# Development with hot reload
npm run dev

# Production start
npm start

# Database operations
npx prisma migrate dev
npx prisma db seed
npm run db:reset

# Code quality
npm run lint
npm run format
```

### Frontend Development
```bash
# Development server
yarn dev

# Production build
yarn build
yarn preview

# Code quality
yarn lint
yarn lint:fix
yarn format
```

### Environment Setup
Both projects require `.env` files with OAuth credentials, database URLs, and JWT secrets. Never commit these files to version control.
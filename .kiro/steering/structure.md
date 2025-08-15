# Project Organization & Structure

## Repository Layout
This is a monorepo containing two main applications:

```
├── intellectify-backend/     # Node.js Express API server
├── intellectify-webapp/      # React frontend application
├── package.json             # Root workspace dependencies
└── .kiro/                   # Kiro AI assistant configuration
```

## Backend Structure (intellectify-backend/)
```
intellectify-backend/
├── app.js                   # Main application entry point
├── package.json             # Backend dependencies and scripts
├── .env                     # Environment variables (not in git)
├── prisma/                  # Database schema and migrations
├── src/
│   ├── config/             # Configuration files
│   ├── controllers/        # Route handlers and business logic
│   ├── middleware/         # Express middleware functions
│   ├── routes/             # API route definitions
│   ├── services/           # Business logic and external integrations
│   └── utils/              # Helper functions and utilities
└── node_modules/           # Dependencies
```

## Frontend Structure (intellectify-webapp/)
```
intellectify-webapp/
├── index.html              # HTML template
├── package.json            # Frontend dependencies and scripts
├── vite.config.js          # Vite build configuration
├── .env                    # Environment variables (not in git)
├── src/
│   ├── App.jsx             # Main React component
│   ├── main.jsx            # Application entry point
│   ├── components/         # Reusable UI components
│   ├── contexts/           # React Context providers
│   ├── pages/              # Page-level components
│   ├── services/           # API client and external services
│   └── utils/              # Helper functions and utilities
└── node_modules/           # Dependencies
```

## Key Conventions

### File Naming
- **Backend**: Use camelCase for JavaScript files (`authController.js`)
- **Frontend**: Use PascalCase for React components (`UserProfile.jsx`)
- **Configuration**: Use kebab-case for config files (`eslint.config.mjs`)

### Import/Export Patterns
- **Backend**: CommonJS modules (`require`/`module.exports`)
- **Frontend**: ES6 modules (`import`/`export`)

### Environment Files
- Each project has its own `.env` file in its root directory
- Environment variables are prefixed with `VITE_` for frontend access
- Never commit `.env` files - they're in `.gitignore`

### Code Organization
- Keep related functionality grouped in appropriate directories
- Use `index.js` files for clean imports from directories
- Separate concerns: controllers handle HTTP, services handle business logic
- React components should be focused and reusable when possible
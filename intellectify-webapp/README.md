# 🧠 Intellectify - Internal Web Application

Internal web application for the Intellectify organization, built with React, Vite, and Material-UI.

## 🚀 Key Features

- 🔐 **Authentication**
  - Google OAuth 2.0 login
  - GitHub OAuth 2.0 login
  - Google One-Tap sign-in
  - Protected routes with authentication state management

- 🎨 **User Interface**
  - Modern, responsive design with Material-UI (MUI) components
  - Clean and intuitive navigation
  - User profile management

- 🛠️ **Development**
  - Built with React 19 and Vite
  - Client-side routing with React Router v7
  - Context API for state management
  - Axios for API requests

- 🛡️ **Security**
  - Secure token handling
  - Protected routes
  - CSRF protection

- 🛠️ **Developer Experience**
  - ESLint for code quality
  - Prettier for code formatting
  - Husky for git hooks

## 🛠️ Prerequisites

- Node.js v18+
- npm v9+ or yarn v1.22+
- Git

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone [internal-repo-url]/intellectify-webapp.git
cd intellectify-webapp
```

### 2. Install dependencies

```bash
yarn install
# or
npm install
```

### 3. Environment Setup

Create a `.env` file in the root directory with the following variables:

```env
VITE_NODE_ENV=development
VITE_APP_NAME=YourAppName
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_GITHUB_CLIENT_ID=your_github_client_id
VITE_FRONTEND_URL=http://localhost:5173
VITE_BACKEND_URL=http://localhost:3000
```

### 4. Start Development Server

```bash
yarn dev
# or
npm run dev
```

The application will be available at `http://localhost:5173`

## 📦 Available Scripts

In the project directory, you can run:

- `yarn dev` or `npm run dev` - Start the development server
- `yarn build` or `npm run build` - Build the app for production
- `yarn preview` or `npm run preview` - Preview the production build locally
- `yarn lint` or `npm run lint` - Run ESLint to check for code issues
- `yarn lint:fix` or `npm run lint:fix` - Fix auto-fixable linting issues
- `yarn format` or `npm run format` - Format code using Prettier

## 🧪 Testing

### Run Tests

```bash
# Run all tests
npm test

# Or with yarn
yarn test
```

### Test Coverage

To generate a test coverage report:

```bash
# Using npm
npm test -- --coverage

# Using yarn
yarn test --coverage
```

## 🛠️ Development

### Code Quality

- ESLint is configured for code quality
- Prettier is used for code formatting
- Git hooks with Husky ensure code quality before commit

### Folder Structure

```
src/
  ├── components/     # Reusable UI components
  ├── contexts/      # React contexts
  ├── services/      # API services
  ├── utils/         # Utility functions
  ├── App.jsx        # Main application component
  └── main.jsx       # Application entry point
```

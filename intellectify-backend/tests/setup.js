/**
 * Jest Test Setup
 * 
 * Global setup for all tests including mocks and environment configuration.
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.GITHUB_CLIENT_ID = 'test-github-client-id';

// Mock Prisma client for tests
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    content: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      deleteMany: jest.fn(),
    },
    $disconnect: jest.fn(),
  })),
}));

// Mock database config
jest.mock('../src/config/database', () => ({
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  content: {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    deleteMany: jest.fn(),
  },
  $disconnect: jest.fn(),
}));

// Global test utilities
global.testUtils = {
  mockUser: {
    id: 'test-user-123',
    email: 'test@example.com',
    name: 'Test User',
    avatar: 'https://example.com/avatar.jpg',
    role: 'REGULAR',
  },
  
  mockRefreshToken: {
    id: 'test-token-123',
    token: 'hashed-token',
    userId: 'test-user-123',
    userAgent: 'test-agent',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    revokedAt: null,
    createdAt: new Date(),
  }
};

// Suppress console.log in tests unless explicitly needed
if (!process.env.VERBOSE_TESTS) {
  global.console = {
    ...console,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}
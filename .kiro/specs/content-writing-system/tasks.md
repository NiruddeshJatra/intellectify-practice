# Implementation Plan

- [ ] 1. Database Schema Updates and Admin User Support

  - Update Prisma schema to support admin users with nullable OAuth fields and password field
  - Create Content model with status, priority, and category fields
  - Generate and run database migrations
  - _Requirements: 7.1, 7.2, 7.4, 7.5_

- [ ] 2. Admin Authentication Backend Infrastructure

  - Create AdminAuthService for email/password authentication with bcrypt hashing
  - Implement admin login endpoint with credential validation
  - Create secure admin creation script for one-time admin setup
  - Add admin authentication middleware integration with existing JWT system
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6_

- [ ] 3. Content Management Backend Services

  - Implement ContentService with CRUD operations for content management
  - Create content creation, update, and deletion endpoints with admin authorization
  - Add content retrieval endpoints for both admin and public access
  - Implement slug generation and content status management
  - _Requirements: 3.1, 3.2, 3.6, 4.4, 4.5_

- [ ] 4. Image Upload and Storage System

  - Create ImageService for local file storage with category-based organization
  - Implement image upload endpoint with file validation and unique naming
  - Add image serving middleware for public access to uploaded images
  - Create image cleanup functionality for content deletion
  - _Requirements: 2.3, 8.1, 8.2, 8.4_

- [ ] 5. Admin Authentication Frontend Components

  - Create AdminLogin component with email/password form and validation
  - Add admin login route (/admin/login) to React Router configuration
  - Integrate admin authentication with existing AuthContext
  - Implement AdminRoute component for protecting admin-only pages
  - _Requirements: 1.1, 1.2, 1.3, 1.5_

- [ ] 6. Content Editor with CKEditor 5 Integration

  - Install and configure CKEditor 5 with rich text editing capabilities
  - Create ContentEditor component with CKEditor integration
  - Implement image upload integration within the editor
  - Add content metadata fields (title, category, priority) to editor form
  - Add preview functionality to show content as it will appear when published
  - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6_

- [ ] 7. Admin Dashboard and Content Management

  - Create AdminDashboard component displaying admin's content list
  - Add "Create New Content" button linking to ContentEditor
  - Implement individual Edit and Delete actions for each content item
  - Add content status indicators (draft/published) in the content list
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [ ] 8. Content State Management and Publishing

  - Implement draft/published status toggle in ContentEditor
  - Add content publishing workflow with status updates
  - Create content saving functionality with automatic draft status
  - Add content metadata storage (author, creation date, priority)
  - _Requirements: 3.1, 3.2, 3.3, 3.5, 3.6_

- [ ] 9. Public Content Display System

  - Update HomePage component to display published content
  - Create ContentDisplay component for full article rendering
  - Implement category sidebar navigation for content filtering
  - Add responsive design for content cards and article display
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 10. Security Implementation and Input Validation

  - Add admin-only endpoint protection middleware
  - Implement content ownership validation for edit/delete operations
  - Add input sanitization for rich text content to prevent XSS
  - Create comprehensive error handling for all admin and content endpoints
  - Implement file upload security validation (file type, size limits)
  - _Requirements: 4.6, 7.3, 7.6_

- [ ] 11. Backend Testing Suite

  - Write unit tests for AdminAuthService authentication logic and password hashing
  - Create unit tests for ContentService CRUD operations and slug generation
  - Implement unit tests for ImageService file handling and path generation
  - Write integration tests for admin authentication flow and token management
  - Create integration tests for content creation and publishing workflow
  - Add API tests for admin login endpoints and error handling scenarios
  - Write API tests for content management endpoints with authorization checks
  - _Requirements: All backend requirements_

- [ ] 12. Frontend Testing Suite
  - Write component tests for AdminLogin form validation and submission
  - Create component tests for ContentEditor functionality and CKEditor integration
  - Implement component tests for AdminDashboard content listing and actions
  - Write component tests for public content display components
  - Create integration tests for admin authentication flow in frontend
  - Add integration tests for content creation and editing workflow
  - Write E2E tests for complete admin workflow (login → create content → publish)
  - Add E2E tests for public content viewing and navigation
  - _Requirements: All frontend requirements_

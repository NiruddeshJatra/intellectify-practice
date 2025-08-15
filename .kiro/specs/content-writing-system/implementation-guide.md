# Implementation Guide

This document provides detailed explanations for each task, including what will be added/changed/deleted, why these changes are necessary, and how they will be implemented. Review this before starting any task to understand the complete scope and approach.

## Task 1: Database Schema Updates and Admin User Support

### What will be changed:
- **Modified**: `intellectify-backend/prisma/schema.prisma` - Update User model
- **Added**: New Content model and ContentStatus enum
- **Added**: Database migration files
- **Modified**: Existing user data validation

### Why these changes:
- **User Model Updates**: Current model only supports OAuth users. We need to support admin users with password authentication while keeping OAuth users working.
- **Content Model**: Need a dedicated table to store blog content with status management, categorization, and metadata.
- **Nullable Fields**: Making OAuth fields nullable allows admin users (who don't use OAuth) to exist in the same table.

### How it will be implemented:
1. **User Model Changes**:
   - Make `provider` and `providerAccountId` nullable (add `?`)
   - Add nullable `password` field for admin users
   - Keep existing OAuth users unchanged
   
2. **Content Model Structure**:
   - Primary fields: id, title, content (rich text HTML)
   - Status management: status enum (DRAFT/PUBLISHED)
   - Metadata: authorId (foreign key), category, priority
   - SEO: slug (URL-friendly), metaTitle, metaDescription
   - Timestamps: createdAt, updatedAt, publishedAt
   
3. **Database Indexes**:
   - `[status, priority, createdAt]` for homepage queries
   - `[authorId]` for admin content lists
   
4. **Migration Strategy**:
   - Generate migration with `npx prisma migrate dev`
   - Existing OAuth users remain unaffected
   - New admin users will have null OAuth fields

### Files to be created/modified:
```
intellectify-backend/
├── prisma/
│   ├── schema.prisma (modified)
│   └── migrations/ (new migration files)
```

---

## Task 2: Admin Authentication Backend Infrastructure

### What will be added:
- **Added**: `intellectify-backend/src/services/adminAuthService.js`
- **Added**: `intellectify-backend/src/controllers/adminController.js`
- **Added**: `intellectify-backend/src/routes/admin.js`
- **Added**: `intellectify-backend/scripts/createAdmin.js`
- **Modified**: `intellectify-backend/app.js` to include admin routes

### Why these changes:
- **Separate Admin Auth**: Admin users need email/password authentication, different from OAuth flow
- **Security**: Password hashing with bcrypt, secure credential validation
- **Integration**: Must work with existing JWT token system for consistency
- **Admin Creation**: Secure script-only admin creation (no UI) for security

### How it will be implemented:
1. **AdminAuthService**:
   - `authenticateAdmin(email, password)`: Validate credentials and return user
   - `hashPassword(password)`: Secure password hashing with bcrypt (12+ rounds)
   - `validateCredentials(email, password)`: Check email exists and password matches
   - Integration with existing `tokenService` for JWT generation
   
2. **Admin Controller**:
   - `POST /api/admin/login`: Accept email/password, validate, return JWT cookies
   - Error handling: Invalid credentials (401), server errors (500)
   - Response format matches existing auth endpoints
   
3. **Admin Routes**:
   - Mount at `/api/admin` prefix
   - Login endpoint with validation middleware
   - Error handling middleware integration
   
4. **Admin Creation Script**:
   - Command-line script: `node scripts/createAdmin.js`
   - Environment variables for admin details
   - Password hashing before database storage
   - One-time use, no UI interface

### Files to be created/modified:
```
intellectify-backend/
├── src/
│   ├── services/adminAuthService.js (new)
│   ├── controllers/adminController.js (new)
│   └── routes/admin.js (new)
├── scripts/createAdmin.js (new)
└── app.js (modified - add admin routes)
```

---

## Task 3: Content Management Backend Services

### What will be added:
- **Added**: `intellectify-backend/src/services/contentService.js`
- **Added**: `intellectify-backend/src/controllers/contentController.js`
- **Added**: `intellectify-backend/src/routes/content.js`
- **Modified**: `intellectify-backend/app.js` to include content routes

### Why these changes:
- **Content CRUD**: Need full create, read, update, delete operations for content
- **Authorization**: Only admins can create/edit, but public can read published content
- **Status Management**: Handle draft/published states and transitions
- **Slug Generation**: SEO-friendly URLs for content

### How it will be implemented:
1. **ContentService**:
   - `createContent(authorId, contentData)`: Create new content with draft status
   - `updateContent(contentId, contentData, authorId)`: Update existing content with ownership check
   - `deleteContent(contentId, authorId)`: Delete content with ownership validation
   - `getContentById(contentId)`: Retrieve single content item
   - `getContentByAuthor(authorId)`: Get all content for admin dashboard
   - `getPublishedContent()`: Get published content for public display
   - `generateSlug(title)`: Create URL-friendly slug from title
   
2. **Content Controller**:
   - `POST /api/content`: Create content (admin only)
   - `PUT /api/content/:id`: Update content (admin only, ownership check)
   - `DELETE /api/content/:id`: Delete content (admin only, ownership check)
   - `GET /api/content/:id`: Get single content (public for published, admin for own)
   - `GET /api/content/admin`: Get admin's content (admin only)
   - `GET /api/content/published`: Get published content (public)
   
3. **Authorization Middleware**:
   - Use existing `authenticateUser` and `requireAdmin` middleware
   - Content ownership validation for edit/delete operations
   - Public access for published content viewing
   
4. **Slug Generation Logic**:
   - Convert title to lowercase, replace spaces with hyphens
   - Remove special characters, ensure uniqueness
   - Handle duplicate slugs with numeric suffixes

### Files to be created/modified:
```
intellectify-backend/
├── src/
│   ├── services/contentService.js (new)
│   ├── controllers/contentController.js (new)
│   └── routes/content.js (new)
└── app.js (modified - add content routes)
```

---

## Task 4: Image Upload and Storage System

### What will be added:
- **Added**: `intellectify-backend/src/services/imageService.js`
- **Added**: `intellectify-backend/src/controllers/imageController.js`
- **Added**: `intellectify-backend/src/routes/images.js`
- **Added**: `intellectify-backend/src/middleware/upload.js`
- **Modified**: `intellectify-backend/app.js` for image routes and static serving

### Why these changes:
- **Local Storage**: Images stored in file system, not database (performance)
- **Category Organization**: Images organized by content category for better management
- **Security**: File validation, unique naming, secure serving
- **Future S3 Migration**: Structure prepares for cloud storage migration

### How it will be implemented:
1. **ImageService**:
   - `saveImage(file, contentId, category)`: Save uploaded file with category-based path
   - `generateImagePath(category, contentId, filename)`: Create organized file path
   - `generateImageUrl(imagePath)`: Create public URL for stored image
   - `deleteImage(imagePath)`: Remove image file from storage
   - `cleanupContentImages(contentId)`: Remove all images for deleted content
   
2. **Upload Middleware**:
   - Use `multer` for file upload handling
   - File validation: type (images only), size limits
   - Temporary storage before processing
   - Error handling for invalid uploads
   
3. **Image Controller**:
   - `POST /api/images/upload`: Upload image (admin only)
   - File validation and processing
   - Return image URL for editor integration
   - Error responses for invalid files
   
4. **Storage Structure**:
   ```
   uploads/content/
   ├── technology/2024/01/content-uuid/image.jpg
   ├── education/2024/01/content-uuid/image.png
   └── general/2024/01/content-uuid/image.gif
   ```
   
5. **Static File Serving**:
   - Express static middleware for `/uploads` path
   - Public access to uploaded images
   - Proper MIME type handling

### Files to be created/modified:
```
intellectify-backend/
├── src/
│   ├── services/imageService.js (new)
│   ├── controllers/imageController.js (new)
│   ├── routes/images.js (new)
│   └── middleware/upload.js (new)
├── uploads/ (new directory structure)
└── app.js (modified - add image routes and static serving)
```

---

## Task 5: Admin Authentication Frontend Components

### What will be added:
- **Added**: `intellectify-webapp/src/components/admin/AdminLogin.jsx`
- **Added**: `intellectify-webapp/src/components/admin/AdminRoute.jsx`
- **Added**: `intellectify-webapp/src/services/adminApi.js`
- **Modified**: `intellectify-webapp/src/App.jsx` for admin routes
- **Modified**: `intellectify-webapp/src/contexts/AuthContext.jsx` for admin auth

### Why these changes:
- **Separate Admin UI**: Admin login needs different interface from OAuth
- **Route Protection**: Admin-only pages need access control
- **Auth Integration**: Must work with existing AuthContext system
- **API Integration**: Frontend needs to communicate with admin endpoints

### How it will be implemented:
1. **AdminLogin Component**:
   - Email/password form with Material-UI components
   - Form validation (required fields, email format)
   - Loading states during authentication
   - Error display for failed login attempts
   - Integration with AuthContext for login handling
   
2. **AdminRoute Component**:
   - Higher-order component for route protection
   - Check user authentication and admin role
   - Redirect non-admin users to appropriate pages
   - Loading state while checking authentication
   
3. **Admin API Service**:
   - `adminLogin(email, password)`: Call admin login endpoint
   - HTTP client configuration with cookie handling
   - Error handling and response formatting
   - Integration with existing API patterns
   
4. **AuthContext Updates**:
   - Add admin login method alongside OAuth methods
   - Handle admin authentication responses
   - Maintain existing OAuth functionality
   - Unified user state management
   
5. **Routing Updates**:
   - Add `/admin/login` route
   - Protect admin routes with AdminRoute wrapper
   - Handle authentication redirects

### Files to be created/modified:
```
intellectify-webapp/src/
├── components/admin/
│   ├── AdminLogin.jsx (new)
│   └── AdminRoute.jsx (new)
├── services/adminApi.js (new)
├── App.jsx (modified - add admin routes)
└── contexts/AuthContext.jsx (modified - add admin auth)
```

---

## Task 6: Content Editor with CKEditor 5 Integration

### What will be added:
- **Added**: CKEditor 5 npm packages
- **Added**: `intellectify-webapp/src/components/admin/ContentEditor.jsx`
- **Added**: `intellectify-webapp/src/components/admin/ContentPreview.jsx`
- **Added**: `intellectify-webapp/src/services/contentApi.js`
- **Modified**: Package dependencies

### Why these changes:
- **Rich Text Editing**: CKEditor 5 provides professional content editing experience
- **Image Integration**: Direct image upload from editor to backend
- **Preview Functionality**: Show content as it will appear when published
- **Metadata Management**: Handle title, category, priority alongside content

### How it will be implemented:
1. **CKEditor 5 Setup**:
   - Install `@ckeditor/ckeditor5-react` and `@ckeditor/ckeditor5-build-classic`
   - Configure toolbar with essential formatting options
   - Custom image upload adapter for backend integration
   - Plugin configuration for links, lists, formatting
   
2. **ContentEditor Component**:
   - Form with title, category, priority fields
   - CKEditor 5 integration for rich text content
   - Image upload handling within editor
   - Save as draft/publish buttons
   - Loading states and error handling
   - Form validation for required fields
   
3. **ContentPreview Component**:
   - Render content HTML with same styling as public view
   - Modal or side-by-side preview display
   - Real-time preview updates as user types
   - Responsive preview for different screen sizes
   
4. **Content API Service**:
   - `createContent(contentData)`: Create new content
   - `updateContent(id, contentData)`: Update existing content
   - `getContent(id)`: Retrieve content for editing
   - `uploadImage(file)`: Upload images from editor
   - Error handling and response formatting
   
5. **Image Upload Integration**:
   - Custom CKEditor upload adapter
   - Direct integration with image upload endpoint
   - Progress indication during upload
   - Error handling for failed uploads

### Files to be created/modified:
```
intellectify-webapp/
├── package.json (modified - add CKEditor dependencies)
├── src/
│   ├── components/admin/
│   │   ├── ContentEditor.jsx (new)
│   │   └── ContentPreview.jsx (new)
│   └── services/contentApi.js (new)
```

---

## Task 7: Admin Dashboard and Content Management

### What will be added:
- **Added**: `intellectify-webapp/src/components/admin/AdminDashboard.jsx`
- **Added**: `intellectify-webapp/src/pages/admin/Dashboard.jsx`
- **Modified**: `intellectify-webapp/src/App.jsx` for dashboard route

### Why these changes:
- **Content Management Hub**: Central place for admins to manage all content
- **Content Overview**: List all admin's content with status and actions
- **Quick Actions**: Easy access to create, edit, delete operations
- **User Experience**: Clean, intuitive interface for content management

### How it will be implemented:
1. **AdminDashboard Component**:
   - Content list display with Material-UI Table or Cards
   - "Create New Content" prominent button
   - Individual Edit/Delete buttons for each content item
   - Status indicators (Draft/Published badges)
   - Content metadata display (title, date, category)
   - Loading states while fetching content
   
2. **Dashboard Page**:
   - Page wrapper with navigation and layout
   - AdminRoute protection for access control
   - Error boundary for error handling
   - Responsive design for different screen sizes
   
3. **Content List Features**:
   - Fetch admin's content on component mount
   - Real-time updates after create/edit/delete operations
   - Confirmation dialogs for delete operations
   - Navigation to ContentEditor for editing
   - Status display with visual indicators
   
4. **User Interactions**:
   - Click "Create" → Navigate to ContentEditor (new)
   - Click "Edit" → Navigate to ContentEditor (edit mode)
   - Click "Delete" → Confirmation dialog → Delete content
   - Visual feedback for all operations
   
5. **Error Handling**:
   - Network error handling
   - Permission error handling
   - User-friendly error messages
   - Retry mechanisms for failed operations

### Files to be created/modified:
```
intellectify-webapp/src/
├── components/admin/AdminDashboard.jsx (new)
├── pages/admin/Dashboard.jsx (new)
└── App.jsx (modified - add dashboard route)
```

---

## Task 8: Content State Management and Publishing

### What will be modified:
- **Modified**: ContentEditor component for state management
- **Modified**: ContentService for publishing workflow
- **Modified**: AdminDashboard for status updates

### Why these changes:
- **Publishing Workflow**: Clear distinction between draft and published content
- **Status Management**: Proper state transitions and validation
- **Metadata Tracking**: Automatic timestamps and author tracking
- **User Control**: Admin decides when content is ready for publication

### How it will be implemented:
1. **ContentEditor State Management**:
   - Add "Save as Draft" and "Publish" buttons
   - Status toggle functionality
   - Automatic draft saving during editing
   - Publish confirmation for first-time publishing
   - Status indicator in editor interface
   
2. **Backend Publishing Logic**:
   - Update ContentService to handle status transitions
   - Set `publishedAt` timestamp on first publish
   - Validate content before publishing (title, content required)
   - Maintain creation metadata (author, createdAt)
   - Update modification timestamps
   
3. **Status Workflow**:
   - New content starts as DRAFT
   - Admin can publish (DRAFT → PUBLISHED)
   - Published content can be unpublished (PUBLISHED → DRAFT)
   - Status changes tracked with timestamps
   
4. **Dashboard Integration**:
   - Real-time status updates in content list
   - Visual status indicators (badges, colors)
   - Quick publish/unpublish actions
   - Status-based filtering preparation
   
5. **Metadata Management**:
   - Automatic author assignment (current admin user)
   - Creation timestamp preservation
   - Last modified tracking
   - Priority setting for content ordering

### Files to be modified:
```
intellectify-webapp/src/components/admin/
├── ContentEditor.jsx (modified)
└── AdminDashboard.jsx (modified)

intellectify-backend/src/services/
└── contentService.js (modified)
```

---

## Task 9: Public Content Display System

### What will be modified:
- **Modified**: `intellectify-webapp/src/pages/home.jsx`
- **Added**: `intellectify-webapp/src/components/content/ContentCard.jsx`
- **Added**: `intellectify-webapp/src/components/content/ContentDetail.jsx`
- **Added**: `intellectify-webapp/src/components/content/CategorySidebar.jsx`
- **Modified**: `intellectify-webapp/src/App.jsx` for content routes

### Why these changes:
- **Public Content Display**: Visitors need to see published content on homepage
- **Content Navigation**: Category-based browsing for better user experience
- **Responsive Design**: Content must look good on all devices
- **SEO Preparation**: Proper content structure for search engines

### How it will be implemented:
1. **Homepage Updates**:
   - Fetch and display published content
   - Grid/card layout for content preview
   - Category sidebar integration
   - Responsive design with Material-UI Grid
   - Loading states and error handling
   
2. **ContentCard Component**:
   - Content preview with title, excerpt, author
   - Publication date and category display
   - Click to view full content
   - Responsive card design
   - Image thumbnail if available
   
3. **ContentDetail Component**:
   - Full content rendering with rich text formatting
   - Proper HTML sanitization for security
   - Author and metadata display
   - Responsive typography and layout
   - Social sharing preparation
   
4. **CategorySidebar Component**:
   - List available content categories
   - Category-based filtering
   - Content count per category
   - Responsive collapse for mobile
   - Active category highlighting
   
5. **Content Routing**:
   - `/content/:slug` routes for individual content
   - Category filtering routes
   - SEO-friendly URLs with slugs
   - Proper 404 handling for missing content
   
6. **API Integration**:
   - Fetch published content for homepage
   - Category-based content filtering
   - Individual content retrieval by slug
   - Error handling for API failures

### Files to be created/modified:
```
intellectify-webapp/src/
├── pages/home.jsx (modified)
├── components/content/
│   ├── ContentCard.jsx (new)
│   ├── ContentDetail.jsx (new)
│   └── CategorySidebar.jsx (new)
└── App.jsx (modified - add content routes)
```

---

## Task 10: Security Implementation and Input Validation

### What will be added/modified:
- **Added**: `intellectify-backend/src/middleware/adminAuth.js`
- **Added**: `intellectify-backend/src/middleware/contentValidation.js`
- **Added**: `intellectify-backend/src/utils/sanitizer.js`
- **Modified**: All admin and content routes for security middleware
- **Modified**: File upload middleware for security validation

### Why these changes:
- **Access Control**: Ensure only admins can access content management
- **Content Security**: Prevent XSS attacks through rich text content
- **File Security**: Validate uploaded files for safety
- **Input Validation**: Sanitize and validate all user inputs

### How it will be implemented:
1. **Admin Authorization Middleware**:
   - Extend existing auth middleware for admin-specific checks
   - Validate admin role and permissions
   - Content ownership validation for edit/delete
   - Consistent error responses for unauthorized access
   
2. **Content Validation Middleware**:
   - Validate content fields (title, content, category)
   - Sanitize rich text HTML content
   - Prevent malicious script injection
   - File upload validation (type, size, content)
   
3. **HTML Sanitization**:
   - Use DOMPurify or similar library for HTML cleaning
   - Allow safe HTML tags and attributes
   - Remove potentially dangerous elements
   - Preserve formatting while ensuring security
   
4. **File Upload Security**:
   - Whitelist allowed file types (images only)
   - File size limits and validation
   - Filename sanitization
   - MIME type verification
   - Virus scanning preparation
   
5. **Error Handling Enhancement**:
   - Consistent error response format
   - Security-conscious error messages
   - Rate limiting for admin endpoints
   - Request logging for security monitoring
   
6. **Route Protection**:
   - Apply admin middleware to all admin routes
   - Content ownership checks for edit/delete
   - Input validation on all endpoints
   - CSRF protection preparation

### Files to be created/modified:
```
intellectify-backend/src/
├── middleware/
│   ├── adminAuth.js (new)
│   └── contentValidation.js (new)
├── utils/sanitizer.js (new)
└── routes/ (all admin/content routes modified)
```

---

## Task 11: Backend Testing Suite

### What will be added:
- **Added**: `intellectify-backend/tests/services/adminAuthService.test.js`
- **Added**: `intellectify-backend/tests/services/contentService.test.js`
- **Added**: `intellectify-backend/tests/services/imageService.test.js`
- **Added**: `intellectify-backend/tests/integration/adminAuth.test.js`
- **Added**: `intellectify-backend/tests/integration/contentManagement.test.js`
- **Added**: `intellectify-backend/tests/api/adminEndpoints.test.js`
- **Added**: `intellectify-backend/tests/api/contentEndpoints.test.js`

### Why these changes:
- **Code Quality**: Ensure all backend functionality works correctly
- **Regression Prevention**: Catch bugs before they reach production
- **Security Validation**: Test authorization and input validation
- **Documentation**: Tests serve as living documentation of expected behavior

### How it will be implemented:
1. **Unit Tests Structure**:
   - Test individual service methods in isolation
   - Mock database calls and external dependencies
   - Test both success and error scenarios
   - Validate input/output formats and types
   
2. **AdminAuthService Tests**:
   - Password hashing and validation
   - Credential authentication logic
   - Token generation integration
   - Error handling for invalid inputs
   
3. **ContentService Tests**:
   - CRUD operations with mocked database
   - Slug generation and uniqueness
   - Status management and transitions
   - Authorization and ownership validation
   
4. **ImageService Tests**:
   - File path generation and organization
   - Image saving and deletion
   - URL generation and validation
   - Cleanup operations
   
5. **Integration Tests**:
   - Full authentication flow testing
   - Content creation and publishing workflow
   - Database interaction validation
   - Middleware integration testing
   
6. **API Tests**:
   - HTTP endpoint testing with supertest
   - Request/response validation
   - Authorization header testing
   - Error response format validation
   - Status code verification

### Files to be created:
```
intellectify-backend/tests/
├── services/
│   ├── adminAuthService.test.js (new)
│   ├── contentService.test.js (new)
│   └── imageService.test.js (new)
├── integration/
│   ├── adminAuth.test.js (new)
│   └── contentManagement.test.js (new)
└── api/
    ├── adminEndpoints.test.js (new)
    └── contentEndpoints.test.js (new)
```

---

## Task 12: Frontend Testing Suite

### What will be added:
- **Added**: `intellectify-webapp/src/components/admin/__tests__/AdminLogin.test.jsx`
- **Added**: `intellectify-webapp/src/components/admin/__tests__/ContentEditor.test.jsx`
- **Added**: `intellectify-webapp/src/components/admin/__tests__/AdminDashboard.test.jsx`
- **Added**: `intellectify-webapp/src/components/content/__tests__/ContentCard.test.jsx`
- **Added**: `intellectify-webapp/src/tests/integration/AdminWorkflow.test.jsx`
- **Added**: `intellectify-webapp/src/tests/e2e/ContentManagement.test.js`

### Why these changes:
- **Component Reliability**: Ensure UI components work as expected
- **User Experience**: Test user interactions and workflows
- **Integration Validation**: Test component interactions and data flow
- **Cross-browser Compatibility**: Ensure consistent behavior across browsers

### How it will be implemented:
1. **Component Test Structure**:
   - Use React Testing Library for component testing
   - Test user interactions and state changes
   - Mock API calls and external dependencies
   - Validate rendering and accessibility
   
2. **AdminLogin Tests**:
   - Form validation and submission
   - Error message display
   - Loading state handling
   - Authentication integration
   
3. **ContentEditor Tests**:
   - CKEditor integration and functionality
   - Form field validation
   - Image upload handling
   - Save and publish operations
   - Preview functionality
   
4. **AdminDashboard Tests**:
   - Content list rendering
   - Action button functionality
   - Status display and updates
   - Navigation and routing
   
5. **Integration Tests**:
   - Complete admin authentication flow
   - Content creation and editing workflow
   - API integration testing
   - State management validation
   
6. **E2E Tests**:
   - Full user workflows with Cypress or Playwright
   - Cross-browser testing
   - Real API interaction testing
   - Performance and accessibility validation

### Files to be created:
```
intellectify-webapp/src/
├── components/admin/__tests__/
│   ├── AdminLogin.test.jsx (new)
│   ├── ContentEditor.test.jsx (new)
│   └── AdminDashboard.test.jsx (new)
├── components/content/__tests__/
│   └── ContentCard.test.jsx (new)
├── tests/integration/
│   └── AdminWorkflow.test.jsx (new)
└── tests/e2e/
    └── ContentManagement.test.js (new)
```

---

## General Implementation Notes

### Development Approach:
1. **Read this guide** before starting each task
2. **Ask questions** if anything is unclear
3. **Review the plan** with me before writing code
4. **Test incrementally** as you build each component
5. **Commit frequently** with descriptive messages

### Code Quality Standards:
- Follow existing project patterns and conventions
- Add comprehensive error handling
- Include JSDoc comments for functions
- Use TypeScript-style prop validation where applicable
- Follow Material-UI design patterns for consistency

### Security Considerations:
- Never store passwords in plain text
- Validate all user inputs
- Sanitize rich text content
- Use HTTPS in production
- Implement proper CORS policies
- Add rate limiting for admin endpoints

This guide ensures you understand exactly what will be built and why, making it easier to modify the approach if needed before implementation begins.
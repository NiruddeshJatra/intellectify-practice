# Manual Testing Guide for Content Writing System

This guide provides comprehensive manual testing procedures for the Content Writing System backend. Use this guide to verify functionality that cannot be easily automated or requires human verification.

## Prerequisites

1. **Environment Setup**
   - Backend server running on `http://localhost:3000` (or configured port)
   - Database properly migrated and seeded
   - Admin user created using the admin creation script
   - Test images available (JPEG, PNG, GIF formats)

2. **Testing Tools**
   - API client (Postman, Insomnia, or curl)
   - Web browser for image serving tests
   - File system access to verify image storage

3. **Test Data**
   - Admin credentials: `admin@test.com` / `TestPassword123!`
   - Sample images of various sizes and formats
   - Sample HTML content with embedded images

## Admin Authentication Testing

### Test 1: Admin Login Flow
**Objective**: Verify complete admin authentication workflow

**Steps**:
1. **POST** `/api/admin/auth/login`
   ```json
   {
     "email": "admin@test.com",
     "password": "TestPassword123!"
   }
   ```

**Expected Results**:
- Status: 200
- Response includes user data (id, email, name, role)
- HTTP-only cookies set (access_token, refresh_token)
- No password field in response

**Verification**:
- Check browser dev tools for cookies
- Verify cookies are HTTP-only and secure (in production)

### Test 2: Authentication Persistence
**Objective**: Verify authentication persists across requests

**Steps**:
1. Login using Test 1
2. **GET** `/api/admin/auth/me` (using cookies from login)

**Expected Results**:
- Status: 200
- Returns current admin user data
- No re-authentication required

### Test 3: Invalid Credentials Handling
**Objective**: Verify security measures for invalid login attempts

**Steps**:
1. **POST** `/api/admin/auth/login` with wrong password
2. **POST** `/api/admin/auth/login` with non-existent email
3. **POST** `/api/admin/auth/login` with malformed email

**Expected Results**:
- Status: 401 for all attempts
- Generic error message: "Invalid email or password"
- No user enumeration possible

### Test 4: Rate Limiting
**Objective**: Verify brute force protection

**Steps**:
1. Make 10+ rapid login attempts with wrong credentials

**Expected Results**:
- After several attempts, receive 429 (Too Many Requests)
- Rate limiting should reset after time window

## Content Management Testing

### Test 5: Content Creation Workflow
**Objective**: Verify complete content creation process

**Steps**:
1. Login as admin
2. **POST** `/api/admin/content`
   ```json
   {
     "title": "Test Article for Manual Testing",
     "content": "<h1>Test Article</h1><p>This is a <strong>test article</strong> with formatting.</p>",
     "excerpt": "Test excerpt for manual testing",
     "category": "TECHNOLOGY",
     "priority": 5
   }
   ```

**Expected Results**:
- Status: 201
- Response includes created content with generated slug
- Default status: "DRAFT"
- Author information included

**Verification**:
- Check database for created record
- Verify slug generation: "test-article-for-manual-testing"

### Test 6: Content Retrieval and Pagination
**Objective**: Verify content listing and pagination

**Steps**:
1. Create 15+ test articles using Test 5
2. **GET** `/api/admin/content?page=1&limit=10`
3. **GET** `/api/admin/content?page=2&limit=10`

**Expected Results**:
- First request returns 10 items with pagination metadata
- Second request returns remaining items
- Pagination metadata accurate (total, totalPages, hasNextPage, etc.)

### Test 7: Content Publishing Workflow
**Objective**: Verify draft to published status transition

**Steps**:
1. Create draft content using Test 5
2. **PATCH** `/api/admin/content/{contentId}/status`
   ```json
   {
     "status": "PUBLISHED"
   }
   ```

**Expected Results**:
- Status: 200
- Content status changed to "PUBLISHED"
- `publishedAt` timestamp set
- Content now appears in public API

**Verification**:
- **GET** `/api/content` should include the published content
- **GET** `/api/content/{slug}` should return the content

### Test 8: Content Update and Slug Regeneration
**Objective**: Verify content updates and slug handling

**Steps**:
1. Create content with title "Original Title"
2. **PUT** `/api/admin/content/{contentId}`
   ```json
   {
     "title": "Updated Title with Special Characters & Symbols!"
   }
   ```

**Expected Results**:
- Status: 200
- Title updated
- Slug regenerated: "updated-title-with-special-characters-symbols"
- Slug uniqueness maintained

## Image Upload and Management Testing

### Test 9: Temporary Image Upload
**Objective**: Verify temporary image upload functionality

**Steps**:
1. Login as admin
2. **POST** `/api/images/upload-temp` (multipart/form-data)
   - Attach various image files (JPEG, PNG, GIF, WebP)
   - Test different file sizes (small, medium, large)

**Expected Results**:
- Status: 200 for valid images
- Response includes filename, path, url
- Images stored in temp directory structure
- Unique filenames generated

**Verification**:
- Check file system: `uploads/temp/YYYY/MM/`
- Verify images are accessible via returned URL

### Test 10: Image File Validation
**Objective**: Verify security and validation measures

**Steps**:
1. Upload non-image file (e.g., .txt, .pdf)
2. Upload oversized image (>5MB)
3. Upload image with malicious filename (`../../../evil.jpg`)
4. Upload file with executable extension (`.php`, `.exe`)

**Expected Results**:
- Status: 400 for all invalid uploads
- Appropriate error messages
- No files stored for invalid uploads
- Filenames sanitized

### Test 11: Image Serving and Content-Type Detection
**Objective**: Verify image serving functionality

**Steps**:
1. Upload images of different formats
2. Access images via browser using returned URLs
3. Check response headers

**Expected Results**:
- Images display correctly in browser
- Correct Content-Type headers set
- Appropriate cache headers present

## Content with Images Integration Testing

### Test 13: Complete Content Creation with Images
**Objective**: Verify end-to-end content creation with embedded images

**Steps**:
1. Upload 2-3 images to temp location
2. Create content with embedded temp images:
   ```json
   {
     "title": "Article with Images",
     "content": "<p>First image: <img src='/api/images/temp/2024/08/image1.jpg' /></p><p>Second image: <img src='/api/images/temp/2024/08/image2.jpg' /></p>",
     "category": "TECHNOLOGY"
   }
   ```

**Expected Results**:
- Content created successfully
- Temp images moved to permanent location
- Image URLs updated in content
- Temp files cleaned up

**Verification**:
- Check file system for moved images
- Verify temp directory cleanup
- Confirm images accessible via new URLs

### Test 14: Content Update with Image Changes
**Objective**: Verify image handling during content updates

**Steps**:
1. Create content with images (Test 13)
2. Upload new temp image
3. Update content to replace one image and add the new one
4. Remove one existing image from content

**Expected Results**:
- New temp image moved to permanent location
- Unused image cleaned up from file system
- Content updated with new image references

**Verification**:
- Check file system for cleanup
- Verify only referenced images remain

### Test 15: Content Deletion with Image Cleanup
**Objective**: Verify complete cleanup on content deletion

**Steps**:
1. Create content with multiple images
2. **DELETE** `/api/admin/content/{contentId}`

**Expected Results**:
- Status: 200
- Content deleted from database
- All associated images removed from file system
- Directory cleanup performed

**Verification**:
- Check database for content removal
- Verify file system cleanup
- Confirm image URLs return 404

## Public API Testing

### Test 16: Public Content Access
**Objective**: Verify public content API functionality

**Steps**:
1. Create and publish several articles
2. **GET** `/api/content` (no authentication)
3. **GET** `/api/content?category=TECHNOLOGY`
4. **GET** `/api/content/{slug}`

**Expected Results**:
- Only published content returned
- Filtering by category works
- Individual content accessible by slug
- No authentication required

### Test 17: Draft Content Protection
**Objective**: Verify draft content is not publicly accessible

**Steps**:
1. Create draft content
2. **GET** `/api/content/{slug}` for draft content

**Expected Results**:
- Status: 404
- Draft content not accessible via public API

## Security Testing

### Test 18: XSS Prevention
**Objective**: Verify XSS attack prevention

**Steps**:
1. Create content with malicious scripts:
   ```json
   {
     "title": "XSS Test",
     "content": "<script>alert('XSS')</script><p>Safe content</p><img src='x' onerror='alert(1)'>"
   }
   ```

**Expected Results**:
- Content created successfully
- Malicious scripts removed/sanitized
- Safe HTML preserved

**Verification**:
- Check stored content in database
- Verify no executable scripts remain

### Test 19: Authorization Testing
**Objective**: Verify proper access control

**Steps**:
1. Create content as Admin A
2. Login as different admin (Admin B)
3. Try to access/modify Admin A's content

**Expected Results**:
- Admin B cannot access Admin A's content
- Appropriate 403/404 responses
- No data leakage between admin accounts

### Test 20: File Upload Security
**Objective**: Verify file upload security measures

**Steps**:
1. Attempt to upload files with various malicious payloads
2. Test directory traversal in filenames
3. Upload files with executable extensions
4. Test oversized uploads

**Expected Results**:
- All malicious uploads rejected
- Appropriate error messages
- No security vulnerabilities exploited

## Performance Testing

### Test 21: Large Content Handling
**Objective**: Verify system handles large content efficiently

**Steps**:
1. Create content with maximum allowed length (100,000 characters)
2. Create content with many embedded images (10+)
3. Upload maximum file size images (5MB)

**Expected Results**:
- All operations complete within reasonable time
- No memory issues or timeouts
- Proper error handling for limits exceeded

### Test 22: Concurrent Operations
**Objective**: Verify system handles concurrent requests

**Steps**:
1. Perform multiple simultaneous operations:
   - Content creation
   - Image uploads
   - Content updates
   - Image serving

**Expected Results**:
- All operations complete successfully
- No race conditions or data corruption
- Proper file locking and database transactions

## Error Handling Testing

### Test 23: Database Connection Issues
**Objective**: Verify graceful handling of database issues

**Steps**:
1. Temporarily disconnect database
2. Attempt various operations

**Expected Results**:
- Appropriate 500 errors returned
- No application crashes
- Proper error logging

### Test 24: File System Issues
**Objective**: Verify handling of file system problems

**Steps**:
1. Fill up disk space (if possible in test environment)
2. Remove write permissions on upload directory
3. Attempt image uploads

**Expected Results**:
- Appropriate error responses
- No partial file uploads
- Proper cleanup of failed operations

## Cleanup and Maintenance Testing

### Test 25: Temporary File Cleanup
**Objective**: Verify automatic cleanup of old temp files

**Steps**:
1. Upload several temp images
2. Wait or manually trigger cleanup process
3. **POST** `/api/images/cleanup-temp`

**Expected Results**:
- Old temp files removed (>24 hours)
- Recent temp files preserved
- Proper cleanup reporting

### Test 26: Orphaned Image Detection
**Objective**: Verify detection and cleanup of orphaned images

**Steps**:
1. Create content with images
2. Manually delete content from database (bypassing API)
3. Run image cleanup process

**Expected Results**:
- Orphaned images identified
- Cleanup process handles orphaned files
- No impact on referenced images

## Reporting Test Results

For each test, document:

1. **Test ID and Name**
2. **Date/Time Executed**
3. **Environment Details**
4. **Test Steps Performed**
5. **Actual Results**
6. **Pass/Fail Status**
7. **Issues Found** (if any)
8. **Screenshots/Evidence** (where applicable)

## Common Issues and Troubleshooting

### Image Upload Issues
- **Problem**: Images not uploading
- **Check**: File permissions on upload directory
- **Check**: Disk space availability
- **Check**: File size and type validation

### Authentication Issues
- **Problem**: Login not working
- **Check**: Admin user exists in database
- **Check**: Password hash verification
- **Check**: JWT secret configuration

### Content Issues
- **Problem**: Content not saving
- **Check**: Database connection
- **Check**: Content validation rules
- **Check**: Character encoding issues

### Performance Issues
- **Problem**: Slow response times
- **Check**: Database query performance
- **Check**: File system performance
- **Check**: Memory usage and leaks

## Test Environment Reset

To reset test environment between test runs:

1. **Clear Database**:
   ```bash
   npm run db:reset
   ```

2. **Clear Upload Directory**:
   ```bash
   rm -rf uploads/content/*
   rm -rf uploads/temp/*
   ```

3. **Recreate Admin User**:
   ```bash
   npm run admin:create
   ```

4. **Restart Server**:
   ```bash
   npm run dev
   ```

This manual testing guide should be executed regularly, especially before releases, to ensure all functionality works correctly in real-world scenarios.
const contentService = require('../services/contentService');
const AppError = require('../utils/AppError');

class ContentController {
  /**
   * Create new content (Admin only)
   */
  async createContent(req, res, next) {
    try {
      // Check if request body exists and has required fields
      if (!req.body || Object.keys(req.body).length === 0) {
        throw new AppError('Request body is empty. Please provide content data.', 400, 'VALIDATION_ERROR');
      }

      const { title, content, excerpt, category, subcategory, priority, metaTitle, metaDescription, status } = req.body;

      // Input validation
      if (!title || !content) {
        throw new AppError('Title and content are required', 400, 'VALIDATION_ERROR');
      }
      

      if (title.length > 200) {
        throw new AppError('Title must be 200 characters or less', 400, 'VALIDATION_ERROR');
      }

      if (content.length > 100000) {
        throw new AppError('Content must be 100,000 characters or less', 400, 'VALIDATION_ERROR');
      }

      // Validate priority if provided
      if (priority !== undefined && (isNaN(priority) || priority < 0)) {
        throw new AppError('Priority must be a non-negative number', 400, 'VALIDATION_ERROR');
      }

      // Validate category if provided
      const validCategories = await contentService.getContentCategories();
      if (category && !validCategories.includes(category)) {
        throw new AppError('Invalid category', 400, 'INVALID_CATEGORY');
      }

      // Validate status (default to DRAFT if not provided)
      const validStatus = status || 'DRAFT';
      if (!['DRAFT', 'PUBLISHED'].includes(validStatus)) {
        throw new AppError('Invalid status. Must be either DRAFT or PUBLISHED', 400, 'VALIDATION_ERROR');
      }

      const newContent = await contentService.createContent(req.user.id, {
        title,
        content,
        excerpt,
        category,
        subcategory,
        priority,
        metaTitle,
        metaDescription,
        status: validStatus
      });

      res.status(201).json({
        success: true,
        data: newContent
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update existing content (Admin only)
   */
  async updateContent(req, res, next) {
    try {
      // Use validated content ID from security middleware
      const contentId = req.validatedContentId || req.params.id;
      const { title, content, excerpt, category, subcategory, priority, status, metaTitle, metaDescription } = req.body;

      // Enhanced validation
      if (status && !['DRAFT', 'PUBLISHED'].includes(status)) {
        throw new AppError('Invalid status. Must be DRAFT or PUBLISHED', 400, 'VALIDATION_ERROR');
      }

      // Validate priority if provided
      if (priority !== undefined && (isNaN(priority) || priority < 0)) {
        throw new AppError('Priority must be a non-negative number', 400, 'VALIDATION_ERROR');
      }

      const updatedContent = await contentService.updateContent(contentId, {
        title,
        content,
        excerpt,
        category,
        subcategory,
        priority,
        status,
        metaTitle,
        metaDescription
      });

      if (!updatedContent) {
        throw new AppError('Content not found', 404, 'NOT_FOUND');
      }

      res.status(200).json({
        success: true,
        data: updatedContent
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete content (Admin only)
   */
  async deleteContent(req, res, next) {
    try {
      // Use validated content ID from security middleware
      const contentId = req.validatedContentId || req.params.id;
      const deleted = await contentService.deleteContent(contentId);

      if (!deleted) {
        throw new AppError('Content not found', 404, 'NOT_FOUND');
      }

      res.status(200).json({
        success: true,
        message: 'Content deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get content by ID (Admin access - includes drafts)
   */
  async getContentById(req, res, next) {
    try {
      // Use validated content ID from security middleware
      const contentId = req.validatedContentId || req.params.id;

      const content = await contentService.getContentById(contentId); // Include unpublished for admin

      if (!content) {
        throw new AppError('Content not found', 404, 'NOT_FOUND');
      }

      res.status(200).json({
        success: true,
        data: content
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get content for the current admin user with pagination and filtering
   * Query parameters:
   * - page: Page number (default: 1)
   * - limit: Items per page (default: 10, max: 100)
   * - status: Filter by status (optional, 'DRAFT' or 'PUBLISHED')
   * - category: Filter by category (optional)
   */
  async getMyContent(req, res, next) {
    try {
      // Parse and validate input
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(parseInt(req.query.limit) || 10, 100); // Cap at 100 items per page
      const { status, category } = req.query;
      
      // Validate status if provided
      if (status && !['DRAFT', 'PUBLISHED'].includes(status)) {
        throw new AppError("Invalid status. Must be 'DRAFT' or 'PUBLISHED'", 400, 'VALIDATION_ERROR');
      }

      const result = await contentService.getContentByAuthor({
        authorId: req.user.id,
        page,
        limit,
        status,
        category
      });

      res.json({
        success: true,
        data: {
          items: result.items,
          pagination: result.pagination
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update content status (publish/unpublish)
   */
  async updateContentStatus(req, res, next) {
    try {
      // Use validated content ID from security middleware
      const contentId = req.validatedContentId || req.params.id;
      const { status } = req.body;

      // Validate status
      if (!status || !['DRAFT', 'PUBLISHED'].includes(status)) {
        throw new AppError('Invalid status. Must be DRAFT or PUBLISHED', 400, 'VALIDATION_ERROR');
      }

      const updatedContent = await contentService.updateContentStatus(contentId, status);

      if (!updatedContent) {
        throw new AppError('Content not found', 404, 'NOT_FOUND');
      }

      res.status(200).json({
        success: true,
        data: updatedContent
      });
    } catch (error) {
      next(error);
    }
  }

  // Public endpoints (no authentication required)

  /**
   * Get published content for public display
   */
  async getPublishedContent(req, res, next) {
    try {
      const { category, page = 1, limit = 10 } = req.query;
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.min(parseInt(limit) || 10, 100); // Cap at 100 items per page
      
      const { items, pagination } = await contentService.getPublishedContent({
        category,
        page: pageNum,
        limit: limitNum
      });

      res.json({
        success: true,
        data: {
          items,
          pagination
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get published content by slug (public access)
   */
  async getContentBySlug(req, res, next) {
    try {
      const { slug } = req.params;
      if (!slug) {
        throw new AppError('Slug is required', 400, 'VALIDATION_ERROR');
      }

      const content = await contentService.getContentBySlug(slug);

      if (!content) {
        throw new AppError('Content not found', 404, 'NOT_FOUND');
      }

      res.status(200).json({
        success: true,
        data: content
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get available content categories (public access)
   */
  async getContentCategories(req, res, next) {
    try {
      const categories = await contentService.getContentCategories();

      res.status(200).json({
        success: true,
        data: categories
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ContentController();
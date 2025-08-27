const contentService = require('../services/contentService');
const ResponseHelper = require('../utils/responseHelper');
const ValidationHelper = require('../utils/validationHelper');

class ContentController {
  /**
   * Create new content (Admin only)
   */
  async createContent(req, res, next) {
    try {
      // Validate content data using the service
      const validatedData = await contentService.validateContent(req.body, false);
      
      const { title, content, excerpt, category, subcategory, priority, metaTitle, metaDescription, status } = validatedData;

      const newContent = await contentService.createContent(req.user.id, {
        title,
        content,
        excerpt,
        category,
        subcategory,
        priority,
        metaTitle,
        metaDescription,
        status
      });

      return ResponseHelper.created(res, newContent, 'Content created successfully');
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
      
      // Validate content data using the service
      const validatedData = await contentService.validateContent(req.body, true);
      const { title, content, excerpt, category, subcategory, priority, status, metaTitle, metaDescription } = validatedData;

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
        return ResponseHelper.notFound(res, 'Content');
      }

      return ResponseHelper.success(res, updatedContent, 'Content updated successfully');
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
        return ResponseHelper.notFound(res, 'Content');
      }

      return ResponseHelper.success(res, null, 'Content deleted successfully');
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
        return ResponseHelper.notFound(res, 'Content');
      }

      return ResponseHelper.success(res, content);
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

      const result = await contentService.getContentByAuthor({
        authorId: req.user.id,
        page,
        limit,
        status,
        category
      });

      return ResponseHelper.paginated(
        res, 
        result.items, 
        result.pagination.currentPage, 
        result.pagination.totalItems, 
        result.pagination.itemsPerPage
      );
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
        return ResponseHelper.validationError(res, 'Invalid status. Must be DRAFT or PUBLISHED');
      }

      const updatedContent = await contentService.updateContentStatus(contentId, status);

      if (!updatedContent) {
        return ResponseHelper.notFound(res, 'Content');
      }

      return ResponseHelper.success(res, updatedContent, 'Content status updated successfully');
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

      return ResponseHelper.paginated(
        res, 
        items, 
        pagination.currentPage, 
        pagination.totalItems, 
        pagination.itemsPerPage
      );
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
        return ResponseHelper.validationError(res, 'Slug is required');
      }

      if (!ValidationHelper.isValidSlug(slug)) {
        return ResponseHelper.validationError(res, 'Invalid slug format');
      }

      const content = await contentService.getContentBySlug(slug);

      if (!content) {
        return ResponseHelper.notFound(res, 'Content');
      }

      return ResponseHelper.success(res, content);
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
      return ResponseHelper.success(res, categories);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ContentController();
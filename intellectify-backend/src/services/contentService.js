const prisma = require('../config/database');
const AppError = require('../utils/appError');
const SlugGenerator = require('./slugGenerator');
const ImageManager = require('./contentImageService');
const { Category } = require('@prisma/client');

/**
 * Content Service - Main Content Management Service
 * 
 * This service handles all content-related operations including:
 * - Content creation, updating, and deletion
 * - Content validation
 * - Image management and cleanup
 * - Content retrieval with filtering and pagination
 * - Status management (draft/published)
 */
class ContentService {
  /**
   * Validate content data - simplified inline validation
   * 
   * @param {Object} data - Content data to validate
   * @param {boolean} isUpdate - Whether this is an update operation
   * @returns {Object} - Validated and processed content data
   * @throws {AppError} - If validation fails
   */
  async validateContent(data, isUpdate = false) {
    if (!isUpdate && (!data || Object.keys(data).length === 0)) {
      throw new AppError('Request body is empty. Please provide content data.', 400, 'VALIDATION_ERROR');
    }

    const { title, content, status, priority, category } = data;

    if (!isUpdate && (!title || !content)) {
      throw new AppError('Title and content are required', 400, 'VALIDATION_ERROR');
}

    if (title && title.length > 200) {
      throw new AppError('Title must be 200 characters or less', 400, 'VALIDATION_ERROR');
    }

    if (content && content.length > 100000) {
      throw new AppError('Content must be 100,000 characters or less', 400, 'VALIDATION_ERROR');
    }

    if (priority !== undefined && (isNaN(priority) || priority < 0)) {
      throw new AppError('Priority must be a non-negative number', 400, 'VALIDATION_ERROR');
    }

    if (status && !['DRAFT', 'PUBLISHED'].includes(status)) {
      throw new AppError('Invalid status. Must be either DRAFT or PUBLISHED', 400, 'VALIDATION_ERROR');
    }
    if (category) {
      const validCategories = await this.getContentCategories();
      if (!validCategories.includes(category)) {
        throw new AppError('Invalid category', 400, 'INVALID_CATEGORY');
      }
    }

    const validatedData = { ...data };
    if (!validatedData.status && !isUpdate) {
      validatedData.status = 'DRAFT';
    }

    return validatedData;
  }

  /**
   * Create new content with automatic slug generation and image management
   * 
   * Process:
   * 1. Extract content data from input
   * 2. Generate unique URL-friendly slug from title
   * 3. Create content record in database
   * 4. Move temporary images to permanent location
   * 5. Return created content with author information
   * 
   * @param {string} authorId - ID of the content author
   * @param {Object} contentData - Content data including title, content, category, etc.
   * @returns {Promise<Object>} - Created content with author information
   */
  async createContent(authorId, contentData) {
    const { 
      title, 
      content, 
      excerpt, 
      category, 
      subcategory, 
      priority = 0, 
      metaTitle, 
      metaDescription,
      status
    } = contentData;

    // Generate unique slug using SlugGenerator module
    const slug = await SlugGenerator.createUniqueSlug(title);

    const newContent = await prisma.content.create({
      data: {
        title,
        content,
        excerpt,
        category,
        subcategory,
        priority,
        slug,
        metaTitle,
        metaDescription,
        authorId,
        status,
        // Set publishedAt if status is PUBLISHED
        ...(status === 'PUBLISHED' && { publishedAt: new Date() })
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Move any temporary images to permanent location using ImageManager
    await ImageManager.moveTemporaryImages(newContent.content, category, newContent.id);

    return newContent;
  }

  /**
   * Update existing content with image management and slug regeneration
   * 
   * Process:
   * 1. Retrieve existing content to compare changes
   * 2. Handle image updates (move temp images, update paths, cleanup unused)
   * 3. Generate new slug if title changed
   * 4. Set publishedAt timestamp when publishing for first time
   * 5. Update content record with new data
   * 
   * @param {string} contentId - ID of content to update
   * @param {Object} contentData - Updated content data
   * @returns {Promise<Object>} - Updated content with author information
   */
  async updateContent(contentId, contentData) {
    // First, get the existing content to compare changes
    const existingContent = await prisma.content.findUnique({
      where: { id: contentId },
      select: {
        id: true,
        title: true,
        content: true,
        category: true,
        authorId: true,
        slug: true,
        status: true,
        publishedAt: true
      }
    });

    if (!existingContent) {
      throw new AppError('Content not found', 404, 'CONTENT_NOT_FOUND');
    }

    const { title, excerpt, category, subcategory, priority, status, metaTitle, metaDescription } = contentData;
    let { content } = contentData;

    // Handle image updates using ImageManager
    if (content !== undefined) {
      // Move any new temporary images and update content with new paths
      content = await ImageManager.updateContentImages(
        content, 
        category || existingContent.category, 
        contentId
      );
      
      // Clean up images that are no longer used
      await ImageManager.cleanupUnusedImages(existingContent.content, content, contentId);
    }

    // If title changed, generate new slug
    if (title && existingContent.title !== title) {
      contentData.slug = await SlugGenerator.createUniqueSlug(title, contentId);
    } else if (!contentData.slug) {
      // Ensure slug is always set, even if not explicitly provided
      contentData.slug = existingContent.slug;
    }

    // Set publishedAt when publishing for the first time
    let { publishedAt } = existingContent;
    if (status === 'PUBLISHED' && existingContent.status === 'DRAFT' && !publishedAt) {
      publishedAt = new Date();
    }

    return await prisma.content.update({
      where: { id: contentId },
      data: {
        // Only update fields that are provided (using conditional spread)
        ...(title && { title }),
        ...(content !== undefined && { content }),
        ...(excerpt !== undefined && { excerpt }),
        ...(category !== undefined && { category }),
        ...(subcategory !== undefined && { subcategory }),
        ...(priority !== undefined && { priority: parseInt(priority) || 0 }),
        ...(status && { status }),
        ...(metaTitle !== undefined && { metaTitle }),
        ...(metaDescription !== undefined && { metaDescription }),
        slug: contentData.slug || existingContent.slug,
        ...(publishedAt && { publishedAt })
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
  }

  /**
   * Delete content and clean up associated images
   * 
   * Process:
   * 1. Verify content exists
   * 2. Clean up all associated images using ImageManager
   * 3. Delete content record from database
   * 
   * @param {string} contentId - ID of content to delete
   * @returns {Promise<boolean>} - Success status
   */
  async deleteContent(contentId) {
    const existingContent = await prisma.content.findUnique({
      where: { id: contentId }
    });

    if (!existingContent) {
      throw new AppError('Content not found', 404, 'CONTENT_NOT_FOUND');
    }

    // Clean up associated images before deleting content using ImageManager
    await ImageManager.cleanupContentImages(contentId, existingContent.category);

    await prisma.content.delete({
      where: { id: contentId }
    });

    return true;
  }

  /**
   * Get content by ID
   * @param {string} contentId - The ID of the content to retrieve
   * @returns {Promise<Object|null>} - Content or null if not found
   */
  async getContentById(contentId) {
    return await prisma.content.findUnique({
          where: {
            id: contentId,
          },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        });
  }

  /**
   * Get content by author with pagination and filtering
   * @param {Object} options - Query options
   * @param {string} options.authorId - ID of the author
   * @param {number} [options.page=1] - Page number (1-based)
   * @param {number} [options.limit=10] - Items per page
   * @param {string} [options.status] - Filter by status ('DRAFT' or 'PUBLISHED')
   * @param {string} [options.category] - Filter by category
   * @returns {Promise<Object>} - Paginated content results with metadata
   */
  async getContentByAuthor({ authorId, page = 1, limit = 10, status, category } = {}) {
    const skip = (page - 1) * limit;
    const take = parseInt(limit);
    
    const where = { authorId };
    if (status) {
      where.status = status;
    }
    if (category) {
      where.category = category;
    }

    const [items, total] = await Promise.all([
      prisma.content.findMany({
        where,
        orderBy: [
          { priority: 'desc' },
          { publishedAt: 'desc' },
          { createdAt: 'desc' }
        ],
        skip,
        take,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      }),
      prisma.content.count({ where })
    ]);

    const totalPages = Math.ceil(total / take);
    
    return {
      items,
      pagination: {
        total,
        totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
        limit: take
      }
    };
  }

  /**
   * Update content status (publish/unpublish)
   * @param {string} contentId - ID of content to update
   * @param {string} status - New status ('DRAFT' or 'PUBLISHED')
   * @param {string} authorId - ID of the author (for ownership validation)
   * @returns {Promise<Object>} - Updated content
   */
  async updateContentStatus(contentId, status) {
    const existingContent = await prisma.content.findUnique({
      where: { id: contentId }
    });

    if (!existingContent) {
      throw new AppError('Content not found', 404, 'CONTENT_NOT_FOUND');
    }

    // Set publishedAt when publishing for the first time
    let {publishedAt} = existingContent;
    if (status === 'PUBLISHED' && existingContent.status === 'DRAFT' && !publishedAt) {
      publishedAt = new Date();
    }

    return await prisma.content.update({
          where: { id: contentId },
          data: {
            status,
            ...(publishedAt && { publishedAt })
          },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        });
  }

  /**
   * Get published content for public display
   * @param {Object} options - Query options
   * @param {string} [options.category] - Filter by category
   * @param {number} [options.page=1] - Page number (1-based)
   * @param {number} [options.limit=10] - Items per page
   * @returns {Promise<Object>} - Paginated content results with metadata
   */
  async getPublishedContent({ category, page = 1, limit = 10 } = {}) {
    const skip = (page - 1) * limit;
    const take = parseInt(limit);
    
    const where = { status: 'PUBLISHED' };
    if (category) {
      where.category = category;
    }

    const [items, total] = await Promise.all([
      prisma.content.findMany({
        where,
        orderBy: [
          { priority: 'desc' },
          { publishedAt: 'desc' },
          { createdAt: 'desc' }
        ],
        skip,
        take,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      }),
      prisma.content.count({ where })
    ]);

    const totalPages = Math.ceil(total / take);
    
    return {
      items,
      pagination: {
        total,
        totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
        limit: take
      }
    };
  }

  /**
   * Get content by slug (for public access)
   * @param {string} slug - Slug of content to retrieve
   * @returns {Promise<Object|null>} - Published content or null if not found
   */
  async getContentBySlug(slug) {
    return await prisma.content.findFirst({
          where: {
            slug,
            status: 'PUBLISHED'
          },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        });
  }

  /**
   * Get all available content categories
   * 
   * @returns {string[]} - Array of all available category enum values
   */
  getContentCategories() {
    return Object.values(Category);
  }
}

module.exports = new ContentService();
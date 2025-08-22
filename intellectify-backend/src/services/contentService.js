const prisma = require('../config/database');
const imageService = require('./imageService');
const AppError = require('../utils/AppError');
const { Prisma, Category } = require('@prisma/client');

class ContentService {
  /**
   * Generate a URL-friendly slug from a title
   * @param {string} title - The content title
   * @returns {string} - URL-friendly slug
   */
  generateSlug(title) {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  }

  /**
   * Ensure slug is unique by appending a number if necessary
   * @param {string} baseSlug - The base slug
   * @param {string} excludeId - Content ID to exclude from uniqueness check
   * @returns {Promise<string>} - Unique slug
   */
  async ensureUniqueSlug(baseSlug, excludeId = null) {
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await prisma.content.findFirst({
        where: {
          slug,
          ...(excludeId && { id: { not: excludeId } }), // Finds any content that has this slug except the current content
        },
      });

      if (!existing) {
        return slug;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  /**
   * Create new content
   * @param {string} authorId - ID of the content author
   * @param {Object} contentData - Content data
   * @returns {Promise<Object>} - Created content
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

    // Generate unique slug
    const baseSlug = this.generateSlug(title);
    const slug = await this.ensureUniqueSlug(baseSlug); // We don't need to provide a content ID because this code is for creating new content, not updating existing content.

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
        ...(status === 'PUBLISHED' && { publishedAt: new Date() }) // Set publishedAt if status is PUBLISHED
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

    // Move any temporary images to permanent location
  try {
    const imagePaths = imageService.extractImagePaths(newContent.content);
    for (const imgPath of imagePaths) {
      // Check if this is a temp image (from the temp uploads directory)
      const tempPathPrefix = 'uploads/temp/';
      if (imgPath.startsWith(tempPathPrefix)) {
        const relativePath = imgPath.substring(tempPathPrefix.length);
        await imageService.moveImageFromTemp(
          relativePath,
          category || 'GENERAL',
          newContent.id
        );
      }
    }
  } catch (error) {
    console.error('Error moving temporary images:', error);
    // Don't fail content creation if image move fails
  }

    return newContent;
  }

  /**
   * Update existing content
   * @param {string} contentId - ID of content to update
   * @param {Object} contentData - Updated content data
   * @returns {Promise<Object>} - Updated content
   */
  async updateContent(contentId, contentData) {
    // First, get the existing content
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

    // Move any new temporary images if added to permanent location and update content with new paths
    let contentWithUpdatedPaths = content;
    if (content !== undefined) {
      try {
        const imagePaths = imageService.extractImagePaths(content);
        for (const imgPath of imagePaths) {
          // Check if this is a temp image (from the temp uploads directory)
          const tempPathPrefix = 'uploads/temp/';
          if (imgPath.startsWith(tempPathPrefix)) {
            const relativePath = imgPath.substring(tempPathPrefix.length);
            const newPath = await imageService.moveImageFromTemp(
              relativePath,
              category || existingContent.category || 'GENERAL',
              contentId
            );
            
            // Update the content with the new image path
            if (newPath) {
              const oldUrl = `/api/images/${imgPath}`;
              const newUrl = `/api/images/${newPath}`;
              contentWithUpdatedPaths = contentWithUpdatedPaths.replace(new RegExp(oldUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newUrl);
            }
          }
        }
      } catch (error) {
        console.error('Error moving temporary images during update:', error);
        // Don't fail update if image move fails
      }
    }

    // Clean up unused images if content is being updated
    if (content !== undefined && content !== existingContent.content) {
      try {
        // Extract and clean image paths for comparison
        const extractAndCleanPaths = (html) => {
          const paths = imageService.extractImagePaths(html);
          return paths.map(path => {
            // Remove the /api/images/ prefix if it exists
            const cleanPath = path.replace(/^\/api\/images\//, '');
            // Also handle the case where the path might be a full URL
            return cleanPath.replace(/^https?:\/\/[^\/]+\/api\/images\//, '');
          });
        };
        
        const oldImages = extractAndCleanPaths(existingContent.content);
        const newImages = extractAndCleanPaths(content);
        
        // Find images that were in old content but not in new content
        const imagesToDelete = oldImages.filter(img => !newImages.includes(img));
        
        // Delete the unused images
        const deleted = [];
        for (let imgPath of imagesToDelete) {
          try {
            // Ensure we're not trying to delete temp files that might be in use
            if (!imgPath.startsWith('uploads/temp/')) {
              await imageService.deleteImage(imgPath);
              deleted.push(imgPath);
            }
          } catch (error) {
            console.error(`Failed to delete image ${imgPath}:`, error);
          }
        }
        
        if (deleted.length > 0) {
          console.log(`Cleaned up ${deleted.length} unused images for content ${contentId}`);
        }
      } catch (error) {
        console.error('Error during image cleanup:', error);
        // Don't fail the update if image cleanup fails
      }
    }

    // Generate new slug if title changed
    let {slug} = existingContent;
    if (title && title !== existingContent.title) {
      const baseSlug = this.generateSlug(title);
      slug = await this.ensureUniqueSlug(baseSlug, contentId);
    }
    
    // Use the updated content with new image paths if any were updated
    if (content !== undefined) {
      content = contentWithUpdatedPaths;
    }

    // Set publishedAt when publishing for the first time
    let {publishedAt} = existingContent;
    if (status === 'PUBLISHED' && existingContent.status === 'DRAFT' && !publishedAt) {
      publishedAt = new Date();
    }

    return await prisma.content.update({
          where: { id: contentId },
          data: {
            ...(title && { title }),
            ...(content !== undefined && { content }),
            ...(excerpt !== undefined && { excerpt }),
            ...(category !== undefined && { category }),
            ...(subcategory !== undefined && { subcategory }),
            ...(priority !== undefined && { priority: parseInt(priority) || 0 }),
            ...(status && { status }),
            ...(metaTitle !== undefined && { metaTitle }),
            ...(metaDescription !== undefined && { metaDescription }),
            slug,
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
   * Delete content
   * @param {string} contentId - ID of content to delete
   * @returns {Promise<boolean>} - Success status
   */
  async deleteContent(contentId) {
    const existingContent = await prisma.content.findUnique({
      where: {
        id: contentId,
      }
    });

    if (!existingContent) {
      throw new AppError('Content not found', 404, 'CONTENT_NOT_FOUND');
    }

    // Clean up associated images before deleting content
    try {
      await imageService.cleanupContentImages(contentId, existingContent.category || 'general');
    } catch (error) {
      console.error(`Warning: Failed to cleanup images for content ${contentId}:`, error);
      // Continue with content deletion even if image cleanup fails
    }

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
   * Get available content categories
   * @returns {string[]} - Array of all available category enum values
   */
  getContentCategories() {
    return Object.values(Category);
  }
}

module.exports = new ContentService();
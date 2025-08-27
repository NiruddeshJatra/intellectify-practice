const fileStorageService = require('./fileStorageService');

/**
 * Image Management Module for Content
 * 
 * This module handles all image-related operations for content including:
 * - Moving temporary images to permanent locations
 * - Updating content with new image paths
 * - Cleaning up unused images
 * - Managing image lifecycle during content operations
 * 
 * Image Workflow:
 * 1. Images are initially uploaded to temp directory
 * 2. When content is created/updated, images are moved to permanent location
 * 3. Content HTML is updated with new image paths
 * 4. Unused images are cleaned up to prevent storage bloat
 */
class ImageManager {
  /**
   * Move temporary images to permanent location for new content
   * 
   * This is called after content creation to move any images from the
   * temporary upload directory to the permanent content directory.
   * 
   * @param {string} content - HTML content containing images
   * @param {string} category - Content category for organization
   * @param {string} contentId - Content ID for file organization
   */
  static async moveTemporaryImages(content, category, contentId) {
    try {
      const imagePaths = fileStorageService.extractImagePaths(content);
      for (const imgPath of imagePaths) {
        const tempPathPrefix = 'uploads/temp/';
        if (imgPath.startsWith(tempPathPrefix)) {
          const relativePath = imgPath.substring(tempPathPrefix.length);
          await fileStorageService.moveImageFromTemp(
            relativePath,
            category || 'GENERAL',
            contentId
          );
        }
      }
    } catch (error) {
      console.error('Error moving temporary images:', error);
      // Don't fail content operation if image move fails
    }
  }

  /**
   * Update content with new image paths and move temporary images
   * 
   * This method:
   * 1. Finds temporary images in the content HTML
   * 2. Moves them to permanent location
   * 3. Updates the HTML with new image paths
   * 4. Returns the updated content
   * 
   * @param {string} content - HTML content containing images
   * @param {string} category - Content category for organization
   * @param {string} contentId - Content ID for file organization
   * @returns {string} - Updated content with new image paths
   */
  static async updateContentImages(content, category, contentId) {
    let contentWithUpdatedPaths = content;
    
    try {
      const imagePaths = fileStorageService.extractImagePaths(content);
      for (const imgPath of imagePaths) {
        const tempPathPrefix = 'uploads/temp/';
        if (imgPath.startsWith(tempPathPrefix)) {
          const relativePath = imgPath.substring(tempPathPrefix.length);
          const newPath = await fileStorageService.moveImageFromTemp(
            relativePath,
            category || 'GENERAL',
            contentId
          );
          
          // Update the content with the new image path
          if (newPath) {
            const oldUrl = `/api/images/${imgPath}`;
            const newUrl = `/api/images/${newPath}`;
            contentWithUpdatedPaths = contentWithUpdatedPaths.replace(
              new RegExp(oldUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), 
              newUrl
            );
          }
        }
      }
    } catch (error) {
      console.error('Error moving temporary images during update:', error);
      // Don't fail update if image move fails
    }

    return contentWithUpdatedPaths;
  }

  /**
   * Clean up unused images when content is updated
   * 
   * This method compares old and new content to find images that are
   * no longer used and deletes them to prevent storage bloat.
   * 
   * Process:
   * 1. Extract image paths from old and new content
   * 2. Find images that exist in old but not in new content
   * 3. Delete unused images (excluding temp files)
   * 4. Log cleanup results
   * 
   * @param {string} oldContent - Previous content HTML
   * @param {string} newContent - New content HTML
   * @param {string} contentId - Content ID for logging
   */
  static async cleanupUnusedImages(oldContent, newContent, contentId) {
    try {
      // Extract and clean image paths for comparison
      const extractAndCleanPaths = (html) => {
        const paths = fileStorageService.extractImagePaths(html);
        return paths.map(path => {
          // Remove the /api/images/ prefix if it exists
          const cleanPath = path.replace(/^\/api\/images\//, '');
          // Also handle the case where the path might be a full URL
          return cleanPath.replace(/^https?:\/\/[^\/]+\/api\/images\//, '');
        });
      };
      
      const oldImages = extractAndCleanPaths(oldContent);
      const newImages = extractAndCleanPaths(newContent);
      
      // Find images that were in old content but not in new content
      const imagesToDelete = oldImages.filter(img => !newImages.includes(img));
      
      // Delete the unused images
      const deleted = [];
      for (let imgPath of imagesToDelete) {
        try {
          // Ensure we're not trying to delete temp files that might be in use
          if (!imgPath.startsWith('uploads/temp/')) {
            await fileStorageService.deleteImage(imgPath);
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

  /**
   * Clean up all images associated with content when deleting
   * @param {string} contentId - Content ID
   * @param {string} category - Content category
   */
  static async cleanupContentImages(contentId, category) {
    try {
      await fileStorageService.cleanupContentImages(contentId, category || 'general');
    } catch (error) {
      console.error(`Warning: Failed to cleanup images for content ${contentId}:`, error);
      // Continue with content deletion even if image cleanup fails
    }
  }
}

module.exports = ImageManager;
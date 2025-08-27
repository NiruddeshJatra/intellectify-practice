const prisma = require('../config/database');

/**
 * Slug Generation Module
 *
 * This module handles URL-friendly slug generation and uniqueness checking.
 * Slugs are used for SEO-friendly URLs and must be unique across all content.
 *
 * Features:
 * - Converts titles to URL-friendly format
 * - Ensures uniqueness by appending numbers if needed
 * - Handles special characters and spaces
 * - Supports exclusion for updates
 */
class SlugGenerator {
  /**
   * Generate a URL-friendly slug from a title
   *
   * Process:
   * 1. Convert to lowercase
   * 2. Trim whitespace
   * 3. Remove special characters
   * 4. Replace spaces/underscores with hyphens
   * 5. Remove leading/trailing hyphens
   *
   * @param {string} title - The content title
   * @returns {string} - URL-friendly slug
   */
  static generateSlug(title) {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  }

  /**
   * Ensure slug is unique by appending a number if necessary
   *
   * If a slug already exists, this method will append a number to make it unique.
   * For example: "my-post" -> "my-post-1" -> "my-post-2", etc.
   *
   * @param {string} baseSlug - The base slug to check
   * @param {string} excludeId - Content ID to exclude from uniqueness check (for updates)
   * @returns {Promise<string>} - Unique slug
   */
  static async ensureUniqueSlug(baseSlug, excludeId = null) {
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await prisma.content.findFirst({
        where: {
          slug,
          // Exclude current content when updating (finds any content that has this slug except the current content)
          ...(excludeId && { id: { not: excludeId } }),
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
   * Generate a unique slug from a title
   * @param {string} title - The content title
   * @param {string} excludeId - Content ID to exclude from uniqueness check
   * @returns {Promise<string>} - Unique slug
   */
  static async createUniqueSlug(title, excludeId = null) {
    const baseSlug = SlugGenerator.generateSlug(title);
    return await SlugGenerator.ensureUniqueSlug(baseSlug, excludeId);
  }
}

module.exports = SlugGenerator;

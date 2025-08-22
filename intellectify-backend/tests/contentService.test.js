const contentService = require('../src/services/contentService');
const mockPrisma = require('../src/config/database');
const imageService = require('../src/services/imageService');
const AppError = require('../src/utils/AppError');
const { Prisma } = require('@prisma/client');

// Mock imageService
jest.mock('../src/services/imageService', () => ({
  extractImagePaths: jest.fn(),
  moveImageFromTemp: jest.fn(),
  cleanupUnusedImages: jest.fn(),
  cleanupContentImages: jest.fn(),
  deleteImage: jest.fn()
}));

describe('ContentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateSlug', () => {
    it('should generate URL-friendly slug from title', () => {
      const title = 'This is a Test Article!';
      const slug = contentService.generateSlug(title);
      
      expect(slug).toBe('this-is-a-test-article');
    });

    it('should handle special characters', () => {
      const title = 'Article with @#$% Special Characters & Symbols!';
      const slug = contentService.generateSlug(title);
      
      expect(slug).toBe('article-with-special-characters-symbols');
    });

    it('should handle multiple spaces and underscores', () => {
      const title = 'Article   with    multiple___spaces';
      const slug = contentService.generateSlug(title);
      
      expect(slug).toBe('article-with-multiple-spaces');
    });

    it('should remove leading and trailing hyphens', () => {
      const title = '---Article Title---';
      const slug = contentService.generateSlug(title);
      
      expect(slug).toBe('article-title');
    });

    it('should handle empty or whitespace-only titles', () => {
      const emptySlug = contentService.generateSlug('');
      const whitespaceSlug = contentService.generateSlug('   ');
      
      expect(emptySlug).toBe('');
      expect(whitespaceSlug).toBe('');
    });

    it('should handle unicode characters', () => {
      const title = 'Café & Résumé with Naïve Approach';
      const slug = contentService.generateSlug(title);
      
      expect(slug).toBe('caf-rsum-with-nave-approach');
    });

    it('should handle numbers and mixed case', () => {
      const title = 'Top 10 JavaScript Tips for 2024';
      const slug = contentService.generateSlug(title);
      
      expect(slug).toBe('top-10-javascript-tips-for-2024');
    });

    it('should handle very long titles', () => {
      const longTitle = 'a'.repeat(300);
      const slug = contentService.generateSlug(longTitle);
      
      expect(slug).toBe('a'.repeat(300));
      expect(slug.length).toBe(300);
    });
  });

  describe('ensureUniqueSlug', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return original slug if no conflicts', async () => {
      mockPrisma.content.findFirst.mockResolvedValue(null);
      
      const slug = await contentService.ensureUniqueSlug('test-article');
      
      expect(slug).toBe('test-article');
      expect(mockPrisma.content.findFirst).toHaveBeenCalledWith({
        where: { slug: 'test-article' }
      });
    });

    it('should append number if slug exists', async () => {
      mockPrisma.content.findFirst
        .mockResolvedValueOnce({ id: 'existing-1' }) // First call finds conflict
        .mockResolvedValueOnce(null); // Second call finds no conflict
      
      const slug = await contentService.ensureUniqueSlug('test-article');
      
      expect(slug).toBe('test-article-1');
      expect(mockPrisma.content.findFirst).toHaveBeenCalledTimes(2);
    });

    it('should increment number until unique slug found', async () => {
      mockPrisma.content.findFirst
        .mockResolvedValueOnce({ id: 'existing-1' }) // test-article exists
        .mockResolvedValueOnce({ id: 'existing-2' }) // test-article-1 exists
        .mockResolvedValueOnce({ id: 'existing-3' }) // test-article-2 exists
        .mockResolvedValueOnce(null); // test-article-3 is available
      
      const slug = await contentService.ensureUniqueSlug('test-article');
      
      expect(slug).toBe('test-article-3');
      expect(mockPrisma.content.findFirst).toHaveBeenCalledTimes(4);
    });

    it('should exclude specific ID when checking uniqueness', async () => {
      mockPrisma.content.findFirst.mockResolvedValue(null);
      
      const slug = await contentService.ensureUniqueSlug('test-article', 'exclude-id-123');
      
      expect(slug).toBe('test-article');
      expect(mockPrisma.content.findFirst).toHaveBeenCalledWith({
        where: {
          slug: 'test-article',
          id: { not: 'exclude-id-123' }
        }
      });
    });
  });

  describe('createContent', () => {
    let mockAuthor;
    
    beforeEach(() => {
      jest.clearAllMocks();
      
      mockAuthor = {
        id: 'author-123',
        name: 'Test Author',
        email: 'author@test.com'
      };
    });

    it('should create content with generated slug', async () => {
      const contentData = {
        title: 'Test Article',
        content: '<p>Test content</p>',
        excerpt: 'Test excerpt',
        category: 'TECHNOLOGY',
        priority: 1,
        status: 'DRAFT',
        metaTitle: 'Test Meta Title',
        metaDescription: 'Test Meta Description'
      };

      const expectedContent = {
        id: 'content-123',
        ...contentData,
        slug: 'test-article',
        authorId: mockAuthor.id,
        author: {
          id: mockAuthor.id,
          name: mockAuthor.name,
          email: mockAuthor.email
        },
        publishedAt: null
      };

      mockPrisma.content.findFirst.mockResolvedValue(null); // No slug conflict
      mockPrisma.content.create.mockImplementation(({ data, include }) => {
        return Promise.resolve({
          ...data,
          id: 'content-123',
          slug: 'test-article',
          author: {
            id: mockAuthor.id,
            name: mockAuthor.name,
            email: mockAuthor.email
          },
          publishedAt: data.status === 'PUBLISHED' ? new Date() : null
        });
      });

      const result = await contentService.createContent(mockAuthor.id, contentData);

      expect(result).toEqual(expectedContent);
      expect(mockPrisma.content.create).toHaveBeenCalledWith({
        data: {
          title: contentData.title,
          content: contentData.content,
          excerpt: contentData.excerpt,
          category: contentData.category,
          subcategory: undefined,
          priority: contentData.priority,
          slug: 'test-article',
          metaTitle: contentData.metaTitle,
          metaDescription: contentData.metaDescription,
          authorId: mockAuthor.id,
          status: contentData.status
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
    });

    it('should handle default priority', async () => {
      const authorId = 'author-123';
      const contentData = {
        title: 'Test Article',
        content: '<p>Test content</p>'
      };

      mockPrisma.content.findFirst.mockResolvedValue(null);
      mockPrisma.content.create.mockResolvedValue({});

      await contentService.createContent(authorId, contentData);

      expect(mockPrisma.content.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            priority: 0
          })
        })
      );
    });
  });

  describe('updateContent', () => {
    let existingContent;
    
    beforeEach(() => {
      jest.clearAllMocks();
      
      existingContent = {
        id: 'content-123',
        title: 'Existing Article',
        content: '<p>Existing content</p>',
        excerpt: 'Existing excerpt',
        category: 'TECHNOLOGY',
        slug: 'existing-article',
        authorId: 'author-123',
        status: 'DRAFT',
        publishedAt: null
      };
      
      mockPrisma.content.findUnique.mockResolvedValue(existingContent);
    });

    it('should update content and regenerate slug if title changed', async () => {
      const contentId = 'content-123';
      const authorId = 'author-123';
      const existingContent = {
        id: contentId,
        title: 'Old Title',
        slug: 'old-title',
        status: 'DRAFT',
        publishedAt: null,
        authorId
      };

      const updateData = {
        title: 'New Title',
        content: '<p>Updated content</p>',
        status: 'PUBLISHED'
      };

      const updatedContent = {
        ...existingContent,
        ...updateData,
        slug: 'new-title',
        publishedAt: new Date()
      };

      mockPrisma.content.findUnique.mockResolvedValue(existingContent);
      mockPrisma.content.findFirst.mockResolvedValue(null); // Slug uniqueness check
      mockPrisma.content.update.mockResolvedValue(updatedContent);

      const result = await contentService.updateContent(contentId, updateData);

      expect(result).toEqual(updatedContent);
      expect(mockPrisma.content.update).toHaveBeenCalledWith({
        where: { id: contentId },
        data: expect.objectContaining({
          title: updateData.title,
          content: updateData.content,
          status: updateData.status,
          slug: 'new-title',
          publishedAt: expect.any(Date)
        }),
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
    });

    it('should throw error if content not found or access denied', async () => {
      const contentId = 'content-123';
      const authorId = 'author-123';
      const updateData = { title: 'New Title' };

      mockPrisma.content.findUnique.mockResolvedValue(null);

      await expect(
        contentService.updateContent(contentId, updateData)
      ).rejects.toThrow('Content not found');
    });

    it('should set publishedAt when publishing for first time', async () => {
      const contentId = 'content-123';
      const authorId = 'author-123';
      const existingContent = {
        id: contentId,
        status: 'DRAFT',
        publishedAt: null,
        authorId,
        title: 'Test',
        slug: 'test'
      };

      const updateData = { status: 'PUBLISHED' };

      mockPrisma.content.findUnique.mockResolvedValue(existingContent);
      mockPrisma.content.update.mockResolvedValue({});

      await contentService.updateContent(contentId, updateData);

      expect(mockPrisma.content.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'PUBLISHED',
            publishedAt: expect.any(Date)
          })
        })
      );
    });
  });

  describe('deleteContent', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should delete content successfully', async () => {
      const contentId = 'content-123';
      const existingContent = { 
        id: contentId, 
        category: 'TECHNOLOGY',
        content: '<p>Test content</p>'
      };

      mockPrisma.content.findUnique.mockResolvedValue(existingContent);
      mockPrisma.content.delete.mockResolvedValue(existingContent);
      imageService.cleanupContentImages.mockResolvedValue({ success: true });

      const result = await contentService.deleteContent(contentId);

      expect(result).toBe(true);
      expect(mockPrisma.content.delete).toHaveBeenCalledWith({
        where: { id: contentId }
      });
      expect(imageService.cleanupContentImages).toHaveBeenCalledWith(contentId, 'TECHNOLOGY');
    });

    it('should throw error if content not found', async () => {
      const contentId = 'content-123';

      mockPrisma.content.findUnique.mockResolvedValue(null);

      await expect(contentService.deleteContent(contentId))
        .rejects.toThrow('Content not found');
    });

    it('should continue deletion even if image cleanup fails', async () => {
      const contentId = 'content-123';
      const existingContent = { 
        id: contentId, 
        category: 'TECHNOLOGY'
      };

      mockPrisma.content.findUnique.mockResolvedValue(existingContent);
      mockPrisma.content.delete.mockResolvedValue(existingContent);
      imageService.cleanupContentImages.mockRejectedValue(new Error('Cleanup failed'));

      const result = await contentService.deleteContent(contentId);

      expect(result).toBe(true);
      expect(mockPrisma.content.delete).toHaveBeenCalled();
    });
  });

  describe('getContentById', () => {
    let mockContent;
    
    beforeEach(() => {
      jest.clearAllMocks();
      
      mockContent = {
        id: 'content-123',
        title: 'Test Article',
        content: '<p>Test content</p>',
        excerpt: 'Test excerpt',
        category: 'TECHNOLOGY',
        slug: 'test-article',
        status: 'PUBLISHED',
        publishedAt: new Date(),
        author: {
          id: 'author-123',
          name: 'Test Author',
          email: 'author@test.com'
        }
      };
    });

    it('should retrieve content by ID', async () => {
      const contentId = 'content-123';
      const mockContent = {
        id: contentId,
        title: 'Test Content',
        content: '<p>Test content</p>',
        status: 'PUBLISHED',
        author: {
          id: 'author-123',
          name: 'Test Author',
          email: 'author@test.com'
        }
      };

      mockPrisma.content.findUnique.mockResolvedValue(mockContent);

      const result = await contentService.getContentById(contentId);

      expect(result).toEqual(mockContent);
      expect(mockPrisma.content.findUnique).toHaveBeenCalledWith({
        where: { id: contentId },
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
    });

    it('should return null if content not found', async () => {
      const contentId = 'nonexistent-123';

      mockPrisma.content.findUnique.mockResolvedValue(null);

      const result = await contentService.getContentById(contentId);

      expect(result).toBeNull();
    });
  });

  describe('getContentByAuthor', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should retrieve paginated content by author', async () => {
      const authorId = 'author-123';
      const mockContent = [
        { id: '1', title: 'Content 1', priority: 10 },
        { id: '2', title: 'Content 2', priority: 5 }
      ];

      mockPrisma.content.findMany.mockResolvedValue(mockContent);
      mockPrisma.content.count.mockResolvedValue(15);

      const result = await contentService.getContentByAuthor({ 
        authorId, 
        page: 1, 
        limit: 10 
      });

      expect(result.items).toEqual(mockContent);
      expect(result.pagination).toEqual({
        total: 15,
        totalPages: 2,
        currentPage: 1,
        hasNextPage: true,
        hasPreviousPage: false,
        limit: 10
      });

      expect(mockPrisma.content.findMany).toHaveBeenCalledWith({
        where: { authorId },
        orderBy: [
          { priority: 'desc' },
          { publishedAt: 'desc' },
          { createdAt: 'desc' }
        ],
        skip: 0,
        take: 10,
        include: expect.any(Object)
      });
    });

    it('should filter by status when provided', async () => {
      const authorId = 'author-123';

      mockPrisma.content.findMany.mockResolvedValue([]);
      mockPrisma.content.count.mockResolvedValue(0);

      await contentService.getContentByAuthor({ 
        authorId, 
        status: 'PUBLISHED' 
      });

      expect(mockPrisma.content.findMany).toHaveBeenCalledWith({
        where: { authorId, status: 'PUBLISHED' },
        orderBy: expect.any(Array),
        skip: 0,
        take: 10,
        include: expect.any(Object)
      });
    });

    it('should filter by category when provided', async () => {
      const authorId = 'author-123';

      mockPrisma.content.findMany.mockResolvedValue([]);
      mockPrisma.content.count.mockResolvedValue(0);

      await contentService.getContentByAuthor({ 
        authorId, 
        category: 'TECHNOLOGY' 
      });

      expect(mockPrisma.content.findMany).toHaveBeenCalledWith({
        where: { authorId, category: 'TECHNOLOGY' },
        orderBy: expect.any(Array),
        skip: 0,
        take: 10,
        include: expect.any(Object)
      });
    });

    it('should handle pagination correctly', async () => {
      const authorId = 'author-123';

      mockPrisma.content.findMany.mockResolvedValue([]);
      mockPrisma.content.count.mockResolvedValue(25);

      const result = await contentService.getContentByAuthor({ 
        authorId, 
        page: 3, 
        limit: 5 
      });

      expect(result.pagination).toEqual({
        total: 25,
        totalPages: 5,
        currentPage: 3,
        hasNextPage: true,
        hasPreviousPage: true,
        limit: 5
      });

      expect(mockPrisma.content.findMany).toHaveBeenCalledWith({
        where: { authorId },
        orderBy: expect.any(Array),
        skip: 10, // (page 3 - 1) * limit 5
        take: 5,
        include: expect.any(Object)
      });
    });
  });

  describe('updateContentStatus', () => {
    let mockContent;
    
    beforeEach(() => {
      jest.clearAllMocks();
      
      mockContent = {
        id: 'content-123',
        title: 'Test Article',
        status: 'DRAFT',
        publishedAt: null
      };
      
      mockPrisma.content.findUnique.mockResolvedValue(mockContent);
      mockPrisma.content.update.mockImplementation(({ data }) => ({
        ...mockContent,
        ...data,
        status: data.status || mockContent.status,
        publishedAt: data.publishedAt || mockContent.publishedAt
      }));
    });

    it('should update content status to published', async () => {
      const contentId = 'content-123';
      const existingContent = {
        id: contentId,
        status: 'DRAFT',
        publishedAt: null
      };

      const updatedContent = {
        ...existingContent,
        status: 'PUBLISHED',
        publishedAt: new Date()
      };

      mockPrisma.content.findUnique.mockResolvedValue(existingContent);
      mockPrisma.content.update.mockResolvedValue(updatedContent);

      const result = await contentService.updateContentStatus(contentId, 'PUBLISHED');

      expect(result.status).toBe('PUBLISHED');
      expect(result.publishedAt).toBeDefined();
      expect(mockPrisma.content.update).toHaveBeenCalledWith({
        where: { id: contentId },
        data: {
          status: 'PUBLISHED',
          publishedAt: expect.any(Date)
        },
        include: expect.any(Object)
      });
    });

    it('should not update publishedAt if already published before', async () => {
      const contentId = 'content-123';
      const publishedAt = new Date('2024-01-01');
      const existingContent = {
        id: contentId,
        status: 'DRAFT',
        publishedAt
      };

      mockPrisma.content.findUnique.mockResolvedValue(existingContent);
      mockPrisma.content.update.mockResolvedValue(existingContent);

      await contentService.updateContentStatus(contentId, 'PUBLISHED');

      expect(mockPrisma.content.update).toHaveBeenCalledWith({
        where: { id: contentId },
        data: {
          status: 'PUBLISHED',
          publishedAt: publishedAt // Should preserve existing publishedAt
        },
        include: expect.any(Object)
      });
    });

    it('should throw error if content not found', async () => {
      const contentId = 'nonexistent-123';

      mockPrisma.content.findUnique.mockResolvedValue(null);

      await expect(contentService.updateContentStatus(contentId, 'PUBLISHED'))
        .rejects.toThrow('Content not found');
    });
  });

  describe('getPublishedContent', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should retrieve published content only', async () => {
      const mockContent = [
        { id: '1', title: 'Published Content 1', status: 'PUBLISHED' },
        { id: '2', title: 'Published Content 2', status: 'PUBLISHED' }
      ];

      mockPrisma.content.findMany.mockResolvedValue(mockContent);
      mockPrisma.content.count.mockResolvedValue(2);

      const result = await contentService.getPublishedContent();

      expect(result.items).toEqual(mockContent);
      expect(mockPrisma.content.findMany).toHaveBeenCalledWith({
        where: { status: 'PUBLISHED' },
        orderBy: [
          { priority: 'desc' },
          { publishedAt: 'desc' },
          { createdAt: 'desc' }
        ],
        skip: 0,
        take: 10,
        include: expect.any(Object)
      });
    });

    it('should filter by category when provided', async () => {
      mockPrisma.content.findMany.mockResolvedValue([]);
      mockPrisma.content.count.mockResolvedValue(0);

      await contentService.getPublishedContent({ category: 'TECHNOLOGY' });

      expect(mockPrisma.content.findMany).toHaveBeenCalledWith({
        where: { status: 'PUBLISHED', category: 'TECHNOLOGY' },
        orderBy: expect.any(Array),
        skip: 0,
        take: 10,
        include: expect.any(Object)
      });
    });
  });

  describe('getContentBySlug', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should retrieve published content by slug', async () => {
      const slug = 'test-article';
      const mockContent = {
        id: 'content-123',
        title: 'Test Article',
        slug,
        status: 'PUBLISHED'
      };

      mockPrisma.content.findFirst.mockResolvedValue(mockContent);

      const result = await contentService.getContentBySlug(slug);

      expect(result).toEqual(mockContent);
      expect(mockPrisma.content.findFirst).toHaveBeenCalledWith({
        where: {
          slug,
          status: 'PUBLISHED'
        },
        include: expect.any(Object)
      });
    });

    it('should return null for draft content', async () => {
      const slug = 'draft-article';

      mockPrisma.content.findFirst.mockResolvedValue(null);

      const result = await contentService.getContentBySlug(slug);

      expect(result).toBeNull();
    });

    it('should return null for non-existent slug', async () => {
      const slug = 'nonexistent-article';

      mockPrisma.content.findFirst.mockResolvedValue(null);

      const result = await contentService.getContentBySlug(slug);

      expect(result).toBeNull();
    });
  });

  describe('Image Integration', () => {
    let mockContent;
    
    beforeEach(() => {
      jest.clearAllMocks();
      
      mockContent = {
        id: 'content-123',
        title: 'Test Article',
        content: '<p>Test content</p>',
        category: 'TECHNOLOGY',
        slug: 'test-article'
      };
      
      // Mock image extraction
      imageService.extractImagePaths.mockImplementation((content) => {
        const matches = content.match(/<img[^>]+src="([^">]+)"/g) || [];
        return matches.map(match => {
          const srcMatch = match.match(/src="([^"]+)"/);
          return srcMatch ? srcMatch[1] : null;
        }).filter(Boolean);
      });
      
      // Mock image moving
      imageService.moveImageFromTemp.mockImplementation((path) => 
        Promise.resolve(`uploads/content/TECHNOLOGY/content-123/${path}`)
      );
    });

    it('should move temporary images during content creation', async () => {
      const authorId = 'author-123';
      const contentData = {
        title: 'Test Article',
        content: '<p>Content with <img src="/api/images/temp/image.jpg" /></p>',
        category: 'TECHNOLOGY'
      };

      const mockContent = {
        id: 'content-123',
        ...contentData,
        slug: 'test-article'
      };

      mockPrisma.content.findFirst.mockResolvedValue(null); // No slug conflict
      mockPrisma.content.create.mockResolvedValue(mockContent);
      imageService.extractImagePaths.mockReturnValue(['uploads/temp/image.jpg']);
      imageService.moveImageFromTemp.mockResolvedValue({});

      await contentService.createContent(authorId, contentData);

      expect(imageService.extractImagePaths).toHaveBeenCalledWith(contentData.content);
      expect(imageService.moveImageFromTemp).toHaveBeenCalledWith('image.jpg', 'TECHNOLOGY', 'content-123');
    });

    it('should cleanup unused images during content update', async () => {
      const contentId = 'content-123';
      const existingContent = {
        id: contentId,
        title: 'Test Content',
        content: '<p>Old content with <img src="/api/images/old-image.jpg" /></p>',
        authorId: 'author-123',
        category: 'TECHNOLOGY',
        slug: 'test-content',
        status: 'DRAFT',
        publishedAt: null
      };

      const updateData = {
        content: '<p>New content with <img src="/api/images/new-image.jpg" /></p>'
      };

      mockPrisma.content.findUnique.mockResolvedValue(existingContent);
      mockPrisma.content.update.mockResolvedValue({ ...existingContent, ...updateData });
      
      // Mock extractImagePaths to return the paths as they would be extracted from HTML
      imageService.extractImagePaths
        .mockImplementation((html) => {
          // Simulate how the actual implementation extracts paths from HTML
          if (html.includes('old-image.jpg')) return ['/api/images/old-image.jpg'];
          if (html.includes('new-image.jpg')) return ['/api/images/new-image.jpg'];
          return [];
        });
      
      // Mock deleteImage to simulate successful deletion
      imageService.deleteImage.mockResolvedValue({ success: true });

      await contentService.updateContent(contentId, updateData);

      // Verify that extractImagePaths was called
      expect(imageService.extractImagePaths).toHaveBeenCalled();
      // The implementation now properly handles the path with /api/images/ prefix
      expect(imageService.deleteImage).toHaveBeenCalledWith('old-image.jpg');
    });

    it('should handle image service errors gracefully', async () => {
      const authorId = 'author-123';
      const contentData = {
        title: 'Test Article',
        content: '<p>Content with images</p>'
      };

      mockPrisma.content.findFirst.mockResolvedValue(null);
      mockPrisma.content.create.mockResolvedValue({ id: 'content-123' });
      imageService.extractImagePaths.mockImplementation(() => {
        throw new Error('Image service error');
      });

      // Should not throw error, just log and continue
      await expect(contentService.createContent(authorId, contentData))
        .resolves.toBeDefined();
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should handle database errors in createContent', async () => {
      const authorId = 'author-123';
      const contentData = { title: 'Test', content: 'Test' };

      mockPrisma.content.findFirst.mockResolvedValue(null);
      mockPrisma.content.create.mockRejectedValue(new Error('Database error'));

      await expect(contentService.createContent(authorId, contentData))
        .rejects.toThrow('Database error');
    });

    it('should handle database errors in updateContent', async () => {
      const contentId = 'content-123';
      const updateData = { title: 'Updated' };

      mockPrisma.content.findUnique.mockResolvedValue({ id: contentId });
      mockPrisma.content.update.mockRejectedValue(new Error('Database error'));

      await expect(contentService.updateContent(contentId, updateData))
        .rejects.toThrow('Database error');
    });

    it('should handle Prisma constraint violations', async () => {
      const authorId = 'author-123';
      const contentData = { title: 'Test', content: 'Test' };

      mockPrisma.content.findFirst.mockResolvedValue(null);
      const prismaError = new Error('Unique constraint failed');
      prismaError.code = 'P2002';
      mockPrisma.content.create.mockRejectedValue(prismaError);

      await expect(contentService.createContent(authorId, contentData))
        .rejects.toThrow('Unique constraint failed');
    });
  });
});
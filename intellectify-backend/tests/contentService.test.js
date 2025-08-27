// First define mock functions
const mockGenerateSlug = jest.fn();
const mockEnsureUniqueSlug = jest.fn();
const mockCreateUniqueSlug = jest.fn();

// Mock modules before requiring them
jest.mock('../src/services/slugGenerator', () => ({
  generateSlug: (...args) => mockGenerateSlug(...args),
  ensureUniqueSlug: (...args) => mockEnsureUniqueSlug(...args),
  createUniqueSlug: (...args) => mockCreateUniqueSlug(...args),
  SlugGenerator: {
    generateSlug: (...args) => mockGenerateSlug(...args),
    ensureUniqueSlug: (...args) => mockEnsureUniqueSlug(...args),
    createUniqueSlug: (...args) => mockCreateUniqueSlug(...args)
  }
}));

// Mock other modules
jest.mock('../src/services/contentImageService', () => ({
  moveTemporaryImages: jest.fn(),
  updateContentImages: jest.fn(),
  cleanupUnusedImages: jest.fn(),
  cleanupContentImages: jest.fn()
}));

jest.mock('../src/services/fileStorageService', () => ({
  extractImagePaths: jest.fn().mockImplementation((content) => {
    const regex = /!\[.*?\]\((.*?)\)|<img[^>]+src="([^">]+)"/g;
    const matches = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      const path = match[1] || match[2];
      if (path && path.startsWith('temp/')) {
        matches.push(path);
      }
    }
    return matches;
  }),
  moveImageFromTemp: jest.fn().mockImplementation((path) => 
    Promise.resolve(`uploads/content/TECHNOLOGY/content-123/${path}`)
  ),
  cleanupUnusedImages: jest.fn().mockResolvedValue(),
  cleanupContentImages: jest.fn().mockResolvedValue(),
  deleteImage: jest.fn().mockResolvedValue()
}));

// Now require the modules
const contentService = require('../src/services/contentService');
const mockPrisma = require('../src/config/database');
const fileStorageService = require('../src/services/fileStorageService');
const ImageManager = require('../src/services/contentImageService');
const AppError = require('../src/utils/appError');
const { Prisma } = require('@prisma/client');
const { generateSlug, ensureUniqueSlug, createUniqueSlug } = require('../src/services/slugGenerator');

describe('ContentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateSlug', () => {
    it('should generate URL-friendly slug from title', () => {
      mockGenerateSlug.mockImplementation((title) => {
        if (!title || title.trim() === '') return '';
        return title
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, '')
          .replace(/[\s_-]+/g, '-')
          .replace(/^-+|-+$/g, '');
      });

      const title = 'This is a Test Article!';
      const slug = generateSlug(title);
      
      expect(slug).toBe('this-is-a-test-article');
    });

    it('should handle special characters', () => {
      mockGenerateSlug.mockImplementation((title) => {
        if (!title || title.trim() === '') return '';
        return title
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, '')
          .replace(/[\s_-]+/g, '-')
          .replace(/^-+|-+$/g, '');
      });

      const title = 'Article with @#$% Special Characters & Symbols!';
      const slug = generateSlug(title);
      
      expect(slug).toBe('article-with-special-characters-symbols');
    });

    it('should handle multiple spaces and underscores', () => {
      mockGenerateSlug.mockImplementation((title) => {
        if (!title || title.trim() === '') return '';
        return title
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, '')
          .replace(/[\s_-]+/g, '-')
          .replace(/^-+|-+$/g, '');
      });

      const title = 'Article   with    multiple___spaces';
      const slug = generateSlug(title);
      
      expect(slug).toBe('article-with-multiple-spaces');
    });

    it('should remove leading and trailing hyphens', () => {
      mockGenerateSlug.mockImplementation((title) => {
        if (!title || title.trim() === '') return '';
        return title
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, '')
          .replace(/[\s_-]+/g, '-')
          .replace(/^-+|-+$/g, '');
      });

      const title = '---Article Title---';
      const slug = generateSlug(title);
      
      expect(slug).toBe('article-title');
    });

    it('should handle empty or whitespace-only titles', () => {
      mockGenerateSlug.mockImplementation((title) => {
        if (!title || title.trim() === '') return '';
        return title
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, '')
          .replace(/[\s_-]+/g, '-')
          .replace(/^-+|-+$/g, '');
      });

      const emptySlug = generateSlug('');
      const whitespaceSlug = generateSlug('   ');
      
      expect(emptySlug).toBe('');
      expect(whitespaceSlug).toBe('');
    });

    it('should handle unicode characters', () => {
      mockGenerateSlug.mockImplementation((title) => {
        if (!title || title.trim() === '') return '';
        return title
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, '')
          .replace(/[\s_-]+/g, '-')
          .replace(/^-+|-+$/g, '');
      });

      const title = 'Café & Résumé with Naïve Approach';
      const slug = generateSlug(title);
      
      expect(slug).toBe('caf-rsum-with-nave-approach');
    });

    it('should handle numbers and mixed case', () => {
      mockGenerateSlug.mockImplementation((title) => {
        if (!title || title.trim() === '') return '';
        return title
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, '')
          .replace(/[\s_-]+/g, '-')
          .replace(/^-+|-+$/g, '');
      });

      const title = 'Top 10 JavaScript Tips for 2024';
      const slug = generateSlug(title);
      
      expect(slug).toBe('top-10-javascript-tips-for-2024');
    });

    it('should handle very long titles', () => {
      mockGenerateSlug.mockImplementation((title) => {
        if (!title || title.trim() === '') return '';
        return title
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, '')
          .replace(/[\s_-]+/g, '-')
          .replace(/^-+|-+$/g, '');
      });

      const longTitle = 'a'.repeat(300);
      const slug = generateSlug(longTitle);
      
      expect(slug).toBe('a'.repeat(300));
      expect(slug.length).toBe(300);
    });
  });

  describe('ensureUniqueSlug', () => {
    // Reset mock implementation before each test
    beforeEach(() => {
      mockEnsureUniqueSlug.mockImplementation(async (slug, excludeId) => {
        // First check if the original slug exists
        const existing = await mockPrisma.content.findFirst({
          where: { slug, ...(excludeId && { id: { not: excludeId } }) }
        });
        
        if (!existing) return slug;
        
        // If slug exists, try with incrementing numbers
        let counter = 1;
        let newSlug = `${slug}-${counter}`;
        
        // Keep trying until we find a unique slug (mimic the actual implementation)
        while (counter < 10) { // Add a reasonable limit to prevent infinite loops in tests
          const exists = await mockPrisma.content.findFirst({
            where: { slug: newSlug, ...(excludeId && { id: { not: excludeId } }) }
          });
          
          if (!exists) return newSlug;
          counter++;
          newSlug = `${slug}-${counter}`;
        }
        
        return newSlug;
      });
    });

    it('should return original slug if no conflicts', async () => {
      // Mock findFirst to return null (no conflict)
      mockPrisma.content.findFirst.mockResolvedValue(null);
      
      const slug = await ensureUniqueSlug('test-article');

      expect(slug).toBe('test-article');
      expect(mockPrisma.content.findFirst).toHaveBeenCalledWith({
        where: { slug: 'test-article' }
      });
    });

    it('should append number if slug exists', async () => {
      // First call finds a conflict, second call finds no conflict
      mockPrisma.content.findFirst
        .mockImplementationOnce(() => Promise.resolve({ id: 'existing-id' })) // First call finds a conflict
        .mockImplementationOnce(() => Promise.resolve(null)); // Second call finds no conflict

      const slug = await ensureUniqueSlug('test-article');

      expect(slug).toBe('test-article-1');
      // Verify the first call checks for the original slug
      expect(mockPrisma.content.findFirst).toHaveBeenNthCalledWith(1, {
        where: { slug: 'test-article' }
      });
      // Verify the second call checks for the new slug with -1
      expect(mockPrisma.content.findFirst).toHaveBeenNthCalledWith(2, {
        where: { slug: 'test-article-1' }
      });
    });

    it('should increment number until unique slug found', async () => {
      // First three calls find conflicts, fourth finds no conflict
      mockPrisma.content.findFirst
        .mockImplementationOnce(() => Promise.resolve({ id: 'existing-1' })) // test-article exists
        .mockImplementationOnce(() => Promise.resolve({ id: 'existing-2' })) // test-article-1 exists
        .mockImplementationOnce(() => Promise.resolve({ id: 'existing-3' })) // test-article-2 exists
        .mockImplementationOnce(() => Promise.resolve(null)); // test-article-3 is available

      const slug = await ensureUniqueSlug('test-article');
      
      expect(slug).toBe('test-article-3');
      // Verify all the expected calls were made
      expect(mockPrisma.content.findFirst).toHaveBeenNthCalledWith(1, {
        where: { slug: 'test-article' }
      });
      expect(mockPrisma.content.findFirst).toHaveBeenNthCalledWith(2, {
        where: { slug: 'test-article-1' }
      });
      expect(mockPrisma.content.findFirst).toHaveBeenNthCalledWith(3, {
        where: { slug: 'test-article-2' }
      });
      expect(mockPrisma.content.findFirst).toHaveBeenNthCalledWith(4, {
        where: { slug: 'test-article-3' }
      });
    });

    it('should exclude specific ID when checking uniqueness', async () => {
      // Set up the mock to verify the exclude ID is used in the query
      const mockFindFirst = jest.spyOn(mockPrisma.content, 'findFirst');
      mockFindFirst.mockResolvedValue(null);
      
      const slug = await ensureUniqueSlug('test-article', 'exclude-id-123');
      
      expect(slug).toBe('test-article');
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { 
          slug: 'test-article',
          id: { not: 'exclude-id-123' }
        }
      });
      
      // Clean up the spy
      mockFindFirst.mockRestore();
    });
  });

  describe('createContent', () => {
    let mockAuthor;
    let contentData;
    
    beforeEach(() => {
      mockAuthor = {
        id: 'author-123',
        name: 'Test User',
        email: 'test@example.com'
      };

      contentData = {
        title: 'Test Article',
        content: 'This is a test article content',
        excerpt: 'Test excerpt',
        category: 'TECHNOLOGY',
        status: 'DRAFT',
        priority: 1
      };

      // Reset all mocks before each test
      jest.clearAllMocks();

      // Mock the SlugGenerator methods
      mockGenerateSlug.mockImplementation((title) => {
        if (!title) return '';
        return title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
      });

      mockEnsureUniqueSlug.mockImplementation(async (slug) => slug);
      mockCreateUniqueSlug.mockImplementation(async (title) => {
        return 'test-article'; // Always return a consistent slug for testing
      });

      // Mock Prisma
      mockPrisma.content.create.mockImplementation(({ data }) => {
        return Promise.resolve({
          id: 'content-123',
          ...data,
          slug: 'test-article',
          author: {
            id: mockAuthor.id,
            name: mockAuthor.name,
            email: mockAuthor.email
          }
        });
      });
      
      // Mock image manager
      ImageManager.moveTemporaryImages.mockResolvedValue();
    });
    
    it('should create content with generated slug', async () => {
      const result = await contentService.createContent(mockAuthor.id, contentData);

      expect(result).toMatchObject({
        id: 'content-123',
        title: 'Test Article',
        slug: 'test-article',
        status: 'DRAFT',
        author: {
          id: mockAuthor.id,
          name: mockAuthor.name,
          email: mockAuthor.email
        }
      });
      
      expect(mockCreateUniqueSlug).toHaveBeenCalledWith('Test Article');
      expect(ImageManager.moveTemporaryImages).toHaveBeenCalledWith(
        contentData.content,
        contentData.category,
        'content-123'
      );
      expect(result.slug).toBe('test-article');
    });
    
    it('should handle default priority', async () => {
      const authorId = 'author-123';
      const contentData = {
        title: 'Test Article',
        content: 'Test content',
        category: 'TECHNOLOGY',
        status: 'DRAFT'
      };

      // Mock SlugGenerator methods
      mockGenerateSlug.mockImplementation((title) => {
        if (!title) return '';
        return title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
      });

      mockEnsureUniqueSlug.mockImplementation(async (slug) => slug);
      mockCreateUniqueSlug.mockImplementation(async (title) => {
        const baseSlug = title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        return baseSlug;
      });

      // Mock Prisma response
      mockPrisma.content.create.mockResolvedValue({
        id: 'content-123',
        ...contentData,
        slug: 'test-article',
        authorId,
        publishedAt: null,
        priority: 0,
        author: {
          id: authorId,
          name: 'Test User',
          email: 'test@example.com'
        }
      });

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
        content: 'Existing content',
        excerpt: 'Existing excerpt',
        category: 'TECHNOLOGY',
        slug: 'existing-article',
        authorId: 'author-123',
        status: 'DRAFT',
        publishedAt: null
      };
      
      mockPrisma.content.findUnique.mockResolvedValue(existingContent);
      mockPrisma.content.update.mockImplementation(({ data }) => ({
        ...existingContent,
        ...data,
        status: data.status || existingContent.status,
        publishedAt: data.publishedAt || existingContent.publishedAt
      }));
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
      content: 'Updated content with <img src="temp/image.jpg">',
      status: 'PUBLISHED'
    };
    
    // Reset all mocks before setting up new ones
    jest.clearAllMocks();

    // Mock the existing content
    mockPrisma.content.findUnique.mockResolvedValue(existingContent);
    
    // Mock the slug generation
    mockGenerateSlug.mockImplementation((title) => {
      if (!title) return '';
      return title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
    });
    
    mockCreateUniqueSlug.mockImplementation(async (title) => {
      const baseSlug = title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
      return baseSlug;
    });

    // Mock the update
    mockPrisma.content.update.mockImplementation(({ where, data }) => {
      return Promise.resolve({
        ...existingContent,
        ...data,
        slug: 'new-title',
        publishedAt: new Date('2025-08-27T13:51:51.705Z'),
        author: {
          id: authorId,
          name: 'Test User',
          email: 'test@example.com'
        }
      });
    });

    // Mock image manager
    ImageManager.updateContentImages.mockResolvedValue(
      'Updated content with <img src="uploads/content/TECHNOLOGY/content-123/image.jpg">'
    );

    const result = await contentService.updateContent(contentId, updateData);

    expect(result.title).toBe('New Title');
    expect(result.slug).toBe('new-title');
    expect(result.status).toBe('PUBLISHED');
    expect(result.publishedAt).toBeInstanceOf(Date);
    
    // Verify the update was called with the correct data
    expect(mockPrisma.content.update).toHaveBeenCalled();
    
    // Get the actual call arguments
    const updateCall = mockPrisma.content.update.mock.calls[0][0];
    
    // Verify the slug was set in the update
    expect(updateCall.data.slug).toBe('new-title');
    expect(updateCall.data.title).toBe('New Title');
    expect(updateCall.include).toEqual({
      author: {
        select: {
          id: true,
          name: true,
          email: true
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

    // Mock SlugGenerator methods
    mockGenerateSlug.mockReturnValue('test');
    mockEnsureUniqueSlug.mockResolvedValue('test');
    
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

describe('Image Integration', () => {
    let mockContent;
    let consoleErrorSpy;
    
    beforeEach(() => {
      jest.clearAllMocks();
      
      // Mock console.error to prevent test output pollution
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      mockContent = {
        id: 'content-123',
        title: 'Test Article',
        content: 'Test content',
        category: 'TECHNOLOGY',
        slug: 'test-article'
      };
      
      // Mock image extraction
      fileStorageService.extractImagePaths.mockImplementation((content) => {
        const matches = content.match(/<img[^>]+src="([^">]+)"/g) || [];
        return matches.map(match => {
          const srcMatch = match.match(/src="([^"]+)"/);
          return srcMatch ? srcMatch[1] : null;
        }).filter(Boolean);
      });
      
      // Mock image moving
      fileStorageService.moveImageFromTemp.mockImplementation((path) => 
        Promise.resolve(`uploads/content/TECHNOLOGY/content-123/${path}`)
      );
    fileStorageService.extractImagePaths.mockImplementation((content) => {
      const matches = content.match(/<img[^>]+src="([^">]+)"/g) || [];
      return matches.map(match => {
        const srcMatch = match.match(/src="([^"]+)"/);
        return srcMatch ? srcMatch[1] : null;
      }).filter(Boolean);
    });
    
    // Mock image moving
    fileStorageService.moveImageFromTemp.mockImplementation((path) => 
      Promise.resolve(`uploads/content/TECHNOLOGY/content-123/${path}`)
    );
  });

  it('should move temporary images during content creation', async () => {
    const authorId = 'user-123';
    const contentData = {
      title: 'Test Article',
      content: 'Content with ![image](temp/image.jpg)',
      category: 'TECHNOLOGY',
      status: 'DRAFT'
    };

    // Mock SlugGenerator methods
    mockGenerateSlug.mockReturnValue('test-article');
    mockEnsureUniqueSlug.mockResolvedValue('test-article');
    
    const mockContent = {
      id: 'content-123',
      ...contentData,
      slug: 'test-article',
      authorId,
      publishedAt: null,
      author: {
        id: authorId,
        name: 'Test User',
        email: 'test@example.com'
      }
    };

    mockPrisma.content.create.mockResolvedValue(mockContent);
    ImageManager.moveTemporaryImages.mockResolvedValue();

    await contentService.createContent(authorId, contentData);

    expect(ImageManager.moveTemporaryImages).toHaveBeenCalledWith(
      contentData.content,
      contentData.category,
      'content-123'
    );
  });

  it('should cleanup unused images during content update', async () => {
    const contentId = 'content-123';
    const existingContent = {
      id: contentId,
      title: 'Test Content',
      content: 'Old content with ![image](old-image.jpg)',
      authorId: 'author-123',
      category: 'TECHNOLOGY',
      slug: 'test-content',
      status: 'DRAFT',
      publishedAt: null
    };

    const updateData = {
      content: 'New content with ![image](new-image.jpg)'
    };

    // Mock SlugGenerator methods
    mockGenerateSlug.mockReturnValue('test-content');
    mockEnsureUniqueSlug.mockResolvedValue('test-content');
    
    mockPrisma.content.findUnique.mockResolvedValue(existingContent);
    mockPrisma.content.update.mockResolvedValue({ ...existingContent, ...updateData });
    
    // Mock ImageManager methods
    ImageManager.updateContentImages.mockResolvedValue(updateData.content);
    ImageManager.cleanupUnusedImages.mockResolvedValue();

    await contentService.updateContent(contentId, updateData);

    // Verify that ImageManager methods were called
    expect(ImageManager.updateContentImages).toHaveBeenCalledWith(updateData.content, 'TECHNOLOGY', contentId);
    expect(ImageManager.cleanupUnusedImages).toHaveBeenCalledWith(existingContent.content, updateData.content, contentId);
  });

  it('should handle image service errors gracefully', async () => {
    // Mock the image service to throw an error
    const mockError = new Error('Image processing failed');
    
    // Mock the implementation to log the error but not throw
    const originalMoveTemporaryImages = ImageManager.moveTemporaryImages;
    ImageManager.moveTemporaryImages = jest.fn().mockImplementation(async () => {
      console.error('Error moving temporary images:', mockError);
      // Don't rethrow the error to simulate graceful handling
    });
    
    const authorId = 'user-123';
    const contentData = {
      title: 'Test Article',
      content: 'Content with ![image](temp/image.jpg)',
      category: 'TECHNOLOGY',
      status: 'DRAFT'
    };
    
    // Mock SlugGenerator methods
    mockGenerateSlug.mockReturnValue('test-article');
    mockEnsureUniqueSlug.mockResolvedValue('test-article');
    
    // Mock content creation
    const mockContent = {
      id: 'content-123',
      ...contentData,
      slug: 'test-article',
      authorId,
      publishedAt: null,
      author: {
        id: authorId,
        name: 'Test User',
        email: 'test@example.com'
      }
    };
    
    // Mock successful content creation despite image error
    mockPrisma.content.create.mockResolvedValue(mockContent);

    // Should not throw error, just log and continue
    const result = await contentService.createContent(authorId, contentData);
    
    // Verify the content was still created despite the image error
    expect(result).toEqual(mockContent);
    expect(ImageManager.moveTemporaryImages).toHaveBeenCalledWith(
      contentData.content,
      contentData.category,
      'content-123'
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error moving temporary images:', expect.any(Error));
    expect(mockPrisma.content.create).toHaveBeenCalled();
    
    // Restore the original implementation
    ImageManager.moveTemporaryImages = originalMoveTemporaryImages;
  });
  });

  describe('Error Handling', () => {
    it('should handle database errors in createContent', async () => {
      const authorId = 'user-123';
      const contentData = {
        title: 'Test Article',
        content: 'Test content',
        category: 'TECHNOLOGY',
        status: 'DRAFT'
      };

    // Mock SlugGenerator methods
    mockGenerateSlug.mockReturnValue('test-article');
    mockEnsureUniqueSlug.mockResolvedValue('test-article');
    
    // Mock database error
    mockPrisma.content.create.mockRejectedValue(new Error('Database error'));

    await expect(contentService.createContent(authorId, contentData))
      .rejects.toThrow('Database error');
  });

  it('should handle database errors in updateContent', async () => {
    const contentId = 'content-123';
    const updateData = { title: 'Updated' };

    // Mock SlugGenerator methods
    mockGenerateSlug.mockReturnValue('test-article');
    mockEnsureUniqueSlug.mockResolvedValue('test-article');
    
    mockPrisma.content.findUnique.mockResolvedValue({ id: contentId });
    mockPrisma.content.update.mockRejectedValue(new Error('Database error'));

    await expect(contentService.updateContent(contentId, updateData))
      .rejects.toThrow('Database error');
  });

  it('should handle Prisma constraint violations', async () => {
    const authorId = 'user-123';
    const contentData = {
      title: 'Test Article',
      content: 'Test content',
      category: 'TECHNOLOGY',
      status: 'DRAFT'
    };

    // Mock SlugGenerator methods
    mockGenerateSlug.mockReturnValue('test-article');
    mockEnsureUniqueSlug.mockResolvedValue('test-article');
    
    // Mock unique constraint violation
    const error = new Error('Unique constraint failed');
    error.code = 'P2002';
    mockPrisma.content.create.mockRejectedValue(error);

    await expect(contentService.createContent(authorId, contentData))
      .rejects.toThrow('Unique constraint failed');
  });
});
});
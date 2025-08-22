import { contentService } from '../services/contentService.js';
import { APIError } from '../utils/errorHandler.js';

export const adminContentController = {
  async createContent(req, res) {
    try {
      const { title, content, excerpt, category, status, priority } = req.body;
      
      const newContent = await contentService.createContent({
        title,
        content,
        excerpt,
        category,
        status,
        priority,
        authorId: req.user.id
      });

      res.status(201).json({
        success: true,
        data: newContent
      });
    } catch (error) {
      APIError.handle(error, res);
    }
  }
};
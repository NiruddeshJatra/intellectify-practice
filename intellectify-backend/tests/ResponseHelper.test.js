const ResponseHelper = require('../src/utils/ResponseHelper');

describe('ResponseHelper', () => {
  let mockRes;

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };
  });

  describe('success', () => {
    it('should create successful response with data', () => {
      const data = { id: 1, name: 'Test' };
      const message = 'Success message';

      ResponseHelper.success(mockRes, data, message);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data,
        message
      });
    });

    it('should create successful response without data', () => {
      ResponseHelper.success(mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true
      });
    });

    it('should create successful response with custom status code', () => {
      const data = { id: 1 };
      
      ResponseHelper.success(mockRes, data, null, 201);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data
      });
    });

    it('should include pagination when provided', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const pagination = {
        currentPage: 1,
        totalPages: 5,
        totalItems: 50,
        itemsPerPage: 10,
        hasNextPage: true,
        hasPrevPage: false
      };

      ResponseHelper.success(mockRes, data, null, 200, pagination);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data,
        pagination
      });
    });
  });

  describe('error', () => {
    it('should create error response with default status', () => {
      const errorMessage = 'Something went wrong';

      ResponseHelper.error(mockRes, errorMessage);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: errorMessage
      });
    });

    it('should create error response with custom status', () => {
      const errorMessage = 'Not found';

      ResponseHelper.error(mockRes, errorMessage, 404);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: errorMessage
      });
    });

    it('should include error details when provided', () => {
      const errorMessage = 'Validation failed';
      const details = ['Field is required', 'Invalid format'];

      ResponseHelper.error(mockRes, errorMessage, 422, details);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: errorMessage,
        details
      });
    });
  });

  describe('validationError', () => {
    it('should create validation error with array of errors', () => {
      const errors = ['Name is required', 'Email is invalid'];

      ResponseHelper.validationError(mockRes, errors);

      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    });

    it('should create validation error with single error', () => {
      const error = 'Name is required';

      ResponseHelper.validationError(mockRes, error);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        details: [error]
      });
    });

    it('should use custom message', () => {
      const errors = ['Invalid input'];
      const message = 'Custom validation message';

      ResponseHelper.validationError(mockRes, errors, message);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: message,
        details: errors
      });
    });
  });

  describe('notFound', () => {
    it('should create not found response with default message', () => {
      ResponseHelper.notFound(mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Resource not found'
      });
    });

    it('should create not found response with resource name', () => {
      ResponseHelper.notFound(mockRes, 'User');

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'User not found'
      });
    });

    it('should create not found response with resource name and ID', () => {
      ResponseHelper.notFound(mockRes, 'User', 123);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'User with ID 123 not found'
      });
    });
  });

  describe('unauthorized', () => {
    it('should create unauthorized response with default message', () => {
      ResponseHelper.unauthorized(mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Unauthorized access'
      });
    });

    it('should create unauthorized response with custom message', () => {
      const message = 'Invalid token';

      ResponseHelper.unauthorized(mockRes, message);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: message
      });
    });
  });

  describe('forbidden', () => {
    it('should create forbidden response with default message', () => {
      ResponseHelper.forbidden(mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access forbidden'
      });
    });

    it('should create forbidden response with custom message', () => {
      const message = 'Insufficient permissions';

      ResponseHelper.forbidden(mockRes, message);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: message
      });
    });
  });

  describe('serverError', () => {
    it('should create server error response with default message', () => {
      ResponseHelper.serverError(mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Internal server error'
      });
    });

    it('should create server error response with custom message', () => {
      const message = 'Database connection failed';

      ResponseHelper.serverError(mockRes, message);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: message
      });
    });
  });

  describe('paginated', () => {
    it('should create paginated response', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const currentPage = 2;
      const totalItems = 25;
      const itemsPerPage = 10;

      ResponseHelper.paginated(mockRes, data, currentPage, totalItems, itemsPerPage);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data,
        pagination: {
          currentPage: 2,
          totalPages: 3,
          totalItems: 25,
          itemsPerPage: 10,
          hasNextPage: true,
          hasPrevPage: true
        }
      });
    });

    it('should handle first page correctly', () => {
      const data = [{ id: 1 }];
      
      ResponseHelper.paginated(mockRes, data, 1, 15, 10);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data,
        pagination: {
          currentPage: 1,
          totalPages: 2,
          totalItems: 15,
          itemsPerPage: 10,
          hasNextPage: true,
          hasPrevPage: false
        }
      });
    });

    it('should handle last page correctly', () => {
      const data = [{ id: 1 }];
      
      ResponseHelper.paginated(mockRes, data, 3, 25, 10);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data,
        pagination: {
          currentPage: 3,
          totalPages: 3,
          totalItems: 25,
          itemsPerPage: 10,
          hasNextPage: false,
          hasPrevPage: true
        }
      });
    });
  });

  describe('created', () => {
    it('should create created response with default message', () => {
      const data = { id: 1, name: 'New Item' };

      ResponseHelper.created(mockRes, data);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data,
        message: 'Resource created successfully'
      });
    });

    it('should create created response with custom message', () => {
      const data = { id: 1 };
      const message = 'User created successfully';

      ResponseHelper.created(mockRes, data, message);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data,
        message
      });
    });
  });

  describe('noContent', () => {
    it('should create no content response', () => {
      ResponseHelper.noContent(mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(204);
      expect(mockRes.send).toHaveBeenCalled();
    });
  });

  describe('handleResult', () => {
    it('should handle successful result', () => {
      const result = {
        success: true,
        data: { id: 1, name: 'Test' }
      };

      ResponseHelper.handleResult(mockRes, result);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: result.data,
        message: 'Operation successful'
      });
    });

    it('should handle failed result', () => {
      const result = {
        success: false,
        error: 'Operation failed',
        statusCode: 400
      };

      ResponseHelper.handleResult(mockRes, result);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Operation failed'
      });
    });

    it('should use custom messages', () => {
      const result = { success: true, data: {} };
      const successMessage = 'Custom success';
      const errorMessage = 'Custom error';

      ResponseHelper.handleResult(mockRes, result, successMessage, errorMessage);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {},
        message: successMessage
      });
    });
  });

  // Removed validateRequiredFields tests - function removed from ResponseHelper

  describe('asyncHandler', () => {
    it('should handle successful async function', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      const mockNext = jest.fn();
      const wrappedFn = ResponseHelper.asyncHandler(mockFn);

      await wrappedFn('req', 'res', mockNext);

      expect(mockFn).toHaveBeenCalledWith('req', 'res', mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle async function errors', async () => {
      const error = new Error('Async error');
      const mockFn = jest.fn().mockRejectedValue(error);
      const mockNext = jest.fn();
      const wrappedFn = ResponseHelper.asyncHandler(mockFn);

      await wrappedFn('req', 'res', mockNext);

      expect(mockFn).toHaveBeenCalledWith('req', 'res', mockNext);
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
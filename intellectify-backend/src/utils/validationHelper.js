const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const emailRegex =
    /^[a-zA-Z0-9]([a-zA-Z0-9._+-]*[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}$/;
  const trimmedEmail = email.trim().toLowerCase();

  if (
    trimmedEmail.includes('..') ||
    trimmedEmail.startsWith('.') ||
    trimmedEmail.endsWith('.') ||
    trimmedEmail.includes('@.') ||
    trimmedEmail.includes('.@')
  ) {
    return false;
  }

  return emailRegex.test(trimmedEmail);
};

const validateStringLength = (str, min = 1, max = Infinity) => {
  if (typeof str !== 'string') {
    return {
      isValid: false,
      error: 'Value must be a string',
    };
  }

  const trimmedLength = str.trim().length;
  if (trimmedLength < min) {
    return {
      isValid: false,
      error: `String must be at least ${min} characters long`,
    };
  }

  if (trimmedLength > max) {
    return {
      isValid: false,
      error: `String must be no more than ${max} characters long`,
    };
  }

  return { isValid: true };
};

const validateNumberRange = (num, min = -Infinity, max = Infinity) => {
  if (typeof num !== 'number' || isNaN(num)) {
    return {
      isValid: false,
      error: 'Value must be a valid number',
    };
  }

  if (num < min) {
    return {
      isValid: false,
      error: `Number must be at least ${min}`,
    };
  }

  if (num > max) {
    return {
      isValid: false,
      error: `Number must be no more than ${max}`,
    };
  }

  return { isValid: true };
};

const isValidSlug = (slug) => {
  if (!slug || typeof slug !== 'string') {
    return false;
  }

  // Slug should contain only lowercase letters, numbers, and hyphens
  // Should not start or end with hyphen
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(slug.trim());
};

const validateContentTitle = (title) => {
  const lengthValidation = validateStringLength(title, 1, 200);
  if (!lengthValidation.isValid) {
    return lengthValidation;
  }
  // Basic HTML tag check (DOMPurify handles full sanitization)
  if (/<[^>]*>/g.test(title)) {
    return {
      isValid: false,
      error: 'Title contains invalid characters',
    };
  }
  return { isValid: true };
};

const validateContentBody = (content, maxLength = 10000) => {
  if (!content || typeof content !== 'string') {
    return {
      isValid: false,
      error: 'Content body is required',
    };
  }

  const lengthValidation = validateStringLength(content, 1, maxLength);
  if (!lengthValidation.isValid) {
    return lengthValidation;
  }

  return { isValid: true };
};

const isValidImageType = (mimetype) => {
  const validTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
  ];

  return validTypes.includes(mimetype);
};

const validateFileSize = (size, maxSize = 5 * 1024 * 1024) => {
  if (typeof size !== 'number' || size < 0) {
    return {
      isValid: false,
      error: 'Invalid file size',
    };
  }

  if (size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    return {
      isValid: false,
      error: `File size must be less than ${maxSizeMB}MB`,
    };
  }

  return { isValid: true };
};

module.exports = {
  isValidEmail,
  validateStringLength,
  validateNumberRange,
  isValidSlug,
  validateContentTitle,
  validateContentBody,
  isValidImageType,
  validateFileSize,
};

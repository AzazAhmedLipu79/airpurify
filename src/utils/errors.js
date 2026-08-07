class AppError extends Error {
  constructor(message, statusCode = 500, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class BadRequestError extends AppError {
  constructor(message = 'Bad Request', errors = []) {
    super(message, 400, errors);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access', errors = []) {
    super(message, 401, errors);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden resource', errors = []) {
    super(message, 403, errors);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found', errors = []) {
    super(message, 404, errors);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict', errors = []) {
    super(message, 409, errors);
  }
}

class ValidationError extends AppError {
  constructor(message = 'Validation failed', errors = []) {
    super(message, 422, errors);
  }
}

module.exports = {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
};

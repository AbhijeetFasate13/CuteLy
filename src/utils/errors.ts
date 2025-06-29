/**
 * Base application error class
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error for invalid input data
 */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

/**
 * Authentication error for invalid credentials
 */
export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication failed") {
    super(message, 401);
  }
}

/**
 * Authorization error for insufficient permissions
 */
export class AuthorizationError extends AppError {
  constructor(message: string = "Access denied") {
    super(message, 403);
  }
}

/**
 * Not found error for missing resources
 */
export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(message, 404);
  }
}

/**
 * Conflict error for duplicate resources
 */
export class ConflictError extends AppError {
  constructor(message: string = "Resource already exists") {
    super(message, 409);
  }
}

/**
 * Rate limit error for too many requests
 */
export class RateLimitError extends AppError {
  constructor(message: string = "Too many requests") {
    super(message, 429);
  }
}

/**
 * Database error for database-related issues
 */
export class DatabaseError extends AppError {
  constructor(message: string = "Database operation failed") {
    super(message, 500);
  }
}

/**
 * Cache error for Redis-related issues
 */
export class CacheError extends AppError {
  constructor(message: string = "Cache operation failed") {
    super(message, 500);
  }
}

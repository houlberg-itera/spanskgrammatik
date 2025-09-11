// Comprehensive error handling system for sophisticated exercise generation

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific error types for different scenarios
export const ERROR_CODES = {
  // Authentication & Authorization
  AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  ADMIN_ACCESS_REQUIRED: 'ADMIN_ACCESS_REQUIRED',
  EXERCISE_GENERATION_DENIED: 'EXERCISE_GENERATION_DENIED',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  EXERCISE_GENERATION_LIMIT: 'EXERCISE_GENERATION_LIMIT',
  AI_SERVICE_LIMIT: 'AI_SERVICE_LIMIT',
  BULK_OPERATION_LIMIT: 'BULK_OPERATION_LIMIT',
  
  // Validation
  INVALID_REQUEST_DATA: 'INVALID_REQUEST_DATA',
  MISSING_REQUIRED_FIELDS: 'MISSING_REQUIRED_FIELDS',
  INVALID_PARAMETERS: 'INVALID_PARAMETERS',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  
  // Database
  DATABASE_CONNECTION_ERROR: 'DATABASE_CONNECTION_ERROR',
  DATABASE_QUERY_ERROR: 'DATABASE_QUERY_ERROR',
  RECORD_NOT_FOUND: 'RECORD_NOT_FOUND',
  DUPLICATE_RECORD: 'DUPLICATE_RECORD',
  
  // AI & External Services
  OPENAI_ERROR: 'OPENAI_ERROR',
  OPENAI_RATE_LIMIT: 'OPENAI_RATE_LIMIT',
  OPENAI_QUOTA_EXCEEDED: 'OPENAI_QUOTA_EXCEEDED',
  GPT5_REASONING_ERROR: 'GPT5_REASONING_ERROR',
  AI_GENERATION_FAILED: 'AI_GENERATION_FAILED',
  
  // System & Infrastructure
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR'
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

// Error response interface
export interface ErrorResponse {
  error: string;
  code: ErrorCode;
  details?: string;
  context?: Record<string, any>;
  timestamp: string;
  requestId?: string;
  suggestions?: string[];
  retryable?: boolean;
  retryAfter?: number;
}

/**
 * Create standardized permission error
 */
export function createPermissionError(
  code: ErrorCode,
  context?: Record<string, any>
): ErrorResponse {
  const errorMessages = {
    PERMISSION_DENIED: 'You do not have permission to perform this action',
    ADMIN_ACCESS_REQUIRED: 'Administrator access is required for this operation',
    EXERCISE_GENERATION_DENIED: 'You do not have permission to generate exercises',
    AUTHENTICATION_REQUIRED: 'Authentication is required to access this resource'
  };

  const suggestions = {
    PERMISSION_DENIED: ['Contact your administrator for access', 'Verify your account permissions'],
    ADMIN_ACCESS_REQUIRED: ['Contact an administrator', 'Check if your account has admin privileges'],
    EXERCISE_GENERATION_DENIED: ['Contact your teacher or administrator', 'Verify your account type'],
    AUTHENTICATION_REQUIRED: ['Please log in to continue', 'Check if your session has expired']
  };

  return {
    error: errorMessages[code] || 'Permission denied',
    code,
    context,
    timestamp: new Date().toISOString(),
    suggestions: suggestions[code] || ['Contact support for assistance'],
    retryable: false
  };
}

/**
 * Create standardized rate limit error
 */
export function createRateLimitError(
  code: ErrorCode,
  context?: Record<string, any> & { limit?: number; remaining?: number; resetTime?: number }
): ErrorResponse {
  const errorMessages = {
    RATE_LIMIT_EXCEEDED: 'Rate limit exceeded. Please try again later.',
    EXERCISE_GENERATION_LIMIT: 'Exercise generation limit reached. Please wait before generating more exercises.',
    AI_SERVICE_LIMIT: 'AI service is temporarily at capacity. Please try again in a few minutes.',
    BULK_OPERATION_LIMIT: 'Bulk operation limit reached. Please wait before performing more bulk operations.'
  };

  const suggestions = {
    RATE_LIMIT_EXCEEDED: ['Wait for the rate limit to reset', 'Reduce the frequency of requests'],
    EXERCISE_GENERATION_LIMIT: ['Wait before generating more exercises', 'Consider generating fewer exercises at once'],
    AI_SERVICE_LIMIT: ['Try again in 2-5 minutes', 'Consider reducing the complexity of your request'],
    BULK_OPERATION_LIMIT: ['Wait before performing more operations', 'Consider breaking down large operations']
  };

  const retryAfter = context?.resetTime ? Math.ceil((context.resetTime - Date.now()) / 1000) : 60;

  return {
    error: errorMessages[code] || 'Rate limit exceeded',
    code,
    context,
    timestamp: new Date().toISOString(),
    suggestions: suggestions[code] || ['Wait and try again later'],
    retryable: true,
    retryAfter
  };
}

/**
 * Create standardized validation error
 */
export function createValidationError(
  code: ErrorCode,
  context?: Record<string, any> & { errors?: string[] }
): ErrorResponse {
  const errorMessages = {
    INVALID_REQUEST_DATA: 'The request data is invalid or incomplete',
    MISSING_REQUIRED_FIELDS: 'Required fields are missing from the request',
    INVALID_PARAMETERS: 'One or more parameters are invalid',
    VALIDATION_FAILED: 'Data validation failed'
  };

  const suggestions = {
    INVALID_REQUEST_DATA: ['Check the request format', 'Verify all required fields are provided'],
    MISSING_REQUIRED_FIELDS: ['Provide all required fields', 'Check the API documentation'],
    INVALID_PARAMETERS: ['Verify parameter values', 'Check parameter types and ranges'],
    VALIDATION_FAILED: ['Review the validation errors', 'Correct the invalid data']
  };

  return {
    error: errorMessages[code] || 'Validation error',
    code,
    context,
    timestamp: new Date().toISOString(),
    suggestions: suggestions[code] || ['Check your input and try again'],
    retryable: false
  };
}

/**
 * Create standardized database error
 */
export function createDatabaseError(
  code: ErrorCode,
  context?: Record<string, any>
): ErrorResponse {
  const errorMessages = {
    DATABASE_CONNECTION_ERROR: 'Database connection failed',
    DATABASE_QUERY_ERROR: 'Database query failed',
    RECORD_NOT_FOUND: 'The requested record was not found',
    DUPLICATE_RECORD: 'A record with this information already exists'
  };

  const suggestions = {
    DATABASE_CONNECTION_ERROR: ['Try again in a moment', 'Contact support if the issue persists'],
    DATABASE_QUERY_ERROR: ['Verify your request parameters', 'Contact support if the issue continues'],
    RECORD_NOT_FOUND: ['Check the record ID or parameters', 'Verify the record exists'],
    DUPLICATE_RECORD: ['Use different values', 'Update the existing record instead']
  };

  return {
    error: errorMessages[code] || 'Database error',
    code,
    context,
    timestamp: new Date().toISOString(),
    suggestions: suggestions[code] || ['Contact support for assistance'],
    retryable: code === 'DATABASE_CONNECTION_ERROR'
  };
}

/**
 * Create standardized AI service error
 */
export function createAIServiceError(
  code: ErrorCode,
  context?: Record<string, any>
): ErrorResponse {
  const errorMessages = {
    OPENAI_ERROR: 'AI service encountered an error',
    OPENAI_RATE_LIMIT: 'AI service rate limit exceeded',
    OPENAI_QUOTA_EXCEEDED: 'AI service quota has been exceeded',
    GPT5_REASONING_ERROR: 'GPT-5 reasoning tokens were used but no content was generated',
    AI_GENERATION_FAILED: 'AI failed to generate the requested content'
  };

  const suggestions = {
    OPENAI_ERROR: ['Try again in a moment', 'Simplify your request'],
    OPENAI_RATE_LIMIT: ['Wait 1-2 minutes before trying again', 'Reduce the frequency of requests'],
    OPENAI_QUOTA_EXCEEDED: ['Try again tomorrow', 'Contact support about quota limits'],
    GPT5_REASONING_ERROR: ['Try again with a simpler request', 'Reduce the number of questions requested'],
    AI_GENERATION_FAILED: ['Try again with different parameters', 'Simplify the generation request']
  };

  const retryAfter = code === 'OPENAI_RATE_LIMIT' ? 120 : code === 'GPT5_REASONING_ERROR' ? 300 : 60;

  return {
    error: errorMessages[code] || 'AI service error',
    code,
    context,
    timestamp: new Date().toISOString(),
    suggestions: suggestions[code] || ['Try again later'],
    retryable: true,
    retryAfter
  };
}

/**
 * Create standardized system error
 */
export function createSystemError(
  code: ErrorCode,
  context?: Record<string, any>
): ErrorResponse {
  const errorMessages = {
    SYSTEM_ERROR: 'An unexpected system error occurred',
    SERVICE_UNAVAILABLE: 'The service is temporarily unavailable',
    TIMEOUT_ERROR: 'The request timed out',
    CONFIGURATION_ERROR: 'System configuration error'
  };

  const suggestions = {
    SYSTEM_ERROR: ['Try again in a moment', 'Contact support if the issue persists'],
    SERVICE_UNAVAILABLE: ['Try again in a few minutes', 'Check the service status'],
    TIMEOUT_ERROR: ['Try again with a smaller request', 'Check your connection'],
    CONFIGURATION_ERROR: ['Contact system administrator', 'Report this error to support']
  };

  return {
    error: errorMessages[code] || 'System error',
    code,
    context,
    timestamp: new Date().toISOString(),
    suggestions: suggestions[code] || ['Contact support for assistance'],
    retryable: code !== 'CONFIGURATION_ERROR'
  };
}

/**
 * Log error with context for debugging
 */
export function logError(error: Error | AppError, context?: Record<string, any>): void {
  const errorInfo = {
    name: error.name,
    message: error.message,
    stack: error.stack,
    ...(error instanceof AppError && {
      code: error.code,
      statusCode: error.statusCode,
      isOperational: error.isOperational,
      errorContext: error.context
    }),
    context,
    timestamp: new Date().toISOString()
  };

  console.error('🚨 Error logged:', JSON.stringify(errorInfo, null, 2));
}

/**
 * Handle and format error for API response
 */
export function handleAPIError(error: unknown, requestId?: string): ErrorResponse {
  if (error instanceof AppError) {
    return {
      error: error.message,
      code: error.code as ErrorCode,
      context: error.context,
      timestamp: new Date().toISOString(),
      requestId,
      retryable: error.isOperational
    };
  }

  if (error instanceof Error) {
    logError(error);
    return createSystemError('SYSTEM_ERROR', {
      originalMessage: error.message,
      requestId
    });
  }

  return createSystemError('SYSTEM_ERROR', {
    originalError: String(error),
    requestId
  });
}
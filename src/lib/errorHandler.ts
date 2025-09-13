/**
 * Centralized error handling service
 */

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly userMessage: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, userMessage?: string) {
    super(message, 'DATABASE_ERROR', userMessage || 'Došlo k chybě při práci s databází');
    this.name = 'DatabaseError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, userMessage?: string) {
    super(message, 'VALIDATION_ERROR', userMessage || 'Neplatná data');
    this.name = 'ValidationError';
  }
}

export class FileError extends AppError {
  constructor(message: string, userMessage?: string) {
    super(message, 'FILE_ERROR', userMessage || 'Chyba při práci se souborem');
    this.name = 'FileError';
  }
}

/**
 * Error handler that logs errors and provides user-friendly messages
 */
export function handleError(error: unknown): string {
  console.error('Application error:', error);

  if (error instanceof AppError) {
    return error.userMessage;
  }

  if (error instanceof Error) {
    // Log technical error for debugging
    console.error('Stack trace:', error.stack);
    return 'Došlo k neočekávané chybě. Zkuste to prosím znovu.';
  }

  return 'Neznámá chyba. Kontaktujte podporu.';
}

/**
 * Wraps async functions with error handling
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  errorMessage?: string
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (errorMessage) {
      throw new AppError(
        error instanceof Error ? error.message : String(error),
        'OPERATION_ERROR',
        errorMessage
      );
    }
    throw error;
  }
}

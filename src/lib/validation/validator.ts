/**
 * Validation helper functions
 */

import { z } from 'zod';
import { ValidationError } from '../errorHandler';
import { showError, showWarning } from '../toast.svelte';

/**
 * Validate data against a Zod schema
 * Shows error toast on validation failure
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown, showToast: boolean = true): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0];
      const message = firstError.message;

      if (showToast) {
        showError(message);
      }

      throw new ValidationError(`Validation failed: ${message}`, message);
    }
    throw error;
  }
}

/**
 * Safe validation that returns result object instead of throwing
 */
export function validateSafe<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  } else {
    const firstError = result.error.issues[0];
    return {
      success: false,
      error: firstError.message,
    };
  }
}

/**
 * Validate and show all errors
 */
export function validateAll<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  showToast: boolean = true
): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.issues.map((e) => e.message);
      const message = errors.join(', ');

      if (showToast) {
        showError(`Chyby validace: ${message}`);
      }

      throw new ValidationError(`Validation failed: ${message}`, `Chyby validace: ${message}`);
    }
    throw error;
  }
}

/**
 * Validate with warnings (doesn't throw on certain errors)
 */
export function validateWithWarnings<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  warningPaths: string[] = []
): T {
  const result = schema.safeParse(data);

  if (result.success) {
    return result.data;
  }

  // Separate errors and warnings
  const errors: z.ZodIssue[] = [];
  const warnings: z.ZodIssue[] = [];

  for (const issue of result.error.issues) {
    const path = issue.path.join('.');
    if (warningPaths.includes(path)) {
      warnings.push(issue);
    } else {
      errors.push(issue);
    }
  }

  // Show warnings as toast
  for (const warning of warnings) {
    showWarning(warning.message);
  }

  // If there are actual errors, throw
  if (errors.length > 0) {
    const message = errors[0].message;
    showError(message);
    throw new ValidationError(`Validation failed: ${message}`, message);
  }

  // Return data even if there were warnings
  return data as T;
}

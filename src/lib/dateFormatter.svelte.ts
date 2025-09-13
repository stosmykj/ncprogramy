/**
 * Date formatting utilities for displaying dates in local format using date-fns
 *
 * Note: HTML5 date/datetime inputs require ISO format (YYYY-MM-DD and YYYY-MM-DDTHH:mm)
 * These functions are for DISPLAY purposes in table cells and other UI elements
 */

import { format, parse, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';

/**
 * Formats a date for display in Czech format (e.g., "20. 10. 2025")
 */
export function formatDate(date: Date): string {
  return format(date, 'dd. MM. yyyy', { locale: cs });
}

/**
 * Formats a datetime for display in Czech format (e.g., "20. 10. 2025 14:30")
 */
export function formatDateTime(date: Date): string {
  return format(date, 'dd. MM. yyyy HH:mm', { locale: cs });
}

/**
 * Formats a datetime with seconds in Czech format (e.g., "20. 10. 2025 14:30:45")
 */
export function formatDateTimeWithSeconds(date: Date): string {
  return format(date, 'dd. MM. yyyy HH:mm:ss', { locale: cs });
}

/**
 * Converts a Date object to ISO format for HTML input elements
 * @param date The date to convert
 * @param type The input type ('date' for YYYY-MM-DD, 'datetime' for YYYY-MM-DDTHH:mm)
 */
export function toInputFormat(date: Date, type: 'date' | 'datetime'): string {
  if (type === 'date') {
    return format(date, 'yyyy-MM-dd');
  } else {
    return format(date, "yyyy-MM-dd'T'HH:mm");
  }
}

/**
 * Parses an ISO format string from HTML input and returns a Date object
 */
export function fromInputFormat(value: string): Date {
  return parseISO(value);
}

/**
 * Parses a date string in Czech format and returns a Date object
 * @param dateStr String in format "d. M. yyyy" (e.g., "20. 10. 2025")
 */
export function parseDate(dateStr: string): Date {
  return parse(dateStr, 'dd. MM. yyyy', new Date(), { locale: cs });
}

/**
 * Parses a datetime string in Czech format and returns a Date object
 * @param dateTimeStr String in format "d. M. yyyy HH:mm" (e.g., "20. 10. 2025 14:30")
 */
export function parseDateTime(dateTimeStr: string): Date {
  return parse(dateTimeStr, 'dd. MM. yyyy HH:mm', new Date(), { locale: cs });
}

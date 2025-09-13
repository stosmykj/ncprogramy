/**
 * Program-specific validation helpers
 */

import { Program } from '../../models/program';
import { validateWithWarnings } from './validator';
import { programWithCrossValidation } from './programSchema';

/**
 * Convert Program instance to plain object for validation
 */
export function programToValidationObject(program: Program): Record<string, unknown> {
  return {
    id: program.Id,
    createdAt: program.CreatedAt,
    updatedAt: program.UpdatedAt,
    programId: program.ProgramId,
    name: program.Name,
    orderNumber: program.OrderNumber,
    deadlineAt: program.DeadlineAt,
    arrivedAt: program.ArrivedAt,
    doneAt: program.DoneAt,
    count: program.Count,
    design: program.Design,
    drawing: program.Drawing,
    clamping: program.Clamping,
    preparing: program.Preparing,
    programing: program.Programing,
    machineWorking: program.MachineWorking,
    extraTime: program.ExtraTime,
    note: program.Note,
  };
}

/**
 * Validate a Program instance before saving
 * Uses cross-field validation and shows warnings for late completion
 */
export function validateProgram(program: Program): void {
  const data = programToValidationObject(program);

  // Validate with warnings for late completion (path: 'doneAt')
  // This will show a warning toast but won't throw
  validateWithWarnings(
    programWithCrossValidation,
    data,
    ['doneAt'] // Late completion is a warning, not an error
  );
}

/**
 * Validate program ID format
 */
export function validateProgramId(programId: string): boolean {
  return /^\d{2}\d{3}$/.test(programId);
}

/**
 * Validate that a number field is within acceptable range
 */
export function validateNumberField(
  value: number | undefined,
  min: number = 0,
  max: number = 99999
): boolean {
  if (value === undefined) return true;
  return value >= min && value <= max && Number.isInteger(value);
}

/**
 * Validate that a string field is within length limits
 */
export function validateStringField(value: string | undefined, maxLength: number): boolean {
  if (value === undefined) return true;
  return value.length <= maxLength;
}

/**
 * Validate date range (start must be before end)
 */
export function validateDateRange(start: Date | undefined, end: Date | undefined): boolean {
  if (!start || !end) return true;
  return start <= end;
}

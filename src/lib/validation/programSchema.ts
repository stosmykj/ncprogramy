/**
 * Zod validation schemas for Program model
 */

import { z } from 'zod';

/**
 * Program validation schema
 * Defines validation rules for all program fields
 */
export const programSchema = z.object({
  id: z.number().int().positive().optional(),

  createdAt: z.date().optional(),

  updatedAt: z.date().optional(),

  // Program ID is required and must follow pattern: YYNNN (e.g., "25001")
  programId: z.string().nullable().optional(),

  // Name is optional but if provided must not be empty
  name: z
    .string()
    .min(1, 'Název nesmí být prázdný')
    .max(200, 'Název je příliš dlouhý (max 200 znaků)')
    .nullable()
    .optional()
    .or(z.literal(''))
    .transform((val) => (val === '' || val === null ? undefined : val)),

  // Order number is optional
  orderNumber: z
    .string()
    .max(100, 'Číslo zakázky je příliš dlouhé (max 100 znaků)')
    .nullable()
    .optional()
    .or(z.literal(''))
    .transform((val) => (val === '' || val === null ? undefined : val)),

  // Deadline must be a valid date
  deadlineAt: z
    .date()
    .optional()
    .refine((date) => !date || date >= new Date('2000-01-01'), 'Termín musí být po roce 2000'),

  // Arrival date must be valid
  arrivedAt: z
    .date()
    .optional()
    .refine(
      (date) => !date || date >= new Date('2000-01-01'),
      'Datum Dorazilo musí být po roce 2000'
    ),

  // Completion date must be valid and after arrival
  doneAt: z
    .date()
    .optional()
    .refine(
      (date) => !date || date >= new Date('2000-01-01'),
      'Datum dokončení musí být po roce 2000'
    ),

  // Count must be non-negative integer
  count: z
    .number()
    .int('Počet kusů musí být celé číslo')
    .nonnegative('Počet kusů nemůže být záporný')
    .max(999999, 'Počet kusů je příliš velký')
    .nullable()
    .optional(),

  // Design file path
  design: z.any().optional(), // File type - validated separately

  // Drawing file path
  drawing: z.any().optional(), // File type - validated separately

  // Clamping file path
  clamping: z.any().optional(), // File type - validated separately

  // Preparing time in minutes
  preparing: z
    .number()
    .int('Čas přípravy musí být celé číslo')
    .nonnegative('Čas přípravy nemůže být záporný')
    .max(99999, 'Čas přípravy je příliš velký')
    .nullable()
    .optional(),

  // Programming time in minutes
  programing: z
    .number()
    .int('Čas programování musí být celé číslo')
    .nonnegative('Čas programování nemůže být záporný')
    .max(99999, 'Čas programování je příliš velký')
    .nullable()
    .optional(),

  // Machine working time in minutes per piece
  machineWorking: z
    .number()
    .int('Čas obrábění musí být celé číslo')
    .nonnegative('Čas obrábění nemůže být záporný')
    .max(99999, 'Čas obrábění je příliš velký')
    .nullable()
    .optional(),

  // Extra time description
  extraTime: z
    .string()
    .max(500, 'Další čas je příliš dlouhý (max 500 znaků)')
    .nullable()
    .optional()
    .or(z.literal(''))
    .transform((val) => (val === '' || val === null ? undefined : val)),

  // Note field
  note: z
    .string()
    .max(2000, 'Poznámka je příliš dlouhá (max 2000 znaků)')
    .nullable()
    .optional()
    .or(z.literal(''))
    .transform((val) => (val === '' || val === null ? undefined : val)),
});

/**
 * Partial schema for updates (all fields optional)
 */
export const programUpdateSchema = programSchema.partial();

/**
 * Schema for creating new programs (without id, createdAt, updatedAt)
 */
export const programCreateSchema = programSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

/**
 * Cross-field validation
 */
export const programWithCrossValidation = programSchema
  .refine(
    (data) => {
      // If both arrivedAt and doneAt exist, doneAt must be after arrivedAt
      if (data.arrivedAt && data.doneAt) {
        return data.doneAt >= data.arrivedAt;
      }
      return true;
    },
    {
      message: 'Datum dokončení musí být po datu Dorazilo',
      path: ['doneAt'],
    }
  )
  .refine(
    (data) => {
      // If both deadlineAt and doneAt exist, warn if done after deadline
      if (data.deadlineAt && data.doneAt) {
        return data.doneAt <= data.deadlineAt;
      }
      return true;
    },
    {
      message: 'Pozor: Program byl dokončen po termínu',
      path: ['doneAt'],
    }
  );

/**
 * Type inference from schema
 */
export type ProgramInput = z.infer<typeof programSchema>;
export type ProgramCreateInput = z.infer<typeof programCreateSchema>;
export type ProgramUpdateInput = z.infer<typeof programUpdateSchema>;

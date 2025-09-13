import { describe, it, expect } from 'vitest';
import {
  AppError,
  DatabaseError,
  ValidationError,
  FileError,
  handleError,
} from '$lib/errorHandler';

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create error with user message', () => {
      const error = new AppError('Technical message', 'ERROR_CODE', 'User message');
      expect(error.message).toBe('Technical message');
      expect(error.code).toBe('ERROR_CODE');
      expect(error.userMessage).toBe('User message');
    });

    it('should create error with custom user message', () => {
      const error = new AppError('Technical message', 'ERROR_CODE', 'Custom message');
      expect(error.userMessage).toBe('Custom message');
    });

    it('should be instance of Error', () => {
      const error = new AppError('Test', 'CODE', 'User facing message');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
    });
  });

  describe('DatabaseError', () => {
    it('should create database error with default message', () => {
      const error = new DatabaseError('Connection failed');
      expect(error.message).toBe('Connection failed');
      expect(error.code).toBe('DATABASE_ERROR');
      expect(error.userMessage).toBe('Došlo k chybě při práci s databází');
    });

    it('should create database error with custom user message', () => {
      const error = new DatabaseError('Query failed', 'Nepodařilo se načíst data');
      expect(error.userMessage).toBe('Nepodařilo se načíst data');
    });
  });

  describe('ValidationError', () => {
    it('should create validation error with default message', () => {
      const error = new ValidationError('Invalid input');
      expect(error.message).toBe('Invalid input');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.userMessage).toBe('Neplatná data');
    });

    it('should create validation error with custom user message', () => {
      const error = new ValidationError('Invalid email', 'Email není platný');
      expect(error.userMessage).toBe('Email není platný');
    });
  });

  describe('FileError', () => {
    it('should create file error with default message', () => {
      const error = new FileError('File not found');
      expect(error.message).toBe('File not found');
      expect(error.code).toBe('FILE_ERROR');
      expect(error.userMessage).toBe('Chyba při práci se souborem');
    });

    it('should create file error with custom user message', () => {
      const error = new FileError('Access denied', 'Soubor nelze otevřít');
      expect(error.userMessage).toBe('Soubor nelze otevřít');
    });
  });
});

describe('handleError', () => {
  it('should return user message from AppError', () => {
    const error = new DatabaseError('DB connection failed', 'Databáze není dostupná');
    const message = handleError(error);
    expect(message).toBe('Databáze není dostupná');
  });

  it('should return default message for unknown errors', () => {
    const error = new Error('Unknown error');
    const message = handleError(error);
    expect(message).toBe('Došlo k neočekávané chybě. Zkuste to prosím znovu.');
  });

  it('should handle string errors', () => {
    const message = handleError('Something went wrong');
    expect(message).toBe('Neznámá chyba. Kontaktujte podporu.');
  });

  it('should handle null/undefined errors', () => {
    expect(handleError(null)).toBe('Neznámá chyba. Kontaktujte podporu.');
    expect(handleError(undefined)).toBe('Neznámá chyba. Kontaktujte podporu.');
  });

  it('should handle object errors without message', () => {
    const error = { code: 500 };
    const message = handleError(error);
    expect(message).toBe('Neznámá chyba. Kontaktujte podporu.');
  });
});

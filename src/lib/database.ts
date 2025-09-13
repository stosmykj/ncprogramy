/**
 * Database singleton service
 * Provides a single database connection instance across the application
 */

import Database from '@tauri-apps/plugin-sql';
import { DatabaseError } from './errorHandler';

let dbInstance: Database | null = null;
let initPromise: Promise<Database> | null = null;

/**
 * Get or create database instance (singleton pattern)
 */
export async function getDatabase(): Promise<Database> {
  // If already initialized, return it
  if (dbInstance) {
    return dbInstance;
  }

  // If initialization is in progress, wait for it
  if (initPromise) {
    return initPromise;
  }

  // Start initialization
  initPromise = Database.load('sqlite:data.db')
    .then((db) => {
      dbInstance = db;
      initPromise = null;
      console.warn('Database connection established');
      return db;
    })
    .catch((error) => {
      initPromise = null;
      console.error('Failed to initialize database:', error);
      throw new DatabaseError(
        'Failed to establish database connection',
        'Nepodařilo se připojit k databázi'
      );
    });

  return initPromise;
}

/**
 * Close database connection (for cleanup)
 */
export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    try {
      await dbInstance.close();
      dbInstance = null;
      console.warn('Database connection closed');
    } catch (error) {
      console.error('Error closing database:', error);
    }
  }
}

/**
 * Reset database connection (useful for testing or reconnection)
 */
export async function resetDatabase(): Promise<void> {
  await closeDatabase();
  dbInstance = null;
  initPromise = null;
}

/**
 * Check if database is connected
 */
export function isDatabaseConnected(): boolean {
  return dbInstance !== null;
}

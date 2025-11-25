import { File } from './file';

export type ProgramData = Record<string, unknown>;

export class Program {
  private _id?: number;
  private _createdAt?: Date;
  private _updatedAt?: Date;
  private _data: ProgramData = {};

  constructor(dbRow?: ProgramData) {
    if (dbRow) {
      this._id = dbRow.id as number | undefined;
      this._createdAt = dbRow.createdAt ? new Date(dbRow.createdAt as string) : new Date();
      this._updatedAt = dbRow.updatedAt ? new Date(dbRow.updatedAt as string) : new Date();

      // Store all other fields in data
      for (const [key, value] of Object.entries(dbRow)) {
        if (['id', 'createdAt', 'updatedAt'].includes(key)) continue;
        this._data[key] = this.parseValue(key, value);
      }
    }
  }

  private parseValue(key: string, value: unknown): unknown {
    if (value === null || value === undefined) return undefined;

    // Try to parse as JSON (for file columns)
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (parsed && typeof parsed === 'object' && 'path' in parsed && 'extension' in parsed) {
          return new File(parsed);
        }
      } catch {
        // Not JSON, continue
      }
    }

    return value;
  }

  // Fixed properties
  get Id(): number | undefined {
    return this._id;
  }

  set Id(value: number | undefined) {
    this._id = value;
  }

  get CreatedAt(): Date | undefined {
    return this._createdAt;
  }

  set CreatedAt(value: Date | undefined) {
    this._createdAt = value;
  }

  get UpdatedAt(): Date | undefined {
    return this._updatedAt;
  }

  set UpdatedAt(value: Date | undefined) {
    this._updatedAt = value;
  }

  // Dynamic property access
  get(key: string): unknown {
    if (key === 'id') return this._id;
    if (key === 'createdAt') return this._createdAt;
    if (key === 'updatedAt') return this._updatedAt;
    return this._data[key];
  }

  set(key: string, value: unknown): void {
    if (key === 'id') {
      this._id = value as number | undefined;
    } else if (key === 'createdAt') {
      this._createdAt = value as Date | undefined;
    } else if (key === 'updatedAt') {
      this._updatedAt = value as Date | undefined;
    } else {
      this._data[key] = value;
    }
  }

  // Get all dynamic data (excluding id, createdAt, updatedAt)
  getData(): ProgramData {
    return { ...this._data };
  }

  // Set multiple values at once
  setData(data: ProgramData): void {
    for (const [key, value] of Object.entries(data)) {
      this.set(key, value);
    }
  }

  // Get all keys including fixed ones
  getKeys(): string[] {
    return ['id', 'createdAt', 'updatedAt', ...Object.keys(this._data)];
  }

  // Convert to plain Record for formatting rules evaluation
  toRecord(): Record<string, unknown> {
    return {
      id: this._id,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      ...this._data,
    };
  }

  // Serialize value for database storage
  serializeValue(value: unknown): string | number | null {
    if (value === undefined || value === null) return null;
    if (value instanceof Date) return value.toISOString();
    if (value instanceof File) return value.toString();
    if (typeof value === 'object') return JSON.stringify(value);
    if (typeof value === 'number') return value;
    return String(value);
  }

  // Get serialized values for a list of column keys (for SQL params)
  toValues(columnKeys: string[]): Array<string | number | null> {
    return columnKeys.map((key) => this.serializeValue(this.get(key)));
  }

  // Delete SQL remains the same
  toSqlDelete(): string {
    return 'DELETE FROM programs WHERE id=$1';
  }
}

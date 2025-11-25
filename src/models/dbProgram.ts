// Dynamic database row - can have any columns
export type DbProgram = Record<string, unknown> & {
  id?: number;
  createdAt?: string;
  updatedAt?: string;
};

export interface DbProgram {
  id?: number;
  createdAt?: string;
  updatedAt?: string;
  programId: string;
  name?: string;
  order_number?: string;
  deadlineAt?: string;
  arrivedAt?: string;
  doneAt?: string;
  count?: number;
  design?: string;
  drawing?: string;
  clamping?: string;
  preparing?: number;
  programing?: number;
  machineWorking?: number;
  extraTime?: string;
  note?: string;
  totalTime?: number;
}

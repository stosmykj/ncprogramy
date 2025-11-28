import type { Program } from '../models/program';

export const PROGRAM_DIALOG = $state({
  isOpen: false,
  mode: 'create' as 'create' | 'edit',
  program: null as Program | null,
  focusColumn: null as string | null, // Column key to focus when dialog opens
});

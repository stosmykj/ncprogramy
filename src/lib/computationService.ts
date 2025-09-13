import type { Program } from '../models/program';

function getTotalTime(program: Program): number {
  return (
    (program.Count ?? 0) * (program.MachineWorking ?? 0) +
    (program.Programing ?? 0) +
    (program.Preparing ?? 0)
  );
}

export default {
  getTotalTime,
};

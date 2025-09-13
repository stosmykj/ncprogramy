import type { ImportProgram } from '$lib/importProcessor.svelte';
import type { DbProgram } from './dbProgram';
import { File } from './file';

export class Program {
  private id?: number;
  private createdAt?: Date;
  private updatedAt?: Date;
  private programId: string;
  private name?: string;
  private orderNumber?: string;
  private deadlineAt?: Date;
  private arrivedAt?: Date;
  private doneAt?: Date;
  private count?: number;
  private design?: File;
  private drawing?: File;
  private clamping?: File;
  private preparing?: number;
  private programing?: number;
  private machineWorking?: number;
  private extraTime?: string;
  private note?: string;

  constructor({
    id,
    createdAt,
    updatedAt,
    programId,
    name,
    order_number,
    deadlineAt,
    arrivedAt,
    doneAt,
    count,
    design,
    drawing,
    clamping,
    preparing,
    programing,
    machineWorking,
    extraTime,
    note,
  }: DbProgram) {
    this.id = id;
    this.createdAt = createdAt ? new Date(createdAt) : new Date();
    this.updatedAt = updatedAt ? new Date(updatedAt) : new Date();
    this.programId = programId;
    this.name = name;
    this.orderNumber = order_number;
    this.deadlineAt = deadlineAt ? new Date(deadlineAt) : undefined;
    this.arrivedAt = arrivedAt ? new Date(arrivedAt) : undefined;
    this.doneAt = doneAt ? new Date(doneAt) : undefined;
    this.count = count;
    this.design = design ? new File(JSON.parse(design)) : undefined;
    this.drawing = drawing ? new File(JSON.parse(drawing)) : undefined;
    this.clamping = clamping ? new File(JSON.parse(clamping)) : undefined;
    this.preparing = preparing;
    this.programing = programing;
    this.machineWorking = machineWorking;
    this.extraTime = extraTime;
    this.note = note;
  }

  get Id(): number | undefined {
    return this.id;
  }

  set Id(value: number | undefined) {
    this.id = value;
  }

  get CreatedAt(): Date | undefined {
    return this.createdAt;
  }

  set CreatedAt(value: Date | undefined) {
    this.createdAt = value;
  }

  get UpdatedAt(): Date | undefined {
    return this.updatedAt;
  }

  set UpdatedAt(value: Date | undefined) {
    this.updatedAt = value;
  }

  get ProgramId(): string {
    return this.programId;
  }

  set ProgramId(value: string) {
    this.programId = value;
  }

  get Name(): string | undefined {
    return this.name;
  }

  set Name(value: string | undefined) {
    this.name = value;
  }

  get OrderNumber(): string | undefined {
    return this.orderNumber;
  }

  set OrderNumber(value: string | undefined) {
    this.orderNumber = value;
  }

  get DeadlineAt(): Date | undefined {
    return this.deadlineAt;
  }

  set DeadlineAt(value: Date | undefined) {
    this.deadlineAt = value;
  }

  get ArrivedAt(): Date | undefined {
    return this.arrivedAt;
  }

  set ArrivedAt(value: Date | undefined) {
    this.arrivedAt = value;
  }

  get DoneAt(): Date | undefined {
    return this.doneAt;
  }

  set DoneAt(value: Date | undefined) {
    this.doneAt = value;
  }

  get Count(): number | undefined {
    return this.count;
  }

  set Count(value: number | undefined) {
    this.count = value;
  }

  get Design(): File | undefined {
    return this.design;
  }

  set Design(value: File | undefined) {
    this.design = value;
  }

  get Drawing(): File | undefined {
    return this.drawing;
  }

  set Drawing(value: File | undefined) {
    this.drawing = value;
  }

  get Clamping(): File | undefined {
    return this.clamping;
  }

  set Clamping(value: File | undefined) {
    this.clamping = value;
  }

  get Preparing(): number | undefined {
    return this.preparing;
  }

  set Preparing(value: number | undefined) {
    this.preparing = value;
  }

  get Programing(): number | undefined {
    return this.programing;
  }

  set Programing(value: number | undefined) {
    this.programing = value;
  }

  get MachineWorking(): number | undefined {
    return this.machineWorking;
  }

  set MachineWorking(value: number | undefined) {
    this.machineWorking = value;
  }

  get ExtraTime(): string | undefined {
    return this.extraTime;
  }

  set ExtraTime(value: string | undefined) {
    this.extraTime = value;
  }

  get Note(): string | undefined {
    return this.note;
  }

  set Note(value: string | undefined) {
    this.note = value;
  }

  toSqlInsert(): string {
    return `INSERT INTO programs (
      programId,
      name,
      orderNumber,
      deadlineAt,
      arrivedAt,
      doneAt,
      count,
      design,
      drawing,
      clamping,
      preparing,
      programing,
      machineWorking,
      extraTime,
      note
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
    )`;
  }

  toSqlUpdate(): string {
    return `UPDATE programs SET 
      updatedAt = CURRENT_TIMESTAMP,
      programId = $1,
      name = $2,
      orderNumber = $3,
      deadlineAt = $4,
      arrivedAt = $5,
      doneAt = $6,
      count = $7,
      design = $8,
      drawing = $9,
      clamping = $10,
      preparing = $11,
      programing = $12,
      machineWorking = $13,
      extraTime = $14,
      note = $15
    WHERE id=$16;`;
  }

  toSqlDelete(): string {
    return 'DELETE FROM programs WHERE id=$1';
  }

  toArray(): Array<any> {
    return [
      this.programId,
      this.name,
      this.orderNumber,
      this.deadlineAt?.toISOString(),
      this.arrivedAt?.toISOString(),
      this.doneAt?.toISOString(),
      this.count,
      this.design?.toString(),
      this.drawing?.toString(),
      this.clamping?.toString(),
      this.preparing,
      this.programing,
      this.machineWorking,
      this.extraTime,
      this.note,
      this.id,
    ];
  }

  toArrayImport(): Array<any> {
    return [
      this.createdAt?.toISOString(),
      this.updatedAt?.toISOString(),
      this.programId,
      this.name,
      this.orderNumber,
      this.deadlineAt?.toISOString(),
      this.arrivedAt?.toISOString(),
      this.doneAt?.toISOString(),
      this.count,
      this.design?.toString(),
      this.drawing?.toString(),
      this.clamping?.toString(),
      this.preparing,
      this.programing,
      this.machineWorking,
      this.extraTime,
      this.note,
    ];
  }

  public static fromImport(data: ImportProgram): Program {
    const program = new Program({
      programId: data.program,
    });
    program.CreatedAt = data.TimeCreated ?? new Date();
    program.UpdatedAt = data.TimeEdited ?? new Date();
    program.ExtraTime = data.dalsiCas ?? undefined;
    program.ArrivedAt = data.dorazilo ?? undefined;
    program.DoneAt = data.hotovo ?? undefined;
    program.Count = data.ks ?? undefined;
    program.Design = data.nakres ? File.fromImportFile(data.nakres) : undefined;
    program.Name = data.nazev ?? undefined;
    program.MachineWorking = data.obrab ?? undefined;
    program.Note = data.poznamka ?? undefined;
    program.Preparing = data.pripr ?? undefined;
    program.Programing = data.prog ?? undefined;
    program.DeadlineAt = data.termin ?? undefined;
    program.Clamping = data.upnuti ? File.fromImportFile(data.upnuti) : undefined;
    program.Drawing = data.vykresc ? File.fromImportFile(data.vykresc) : undefined;
    program.OrderNumber = data.zakazkac ?? undefined;
    return program;
  }
}

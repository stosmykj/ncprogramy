/**
 * G-code Validator
 * Performs semantic analysis and validation on parsed G-code
 */

import type { ProgramNode, BlockNode, CommandNode } from './parser';
import { getGCodeInfo, getMCodeInfo } from './commands';

export interface ValidationIssue {
  message: string;
  line: number;
  column: number;
  severity: 'error' | 'warning' | 'info';
  code: string; // Error code for quick identification
}

export interface MachineState {
  currentPosition: { X: number; Y: number; Z: number; A?: number; B?: number };
  feedRate: number | null;
  spindleSpeed: number | null;
  spindleOn: boolean;
  coolantOn: boolean;
  currentTool: number | null;
  coordinateSystem: 'G54' | 'G55' | 'G56' | 'G57' | 'G58' | 'G59';
  units: 'mm' | 'inch';
  absoluteMode: boolean;
  plane: 'XY' | 'XZ' | 'YZ';
  toolLengthComp: boolean;
  toolRadiusComp: 'none' | 'left' | 'right';
}

export class GCodeValidator {
  private issues: ValidationIssue[] = [];
  private machineState: MachineState;
  private maxFeedRate: number = 5000; // mm/min
  private maxSpindleSpeed: number = 24000; // RPM for FCM 28
  private workEnvelope = {
    X: { min: 0, max: 280 }, // FCM 28 dimensions
    Y: { min: 0, max: 280 },
    Z: { min: -200, max: 200 },
  };

  constructor() {
    this.machineState = this.getInitialState();
  }

  public validate(ast: ProgramNode): ValidationIssue[] {
    this.issues = [];
    this.machineState = this.getInitialState();

    // Validate program structure
    this.validateProgramStructure(ast);

    // Validate each block
    for (const block of ast.blocks) {
      this.validateBlock(block);
    }

    // Check for common issues
    this.checkCommonIssues(ast);

    return this.issues;
  }

  private getInitialState(): MachineState {
    return {
      currentPosition: { X: 0, Y: 0, Z: 0, A: 0, B: 0 },
      feedRate: null,
      spindleSpeed: null,
      spindleOn: false,
      coolantOn: false,
      currentTool: null,
      coordinateSystem: 'G54',
      units: 'mm',
      absoluteMode: true,
      plane: 'XY',
      toolLengthComp: false,
      toolRadiusComp: 'none',
    };
  }

  private validateProgramStructure(ast: ProgramNode): void {
    if (ast.blocks.length === 0) {
      this.addIssue('Program je prázdný', 1, 1, 'warning', 'EMPTY_PROGRAM');
      return;
    }

    // Check for program start
    const firstBlock = ast.blocks[0];
    let hasStart = false;
    for (const command of firstBlock.commands) {
      if (command.type === 'Command' && command.commandType === 'G') {
        if (['G90', 'G91', 'G21', 'G20'].includes(command.code)) {
          hasStart = true;
          break;
        }
      }
    }

    if (!hasStart) {
      this.addIssue(
        'Program by měl začínat definicí jednotek (G21/G20) a módu (G90/G91)',
        1,
        1,
        'info',
        'NO_INIT'
      );
    }

    // Check for proper program end
    const lastBlock = ast.blocks[ast.blocks.length - 1];
    let hasEnd = false;
    for (const command of lastBlock.commands) {
      if (command.type === 'Command' && command.commandType === 'M') {
        if (['M02', 'M30'].includes(command.code)) {
          hasEnd = true;
          break;
        }
      }
    }

    if (!hasEnd) {
      this.addIssue(
        'Program by měl končit M02 nebo M30',
        lastBlock.position.line,
        lastBlock.position.column,
        'warning',
        'NO_END'
      );
    }
  }

  private validateBlock(block: BlockNode): void {
    // Check for duplicate block numbers
    if (block.number !== undefined && block.number < 0) {
      this.addIssue(
        `Neplatné číslo bloku: ${block.number}`,
        block.position.line,
        block.position.column,
        'error',
        'INVALID_BLOCK_NUMBER'
      );
    }

    // Validate commands in block
    for (const command of block.commands) {
      if (command.type === 'Command') {
        this.validateCommand(command);
        this.updateMachineState(command);
      }
    }
  }

  private validateCommand(command: CommandNode): void {
    switch (command.commandType) {
      case 'G':
        this.validateGCode(command);
        break;
      case 'M':
        this.validateMCode(command);
        break;
      case 'T':
        this.validateToolChange(command);
        break;
      case 'S':
        this.validateSpindleSpeed(command);
        break;
      case 'F':
        this.validateFeedRate(command);
        break;
    }
  }

  private validateGCode(command: CommandNode): void {
    const gCodeInfo = getGCodeInfo(command.code);

    if (!gCodeInfo) {
      // Already handled by parser, but double-check
      return;
    }

    // Special validation for motion commands
    if (['G00', 'G01', 'G02', 'G03'].includes(command.code)) {
      this.validateMotionCommand(command);
    }

    // Validate circular interpolation
    if (command.code === 'G02' || command.code === 'G03') {
      this.validateCircularInterpolation(command);
    }

    // Validate drilling cycles
    if (['G81', 'G82', 'G83', 'G84'].includes(command.code)) {
      this.validateDrillingCycle(command);
    }
  }

  private validateMCode(command: CommandNode): void {
    const mCodeInfo = getMCodeInfo(command.code);

    if (!mCodeInfo) {
      return;
    }

    // Check for conflicting M-codes
    if (command.code === 'M03' || command.code === 'M04') {
      // Check if S parameter is on the same line or was set previously
      const hasSpeedOnLine = command.parameters.some((p) => p.name === 'S');
      if (!this.machineState.spindleSpeed && !hasSpeedOnLine) {
        this.addIssue(
          'Vřeteno spuštěno bez nastavené rychlosti (S)',
          command.position.line,
          command.position.column,
          'warning',
          'NO_SPINDLE_SPEED'
        );
      }
    }

    // Check tool change without spindle stop
    if (command.code === 'M06' && this.machineState.spindleOn) {
      this.addIssue(
        'Výměna nástroje při běžícím vřetenu - doporučuje se M05 před M06',
        command.position.line,
        command.position.column,
        'warning',
        'TOOL_CHANGE_WITH_SPINDLE'
      );
    }
  }

  private validateMotionCommand(command: CommandNode): void {
    // Check for feed rate in G01, G02, G03
    if (['G01', 'G02', 'G03'].includes(command.code)) {
      const hasFeedRate =
        command.parameters.some((p) => p.name === 'F') || this.machineState.feedRate !== null;
      if (!hasFeedRate) {
        this.addIssue(
          `Chybí rychlost posuvu (F) pro ${command.code}`,
          command.position.line,
          command.position.column,
          'error',
          'NO_FEED_RATE'
        );
      }
    }

    // Check position limits
    for (const param of command.parameters) {
      if (['X', 'Y', 'Z'].includes(param.name) && typeof param.value === 'number') {
        const axis = param.name as 'X' | 'Y' | 'Z';
        const value = this.machineState.absoluteMode
          ? param.value
          : this.machineState.currentPosition[axis] + param.value;

        if (value < this.workEnvelope[axis].min || value > this.workEnvelope[axis].max) {
          this.addIssue(
            `Pozice ${axis}${value} je mimo pracovní prostor (${this.workEnvelope[axis].min} - ${this.workEnvelope[axis].max})`,
            command.position.line,
            command.position.column,
            'warning',
            'OUT_OF_BOUNDS'
          );
        }
      }
    }

    // Check rapid feed in wrong context
    if (command.code === 'G00') {
      if (this.machineState.toolRadiusComp !== 'none') {
        this.addIssue(
          'Rychloposuv G00 při aktivní korekci rádiusu nástroje může způsobit neočekávané chování',
          command.position.line,
          command.position.column,
          'warning',
          'RAPID_WITH_COMP'
        );
      }
    }
  }

  private validateCircularInterpolation(command: CommandNode): void {
    const hasI = command.parameters.some((p) => p.name === 'I');
    const hasJ = command.parameters.some((p) => p.name === 'J');
    const hasR = command.parameters.some((p) => p.name === 'R');

    if (hasR && (hasI || hasJ)) {
      this.addIssue(
        'Nelze použít R společně s I/J pro kruhovou interpolaci',
        command.position.line,
        command.position.column,
        'error',
        'CONFLICTING_ARC_PARAMS'
      );
    }

    if (!hasR && !hasI && !hasJ) {
      this.addIssue(
        'Kruhová interpolace vyžaduje buď R nebo I/J parametry',
        command.position.line,
        command.position.column,
        'error',
        'MISSING_ARC_PARAMS'
      );
    }
  }

  private validateDrillingCycle(command: CommandNode): void {
    const hasZ = command.parameters.some((p) => p.name === 'Z');
    const hasR = command.parameters.some((p) => p.name === 'R');
    const hasF =
      command.parameters.some((p) => p.name === 'F') || this.machineState.feedRate !== null;

    if (!hasZ) {
      this.addIssue(
        `Vrtací cyklus ${command.code} vyžaduje parametr Z (hloubka)`,
        command.position.line,
        command.position.column,
        'error',
        'NO_DRILL_DEPTH'
      );
    }

    if (!hasR) {
      this.addIssue(
        `Vrtací cyklus ${command.code} vyžaduje parametr R (rovina návratu)`,
        command.position.line,
        command.position.column,
        'error',
        'NO_RETRACT_PLANE'
      );
    }

    if (!hasF) {
      this.addIssue(
        `Vrtací cyklus ${command.code} vyžaduje rychlost posuvu (F)`,
        command.position.line,
        command.position.column,
        'error',
        'NO_DRILL_FEED'
      );
    }

    // Check if spindle is on for drilling
    if (!this.machineState.spindleOn) {
      this.addIssue(
        'Vrtací cyklus bez běžícího vřetena',
        command.position.line,
        command.position.column,
        'warning',
        'DRILL_NO_SPINDLE'
      );
    }
  }

  private validateToolChange(command: CommandNode): void {
    const toolParam = command.parameters.find((p) => p.name === 'T');
    if (toolParam && typeof toolParam.value === 'string') {
      const toolNumber = parseInt(toolParam.value);
      if (isNaN(toolNumber) || toolNumber < 1 || toolNumber > 99) {
        this.addIssue(
          `Neplatné číslo nástroje: ${toolParam.value}`,
          command.position.line,
          command.position.column,
          'error',
          'INVALID_TOOL'
        );
      }
    }
  }

  private validateSpindleSpeed(command: CommandNode): void {
    const speedParam = command.parameters.find((p) => p.name === 'S');
    if (speedParam && typeof speedParam.value === 'number') {
      if (speedParam.value < 0) {
        this.addIssue(
          'Rychlost vřetena nemůže být záporná',
          command.position.line,
          command.position.column,
          'error',
          'NEGATIVE_SPINDLE_SPEED'
        );
      } else if (speedParam.value > this.maxSpindleSpeed) {
        this.addIssue(
          `Rychlost vřetena ${speedParam.value} překračuje maximum ${this.maxSpindleSpeed} RPM`,
          command.position.line,
          command.position.column,
          'warning',
          'EXCESSIVE_SPINDLE_SPEED'
        );
      }
    }
  }

  private validateFeedRate(command: CommandNode): void {
    const feedParam = command.parameters.find((p) => p.name === 'F');
    if (feedParam && typeof feedParam.value === 'number') {
      if (feedParam.value <= 0) {
        this.addIssue(
          'Rychlost posuvu musí být kladná',
          command.position.line,
          command.position.column,
          'error',
          'INVALID_FEED_RATE'
        );
      } else if (feedParam.value > this.maxFeedRate) {
        this.addIssue(
          `Rychlost posuvu ${feedParam.value} překračuje maximum ${this.maxFeedRate} mm/min`,
          command.position.line,
          command.position.column,
          'warning',
          'EXCESSIVE_FEED_RATE'
        );
      }
    }
  }

  private updateMachineState(command: CommandNode): void {
    // Update position
    if (['G00', 'G01', 'G02', 'G03'].includes(command.code)) {
      for (const param of command.parameters) {
        if (['X', 'Y', 'Z', 'A', 'B'].includes(param.name) && typeof param.value === 'number') {
          const axis = param.name as keyof typeof this.machineState.currentPosition;
          if (this.machineState.absoluteMode) {
            this.machineState.currentPosition[axis] = param.value;
          } else {
            this.machineState.currentPosition[axis] =
              (this.machineState.currentPosition[axis] || 0) + param.value;
          }
        }
      }
    }

    // Update feed rate
    const feedParam = command.parameters.find((p) => p.name === 'F');
    if (feedParam && typeof feedParam.value === 'number') {
      this.machineState.feedRate = feedParam.value;
    }

    // Update spindle speed
    const speedParam = command.parameters.find((p) => p.name === 'S');
    if (speedParam && typeof speedParam.value === 'number') {
      this.machineState.spindleSpeed = speedParam.value;
    }

    // Update machine modes
    switch (command.code) {
      case 'G90':
        this.machineState.absoluteMode = true;
        break;
      case 'G91':
        this.machineState.absoluteMode = false;
        break;
      case 'G20':
        this.machineState.units = 'inch';
        break;
      case 'G21':
        this.machineState.units = 'mm';
        break;
      case 'G17':
        this.machineState.plane = 'XY';
        break;
      case 'G18':
        this.machineState.plane = 'XZ';
        break;
      case 'G19':
        this.machineState.plane = 'YZ';
        break;
      case 'G40':
        this.machineState.toolRadiusComp = 'none';
        break;
      case 'G41':
        this.machineState.toolRadiusComp = 'left';
        break;
      case 'G42':
        this.machineState.toolRadiusComp = 'right';
        break;
      case 'G43':
        this.machineState.toolLengthComp = true;
        break;
      case 'G49':
        this.machineState.toolLengthComp = false;
        break;
      case 'G54':
      case 'G55':
      case 'G56':
      case 'G57':
      case 'G58':
      case 'G59':
        this.machineState.coordinateSystem = command.code as MachineState['coordinateSystem'];
        break;
      case 'M03':
      case 'M04':
        this.machineState.spindleOn = true;
        break;
      case 'M05':
        this.machineState.spindleOn = false;
        break;
      case 'M07':
      case 'M08':
        this.machineState.coolantOn = true;
        break;
      case 'M09':
        this.machineState.coolantOn = false;
        break;
      case 'M06': {
        const toolParam = command.parameters.find((p) => p.name === 'T');
        if (toolParam && typeof toolParam.value === 'string') {
          this.machineState.currentTool = parseInt(toolParam.value);
        }
        break;
      }
    }
  }

  private checkCommonIssues(ast: ProgramNode): void {
    // Check for missing coolant in long programs
    const hasMotion = ast.blocks.some((block) =>
      block.commands.some(
        (cmd) => cmd.type === 'Command' && ['G01', 'G02', 'G03'].includes(cmd.code)
      )
    );

    if (hasMotion && !this.machineState.coolantOn) {
      const hasCoolant = ast.blocks.some((block) =>
        block.commands.some((cmd) => cmd.type === 'Command' && ['M07', 'M08'].includes(cmd.code))
      );

      if (!hasCoolant) {
        this.addIssue(
          'Program obsahuje obrábění bez zapnutého chlazení',
          1,
          1,
          'info',
          'NO_COOLANT'
        );
      }
    }

    // Check for tool length compensation
    const hasZMotion = ast.blocks.some((block) =>
      block.commands.some(
        (cmd) => cmd.type === 'Command' && cmd.parameters.some((p) => p.name === 'Z')
      )
    );

    if (hasZMotion && !this.machineState.toolLengthComp) {
      const hasG43 = ast.blocks.some((block) =>
        block.commands.some((cmd) => cmd.type === 'Command' && cmd.code === 'G43')
      );

      if (!hasG43) {
        this.addIssue(
          'Pohyb v ose Z bez korekce délky nástroje (G43)',
          1,
          1,
          'info',
          'NO_TOOL_COMP'
        );
      }
    }
  }

  private addIssue(
    message: string,
    line: number,
    column: number,
    severity: ValidationIssue['severity'],
    code: string
  ): void {
    this.issues.push({ message, line, column, severity, code });
  }
}

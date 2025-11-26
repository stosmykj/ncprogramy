/**
 * G-code Toolpath Generator
 * Converts parsed G-code into 3D toolpath data for visualization
 */

import type { ProgramNode, BlockNode, CommandNode } from './parser';

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface ToolpathSegment {
  start: Point3D;
  end: Point3D;
  type: 'rapid' | 'linear' | 'arc';
  feedRate?: number;
  toolNumber?: number;
  color?: string;
}

export interface Arc {
  start: Point3D;
  end: Point3D;
  center: Point3D;
  radius: number;
  clockwise: boolean;
  plane: 'XY' | 'XZ' | 'YZ';
}

export interface ToolpathData {
  segments: ToolpathSegment[];
  bounds: {
    min: Point3D;
    max: Point3D;
  };
  totalLength: number;
  estimatedTime: number; // in minutes
  tools: number[];
}

export class ToolpathGenerator {
  private currentPosition: Point3D = { x: 0, y: 0, z: 0 };
  private currentFeedRate: number = 300; // mm/min
  private currentTool: number = 1;
  private absoluteMode: boolean = true;
  private units: 'mm' | 'inch' = 'mm';
  private plane: 'XY' | 'XZ' | 'YZ' = 'XY';
  private segments: ToolpathSegment[] = [];

  public generate(ast: ProgramNode): ToolpathData {
    this.reset();

    // Process all blocks
    for (const block of ast.blocks) {
      this.processBlock(block);
    }

    return {
      segments: this.segments,
      bounds: this.calculateBounds(),
      totalLength: this.calculateTotalLength(),
      estimatedTime: this.calculateEstimatedTime(),
      tools: this.getUsedTools(),
    };
  }

  private reset(): void {
    this.currentPosition = { x: 0, y: 0, z: 0 };
    this.currentFeedRate = 300;
    this.currentTool = 1;
    this.absoluteMode = true;
    this.units = 'mm';
    this.plane = 'XY';
    this.segments = [];
  }

  private processBlock(block: BlockNode): void {
    for (const command of block.commands) {
      if (command.type === 'Command') {
        this.processCommand(command);
      }
    }
  }

  private processCommand(command: CommandNode): void {
    switch (command.code) {
      case 'G00':
        this.processRapidMove(command);
        break;
      case 'G01':
        this.processLinearMove(command);
        break;
      case 'G02':
        this.processArcMove(command, true);
        break;
      case 'G03':
        this.processArcMove(command, false);
        break;
      case 'G17':
        this.plane = 'XY';
        break;
      case 'G18':
        this.plane = 'XZ';
        break;
      case 'G19':
        this.plane = 'YZ';
        break;
      case 'G20':
        this.units = 'inch';
        break;
      case 'G21':
        this.units = 'mm';
        break;
      case 'G90':
        this.absoluteMode = true;
        break;
      case 'G91':
        this.absoluteMode = false;
        break;
      case 'G28':
        // Return to home
        this.addSegment(this.currentPosition, { x: 0, y: 0, z: 0 }, 'rapid');
        this.currentPosition = { x: 0, y: 0, z: 0 };
        break;
      case 'M06': {
        // Tool change
        const toolParam = command.parameters.find((p) => p.name === 'T');
        if (toolParam) {
          this.currentTool =
            typeof toolParam.value === 'string'
              ? parseInt(toolParam.value)
              : (toolParam.value as number);
        }
        break;
      }
    }

    // Update feed rate if specified
    const feedParam = command.parameters.find((p) => p.name === 'F');
    if (feedParam && typeof feedParam.value === 'number') {
      this.currentFeedRate = feedParam.value;
    }
  }

  private processRapidMove(command: CommandNode): void {
    const newPosition = this.calculateNewPosition(command);
    this.addSegment(this.currentPosition, newPosition, 'rapid');
    this.currentPosition = newPosition;
  }

  private processLinearMove(command: CommandNode): void {
    const newPosition = this.calculateNewPosition(command);
    this.addSegment(this.currentPosition, newPosition, 'linear');
    this.currentPosition = newPosition;
  }

  private processArcMove(command: CommandNode, clockwise: boolean): void {
    const endPosition = this.calculateNewPosition(command);

    // Get arc parameters
    const iParam = command.parameters.find((p) => p.name === 'I');
    const jParam = command.parameters.find((p) => p.name === 'J');
    const kParam = command.parameters.find((p) => p.name === 'K');
    const rParam = command.parameters.find((p) => p.name === 'R');

    if (rParam && typeof rParam.value === 'number') {
      // Arc defined by radius
      this.addArcByRadius(this.currentPosition, endPosition, rParam.value, clockwise);
    } else if (iParam || jParam || kParam) {
      // Arc defined by center offset
      const i = iParam && typeof iParam.value === 'number' ? iParam.value : 0;
      const j = jParam && typeof jParam.value === 'number' ? jParam.value : 0;
      const k = kParam && typeof kParam.value === 'number' ? kParam.value : 0;

      const center = {
        x: this.currentPosition.x + i,
        y: this.currentPosition.y + j,
        z: this.currentPosition.z + k,
      };

      this.addArcByCenter(this.currentPosition, endPosition, center, clockwise);
    }

    this.currentPosition = endPosition;
  }

  private calculateNewPosition(command: CommandNode): Point3D {
    let newPosition = { ...this.currentPosition };

    for (const param of command.parameters) {
      if (['X', 'Y', 'Z'].includes(param.name) && typeof param.value === 'number') {
        const axis = param.name.toLowerCase() as 'x' | 'y' | 'z';
        let value = param.value;

        // Convert units if necessary
        if (this.units === 'inch') {
          value *= 25.4; // Convert to mm
        }

        if (this.absoluteMode) {
          newPosition[axis] = value;
        } else {
          newPosition[axis] += value;
        }
      }
    }

    return newPosition;
  }

  private addSegment(start: Point3D, end: Point3D, type: ToolpathSegment['type']): void {
    const color = this.getColorForSegmentType(type);

    this.segments.push({
      start: { ...start },
      end: { ...end },
      type,
      feedRate: type === 'rapid' ? undefined : this.currentFeedRate,
      toolNumber: this.currentTool,
      color,
    });
  }

  private addArcByRadius(start: Point3D, end: Point3D, radius: number, clockwise: boolean): void {
    // Simplified arc visualization - break into linear segments
    const segments = 20; // Number of segments to approximate the arc
    const points: Point3D[] = [start];

    // Calculate intermediate points
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const point = this.interpolateArc(start, end, t, radius, clockwise);
      points.push(point);
    }

    // Add segments
    for (let i = 0; i < points.length - 1; i++) {
      this.addSegment(points[i], points[i + 1], 'arc');
    }
  }

  private addArcByCenter(start: Point3D, end: Point3D, center: Point3D, clockwise: boolean): void {
    // Calculate radius
    const radius = Math.sqrt(
      Math.pow(start.x - center.x, 2) +
        Math.pow(start.y - center.y, 2) +
        Math.pow(start.z - center.z, 2)
    );

    // Generate arc segments
    const segments = 20;
    const points: Point3D[] = [start];

    // Calculate angles based on plane
    let startAngle = 0;
    let endAngle = 0;

    if (this.plane === 'XY') {
      startAngle = Math.atan2(start.y - center.y, start.x - center.x);
      endAngle = Math.atan2(end.y - center.y, end.x - center.x);
    } else if (this.plane === 'XZ') {
      startAngle = Math.atan2(start.z - center.z, start.x - center.x);
      endAngle = Math.atan2(end.z - center.z, end.x - center.x);
    } else if (this.plane === 'YZ') {
      startAngle = Math.atan2(start.z - center.z, start.y - center.y);
      endAngle = Math.atan2(end.z - center.z, end.y - center.y);
    }

    // Adjust angles for direction
    if (clockwise) {
      if (endAngle > startAngle) {
        endAngle -= 2 * Math.PI;
      }
    } else {
      if (endAngle < startAngle) {
        endAngle += 2 * Math.PI;
      }
    }

    const angleStep = (endAngle - startAngle) / segments;

    // Generate intermediate points
    for (let i = 1; i <= segments; i++) {
      const angle = startAngle + angleStep * i;
      const point = { ...center };

      if (this.plane === 'XY') {
        point.x = center.x + radius * Math.cos(angle);
        point.y = center.y + radius * Math.sin(angle);
        point.z = i === segments ? end.z : start.z;
      } else if (this.plane === 'XZ') {
        point.x = center.x + radius * Math.cos(angle);
        point.y = i === segments ? end.y : start.y;
        point.z = center.z + radius * Math.sin(angle);
      } else if (this.plane === 'YZ') {
        point.x = i === segments ? end.x : start.x;
        point.y = center.y + radius * Math.cos(angle);
        point.z = center.z + radius * Math.sin(angle);
      }

      points.push(point);
    }

    // Add segments
    for (let i = 0; i < points.length - 1; i++) {
      this.addSegment(points[i], points[i + 1], 'arc');
    }
  }

  private interpolateArc(
    start: Point3D,
    end: Point3D,
    t: number,
    _radius: number,
    _clockwise: boolean
  ): Point3D {
    // Simplified linear interpolation for demonstration
    // In a real implementation, this would calculate proper arc points
    return {
      x: start.x + (end.x - start.x) * t,
      y: start.y + (end.y - start.y) * t,
      z: start.z + (end.z - start.z) * t,
    };
  }

  private getColorForSegmentType(type: ToolpathSegment['type']): string {
    switch (type) {
      case 'rapid':
        return '#ff0000'; // Red for rapid moves
      case 'linear':
        return '#00ff00'; // Green for cutting moves
      case 'arc':
        return '#0080ff'; // Blue for arcs
      default:
        return '#ffffff';
    }
  }

  private calculateBounds(): { min: Point3D; max: Point3D } {
    if (this.segments.length === 0) {
      return {
        min: { x: 0, y: 0, z: 0 },
        max: { x: 0, y: 0, z: 0 },
      };
    }

    const min = { x: Infinity, y: Infinity, z: Infinity };
    const max = { x: -Infinity, y: -Infinity, z: -Infinity };

    for (const segment of this.segments) {
      // Check start point
      min.x = Math.min(min.x, segment.start.x);
      min.y = Math.min(min.y, segment.start.y);
      min.z = Math.min(min.z, segment.start.z);
      max.x = Math.max(max.x, segment.start.x);
      max.y = Math.max(max.y, segment.start.y);
      max.z = Math.max(max.z, segment.start.z);

      // Check end point
      min.x = Math.min(min.x, segment.end.x);
      min.y = Math.min(min.y, segment.end.y);
      min.z = Math.min(min.z, segment.end.z);
      max.x = Math.max(max.x, segment.end.x);
      max.y = Math.max(max.y, segment.end.y);
      max.z = Math.max(max.z, segment.end.z);
    }

    return { min, max };
  }

  private calculateTotalLength(): number {
    let totalLength = 0;

    for (const segment of this.segments) {
      const dx = segment.end.x - segment.start.x;
      const dy = segment.end.y - segment.start.y;
      const dz = segment.end.z - segment.start.z;
      const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
      totalLength += length;
    }

    return totalLength;
  }

  private calculateEstimatedTime(): number {
    let totalTime = 0; // in minutes
    const rapidFeedRate = 5000; // mm/min for rapid moves

    for (const segment of this.segments) {
      const dx = segment.end.x - segment.start.x;
      const dy = segment.end.y - segment.start.y;
      const dz = segment.end.z - segment.start.z;
      const length = Math.sqrt(dx * dx + dy * dy + dz * dz);

      const feedRate =
        segment.type === 'rapid' ? rapidFeedRate : segment.feedRate || this.currentFeedRate;
      const time = length / feedRate; // in minutes
      totalTime += time;
    }

    return totalTime;
  }

  private getUsedTools(): number[] {
    const tools = new Set<number>();
    for (const segment of this.segments) {
      if (segment.toolNumber) {
        tools.add(segment.toolNumber);
      }
    }
    return Array.from(tools).sort((a, b) => a - b);
  }
}

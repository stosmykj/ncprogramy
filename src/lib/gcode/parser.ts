/**
 * G-code Parser
 * Parses tokenized G-code into an Abstract Syntax Tree (AST)
 */

import { type Token, TokenType, GCodeLexer } from './lexer';
import { getGCodeInfo, getMCodeInfo } from './commands';

export interface Position {
  line: number;
  column: number;
}

export type ASTNode =
  | ProgramNode
  | BlockNode
  | CommandNode
  | CommentNode
  | ParameterNode
  | NumberNode;

export interface ProgramNode {
  type: 'Program';
  blocks: BlockNode[];
  position: Position;
}

export interface BlockNode {
  type: 'Block';
  number?: number;
  commands: (CommandNode | CommentNode)[];
  position: Position;
}

export interface CommandNode {
  type: 'Command';
  commandType: 'G' | 'M' | 'T' | 'S' | 'F';
  code: string;
  parameters: ParameterNode[];
  position: Position;
}

export interface CommentNode {
  type: 'Comment';
  value: string;
  position: Position;
}

export interface ParameterNode {
  type: 'Parameter';
  name: string;
  value: NumberNode | string;
  position: Position;
}

export interface NumberNode {
  type: 'Number';
  value: number;
  position: Position;
}

export interface ParseError {
  message: string;
  position: Position;
  severity: 'error' | 'warning' | 'info';
}

export class GCodeParser {
  private tokens: Token[];
  private currentIndex: number = 0;
  private errors: ParseError[] = [];

  constructor(input: string) {
    const lexer = new GCodeLexer(input);
    this.tokens = lexer.tokenize();
  }

  public parse(): { ast: ProgramNode; errors: ParseError[] } {
    const blocks: BlockNode[] = [];
    this.errors = [];

    while (!this.isAtEnd()) {
      // Skip newlines at program level
      if (this.check(TokenType.NEWLINE)) {
        this.advance();
        continue;
      }

      // Skip comments at program level
      if (this.check(TokenType.COMMENT)) {
        const comment = this.parseComment();
        if (comment) {
          blocks.push({
            type: 'Block',
            commands: [comment],
            position: comment.position,
          });
        }
        continue;
      }

      const block = this.parseBlock();
      if (block) {
        blocks.push(block);
      }
    }

    return {
      ast: {
        type: 'Program',
        blocks,
        position: { line: 1, column: 1 },
      },
      errors: this.errors,
    };
  }

  private parseBlock(): BlockNode | null {
    const startPosition = this.getCurrentPosition();
    const commands: (CommandNode | CommentNode)[] = [];
    let blockNumber: number | undefined;

    // Check for block number (N-code)
    if (this.check(TokenType.BLOCK_NUMBER)) {
      const blockToken = this.advance();
      blockNumber = parseInt(blockToken.value.slice(1)); // Remove 'N' prefix
    }

    // Parse commands on the same line
    while (!this.isAtEnd() && !this.check(TokenType.NEWLINE)) {
      if (this.check(TokenType.COMMENT)) {
        const comment = this.parseComment();
        if (comment) {
          commands.push(comment);
        }
      } else if (this.isCommandStart()) {
        const command = this.parseCommand();
        if (command) {
          commands.push(command);
          this.validateCommand(command);
        }
      } else {
        // Skip unknown tokens
        this.advance();
      }
    }

    // Consume newline if present
    if (this.check(TokenType.NEWLINE)) {
      this.advance();
    }

    if (commands.length === 0 && blockNumber === undefined) {
      return null;
    }

    return {
      type: 'Block',
      number: blockNumber,
      commands,
      position: startPosition,
    };
  }

  private parseCommand(): CommandNode | null {
    const position = this.getCurrentPosition();
    let commandType: 'G' | 'M' | 'T' | 'S' | 'F' = 'G';
    let code = '';
    const parameters: ParameterNode[] = [];

    // Determine command type and parse the command code
    if (this.check(TokenType.G_CODE)) {
      const token = this.advance();
      commandType = 'G';
      code = token.value;
    } else if (this.check(TokenType.M_CODE)) {
      const token = this.advance();
      commandType = 'M';
      code = token.value;
    } else if (this.check(TokenType.TOOL)) {
      const token = this.advance();
      commandType = 'T';
      code = token.value;
      parameters.push({
        type: 'Parameter',
        name: 'T',
        value: code.slice(1), // Remove 'T' prefix
        position,
      });
    } else if (this.check(TokenType.SPINDLE_SPEED)) {
      const token = this.advance();
      commandType = 'S';
      code = token.value;
      parameters.push({
        type: 'Parameter',
        name: 'S',
        value: parseFloat(code.slice(1)), // Remove 'S' prefix
        position,
      });
    } else if (this.check(TokenType.FEED_RATE)) {
      const token = this.advance();
      commandType = 'F';
      code = token.value;
      parameters.push({
        type: 'Parameter',
        name: 'F',
        value: parseFloat(code.slice(1)), // Remove 'F' prefix
        position,
      });
    }

    // Parse additional parameters
    while (!this.isAtEnd() && !this.check(TokenType.NEWLINE) && !this.check(TokenType.COMMENT)) {
      if (this.isParameterStart()) {
        const param = this.parseParameter();
        if (param) {
          parameters.push(param);
        }
      } else if (this.isCommandStart()) {
        // Next command started, stop parsing this one
        break;
      } else {
        // Skip unknown tokens
        this.advance();
      }
    }

    return {
      type: 'Command',
      commandType,
      code,
      parameters,
      position,
    };
  }

  private parseParameter(): ParameterNode | null {
    const position = this.getCurrentPosition();

    if (this.check(TokenType.AXIS)) {
      const token = this.advance();
      const name = token.value[0].toUpperCase();
      const value = parseFloat(token.value.slice(1));

      return {
        type: 'Parameter',
        name,
        value,
        position,
      };
    }

    if (this.check(TokenType.FEED_RATE)) {
      const token = this.advance();
      return {
        type: 'Parameter',
        name: 'F',
        value: parseFloat(token.value.slice(1)),
        position,
      };
    }

    if (this.check(TokenType.SPINDLE_SPEED)) {
      const token = this.advance();
      return {
        type: 'Parameter',
        name: 'S',
        value: parseFloat(token.value.slice(1)),
        position,
      };
    }

    if (this.check(TokenType.PARAMETER)) {
      const token = this.advance();
      return {
        type: 'Parameter',
        name: 'PARAM',
        value: token.value,
        position,
      };
    }

    return null;
  }

  private parseComment(): CommentNode | null {
    if (!this.check(TokenType.COMMENT)) {
      return null;
    }

    const token = this.advance();
    const position = { line: token.line, column: token.column };

    // Remove comment delimiters
    let value = token.value;
    if (value.startsWith('(') && value.endsWith(')')) {
      value = value.slice(1, -1);
    } else if (value.startsWith(';')) {
      value = value.slice(1);
    }

    return {
      type: 'Comment',
      value: value.trim(),
      position,
    };
  }

  private validateCommand(command: CommandNode): void {
    if (command.commandType === 'G') {
      const gCodeInfo = getGCodeInfo(command.code);
      if (!gCodeInfo) {
        this.addError(`Neznámý G-kód: ${command.code}`, command.position, 'warning');
      } else {
        // Validate parameters
        if (gCodeInfo.parameters) {
          const requiredParams = gCodeInfo.parameters.filter((p) => p.required);
          const providedParams = new Set(command.parameters.map((p) => p.name));

          for (const required of requiredParams) {
            if (!providedParams.has(required.name)) {
              this.addError(
                `Chybí povinný parametr ${required.name} pro ${command.code}`,
                command.position,
                'error'
              );
            }
          }

          // Check parameter ranges
          for (const param of command.parameters) {
            const paramDef = gCodeInfo.parameters.find((p) => p.name === param.name);
            if (paramDef && typeof param.value === 'number') {
              if (paramDef.min !== undefined && param.value < paramDef.min) {
                this.addError(
                  `Parametr ${param.name} je menší než minimální hodnota ${paramDef.min}`,
                  param.position,
                  'warning'
                );
              }
              if (paramDef.max !== undefined && param.value > paramDef.max) {
                this.addError(
                  `Parametr ${param.name} je větší než maximální hodnota ${paramDef.max}`,
                  param.position,
                  'warning'
                );
              }
            }
          }
        }
      }
    } else if (command.commandType === 'M') {
      const mCodeInfo = getMCodeInfo(command.code);
      if (!mCodeInfo) {
        this.addError(`Neznámý M-kód: ${command.code}`, command.position, 'warning');
      }
    }
  }

  private isCommandStart(): boolean {
    return (
      this.check(TokenType.G_CODE) ||
      this.check(TokenType.M_CODE) ||
      this.check(TokenType.TOOL) ||
      this.check(TokenType.SPINDLE_SPEED) ||
      this.check(TokenType.FEED_RATE)
    );
  }

  private isParameterStart(): boolean {
    return (
      this.check(TokenType.AXIS) ||
      this.check(TokenType.FEED_RATE) ||
      this.check(TokenType.SPINDLE_SPEED) ||
      this.check(TokenType.PARAMETER)
    );
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) {
      this.currentIndex++;
    }
    return this.previous();
  }

  private peek(): Token {
    return this.tokens[this.currentIndex];
  }

  private previous(): Token {
    return this.tokens[this.currentIndex - 1];
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private getCurrentPosition(): Position {
    const token = this.peek();
    return { line: token.line, column: token.column };
  }

  private addError(message: string, position: Position, severity: ParseError['severity']): void {
    this.errors.push({ message, position, severity });
  }
}

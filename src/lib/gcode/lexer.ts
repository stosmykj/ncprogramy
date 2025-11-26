/**
 * G-code Lexer/Tokenizer
 * Tokenizes G-code into meaningful tokens for syntax highlighting and parsing
 */

export enum TokenType {
  // G-code specific
  G_CODE = 'G_CODE', // G commands (G00, G01, etc.)
  M_CODE = 'M_CODE', // M commands (M00, M30, etc.)
  AXIS = 'AXIS', // X, Y, Z, A, B, C, U, V, W
  FEED_RATE = 'FEED_RATE', // F
  SPINDLE_SPEED = 'SPINDLE_SPEED', // S
  TOOL = 'TOOL', // T

  // Parameters
  PARAMETER = 'PARAMETER', // #<param> or #100
  VARIABLE = 'VARIABLE', // #1-#999

  // Literals
  NUMBER = 'NUMBER',
  STRING = 'STRING',

  // Program structure
  PROGRAM_NUMBER = 'PROGRAM_NUMBER', // O commands
  BLOCK_NUMBER = 'BLOCK_NUMBER', // N commands
  SUBROUTINE = 'SUBROUTINE', // O subroutine calls

  // Comments
  COMMENT = 'COMMENT',
  INLINE_COMMENT = 'INLINE_COMMENT',

  // Operators
  OPERATOR = 'OPERATOR',

  // Special
  WHITESPACE = 'WHITESPACE',
  NEWLINE = 'NEWLINE',
  UNKNOWN = 'UNKNOWN',
  EOF = 'EOF',
}

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
  length: number;
}

export class GCodeLexer {
  private input: string;
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;
  private tokens: Token[] = [];

  constructor(input: string) {
    this.input = input;
  }

  public tokenize(): Token[] {
    while (this.position < this.input.length) {
      const token = this.nextToken();
      if (token && token.type !== TokenType.WHITESPACE) {
        this.tokens.push(token);
      }
    }

    this.tokens.push({
      type: TokenType.EOF,
      value: '',
      line: this.line,
      column: this.column,
      length: 0,
    });

    return this.tokens;
  }

  private nextToken(): Token | null {
    if (this.position >= this.input.length) {
      return null;
    }

    const startPosition = this.position;
    const startColumn = this.column;
    const startLine = this.line;

    // Skip whitespace
    if (this.isWhitespace(this.current())) {
      while (this.isWhitespace(this.current()) && this.current() !== '\n') {
        this.advance();
      }
      return {
        type: TokenType.WHITESPACE,
        value: this.input.substring(startPosition, this.position),
        line: startLine,
        column: startColumn,
        length: this.position - startPosition,
      };
    }

    // Handle newlines
    if (this.current() === '\n') {
      this.advance();
      this.line++;
      this.column = 1;
      return {
        type: TokenType.NEWLINE,
        value: '\n',
        line: startLine,
        column: startColumn,
        length: 1,
      };
    }

    // Handle comments
    if (this.current() === '(' || this.current() === ';') {
      return this.scanComment();
    }

    // Handle G-codes
    if (this.current() === 'G' || this.current() === 'g') {
      return this.scanGCode();
    }

    // Handle M-codes
    if (this.current() === 'M' || this.current() === 'm') {
      return this.scanMCode();
    }

    // Handle axis letters
    if (this.isAxisLetter(this.current())) {
      return this.scanAxis();
    }

    // Handle feed rate
    if (this.current() === 'F' || this.current() === 'f') {
      return this.scanFeedRate();
    }

    // Handle spindle speed
    if (this.current() === 'S' || this.current() === 's') {
      return this.scanSpindleSpeed();
    }

    // Handle tool
    if (this.current() === 'T' || this.current() === 't') {
      return this.scanTool();
    }

    // Handle program/block numbers
    if (this.current() === 'O' || this.current() === 'o') {
      return this.scanProgramNumber();
    }

    if (this.current() === 'N' || this.current() === 'n') {
      return this.scanBlockNumber();
    }

    // Handle parameters/variables
    if (this.current() === '#') {
      return this.scanParameter();
    }

    // Handle numbers
    if (
      this.isDigit(this.current()) ||
      this.current() === '-' ||
      this.current() === '+' ||
      this.current() === '.'
    ) {
      return this.scanNumber();
    }

    // Handle operators
    if (this.isOperator(this.current())) {
      const value = this.current();
      this.advance();
      return {
        type: TokenType.OPERATOR,
        value,
        line: startLine,
        column: startColumn,
        length: 1,
      };
    }

    // Unknown character
    const value = this.current();
    this.advance();
    return {
      type: TokenType.UNKNOWN,
      value,
      line: startLine,
      column: startColumn,
      length: 1,
    };
  }

  private scanComment(): Token {
    const startColumn = this.column;
    const startLine = this.line;
    const startPosition = this.position;

    if (this.current() === '(') {
      this.advance(); // Skip '('
      while (this.current() && this.current() !== ')') {
        if (this.current() === '\n') {
          this.line++;
          this.column = 0;
        }
        this.advance();
      }
      if (this.current() === ')') {
        this.advance();
      }
    } else if (this.current() === ';') {
      while (this.current() && this.current() !== '\n') {
        this.advance();
      }
    }

    return {
      type: TokenType.COMMENT,
      value: this.input.substring(startPosition, this.position),
      line: startLine,
      column: startColumn,
      length: this.position - startPosition,
    };
  }

  private scanGCode(): Token {
    const startColumn = this.column;
    const startLine = this.line;
    const startPosition = this.position;

    this.advance(); // Skip 'G'

    // G-codes can have decimals (e.g., G54.1)
    while (this.isDigit(this.current()) || this.current() === '.') {
      this.advance();
    }

    return {
      type: TokenType.G_CODE,
      value: this.input.substring(startPosition, this.position),
      line: startLine,
      column: startColumn,
      length: this.position - startPosition,
    };
  }

  private scanMCode(): Token {
    const startColumn = this.column;
    const startLine = this.line;
    const startPosition = this.position;

    this.advance(); // Skip 'M'

    while (this.isDigit(this.current())) {
      this.advance();
    }

    return {
      type: TokenType.M_CODE,
      value: this.input.substring(startPosition, this.position),
      line: startLine,
      column: startColumn,
      length: this.position - startPosition,
    };
  }

  private scanAxis(): Token {
    const startColumn = this.column;
    const startLine = this.line;
    const startPosition = this.position;

    this.advance(); // Skip axis letter

    // Skip optional sign
    if (this.current() === '-' || this.current() === '+') {
      this.advance();
    }

    // Scan number value
    while (this.isDigit(this.current()) || this.current() === '.') {
      this.advance();
    }

    return {
      type: TokenType.AXIS,
      value: this.input.substring(startPosition, this.position),
      line: startLine,
      column: startColumn,
      length: this.position - startPosition,
    };
  }

  private scanFeedRate(): Token {
    const startColumn = this.column;
    const startLine = this.line;
    const startPosition = this.position;

    this.advance(); // Skip 'F'

    while (this.isDigit(this.current()) || this.current() === '.') {
      this.advance();
    }

    return {
      type: TokenType.FEED_RATE,
      value: this.input.substring(startPosition, this.position),
      line: startLine,
      column: startColumn,
      length: this.position - startPosition,
    };
  }

  private scanSpindleSpeed(): Token {
    const startColumn = this.column;
    const startLine = this.line;
    const startPosition = this.position;

    this.advance(); // Skip 'S'

    while (this.isDigit(this.current()) || this.current() === '.') {
      this.advance();
    }

    return {
      type: TokenType.SPINDLE_SPEED,
      value: this.input.substring(startPosition, this.position),
      line: startLine,
      column: startColumn,
      length: this.position - startPosition,
    };
  }

  private scanTool(): Token {
    const startColumn = this.column;
    const startLine = this.line;
    const startPosition = this.position;

    this.advance(); // Skip 'T'

    while (this.isDigit(this.current())) {
      this.advance();
    }

    return {
      type: TokenType.TOOL,
      value: this.input.substring(startPosition, this.position),
      line: startLine,
      column: startColumn,
      length: this.position - startPosition,
    };
  }

  private scanProgramNumber(): Token {
    const startColumn = this.column;
    const startLine = this.line;
    const startPosition = this.position;

    this.advance(); // Skip 'O'

    while (this.isDigit(this.current())) {
      this.advance();
    }

    return {
      type: TokenType.PROGRAM_NUMBER,
      value: this.input.substring(startPosition, this.position),
      line: startLine,
      column: startColumn,
      length: this.position - startPosition,
    };
  }

  private scanBlockNumber(): Token {
    const startColumn = this.column;
    const startLine = this.line;
    const startPosition = this.position;

    this.advance(); // Skip 'N'

    while (this.isDigit(this.current())) {
      this.advance();
    }

    return {
      type: TokenType.BLOCK_NUMBER,
      value: this.input.substring(startPosition, this.position),
      line: startLine,
      column: startColumn,
      length: this.position - startPosition,
    };
  }

  private scanParameter(): Token {
    const startColumn = this.column;
    const startLine = this.line;
    const startPosition = this.position;

    this.advance(); // Skip '#'

    if (this.current() === '<') {
      // Named parameter
      this.advance();
      while (this.current() && this.current() !== '>') {
        this.advance();
      }
      if (this.current() === '>') {
        this.advance();
      }
    } else {
      // Numbered parameter
      while (this.isDigit(this.current())) {
        this.advance();
      }
    }

    return {
      type: TokenType.PARAMETER,
      value: this.input.substring(startPosition, this.position),
      line: startLine,
      column: startColumn,
      length: this.position - startPosition,
    };
  }

  private scanNumber(): Token {
    const startColumn = this.column;
    const startLine = this.line;
    const startPosition = this.position;

    if (this.current() === '-' || this.current() === '+') {
      this.advance();
    }

    while (this.isDigit(this.current())) {
      this.advance();
    }

    if (this.current() === '.') {
      this.advance();
      while (this.isDigit(this.current())) {
        this.advance();
      }
    }

    return {
      type: TokenType.NUMBER,
      value: this.input.substring(startPosition, this.position),
      line: startLine,
      column: startColumn,
      length: this.position - startPosition,
    };
  }

  private current(): string {
    if (this.position >= this.input.length) {
      return '\0';
    }
    return this.input[this.position];
  }

  private advance(): void {
    if (this.position < this.input.length) {
      this.position++;
      this.column++;
    }
  }

  private isWhitespace(char: string): boolean {
    return char === ' ' || char === '\t' || char === '\r';
  }

  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  private isAxisLetter(char: string): boolean {
    const upper = char.toUpperCase();
    // Include H for tool length offset (G43 H1), D for cutter compensation
    return ['X', 'Y', 'Z', 'A', 'B', 'C', 'U', 'V', 'W', 'I', 'J', 'K', 'R', 'H', 'D'].includes(upper);
  }

  private isOperator(char: string): boolean {
    return ['+', '-', '*', '/', '=', '<', '>', '[', ']'].includes(char);
  }
}

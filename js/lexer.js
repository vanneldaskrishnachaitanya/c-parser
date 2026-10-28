/**
 * C Language Lexer (Lexical Analyzer)
 * Tokenizes ANSI C / C99 / C11 source code with full position tracking.
 */

export const TokenType = {
  KEYWORD: 'KEYWORD',
  IDENTIFIER: 'IDENTIFIER',
  NUMBER: 'NUMBER',
  STRING: 'STRING',
  CHAR: 'CHAR',
  OPERATOR: 'OPERATOR',
  PUNCTUATOR: 'PUNCTUATOR',
  PREPROCESSOR: 'PREPROCESSOR',
  COMMENT: 'COMMENT',
  EOF: 'EOF',
  UNKNOWN: 'UNKNOWN'
};

export const C_KEYWORDS = new Set([
  'auto', 'break', 'case', 'char', 'const', 'continue', 'default', 'do',
  'double', 'else', 'enum', 'extern', 'float', 'for', 'goto', 'if',
  'inline', 'int', 'long', 'register', 'restrict', 'return', 'short',
  'signed', 'sizeof', 'static', 'struct', 'switch', 'typedef', 'union',
  'unsigned', 'void', 'volatile', 'while', '_Bool', '_Complex', '_Imaginary'
]);

export const C_TYPE_SPECIFIERS = new Set([
  'void', 'char', 'short', 'int', 'long', 'float', 'double',
  'signed', 'unsigned', '_Bool', '_Complex', 'struct', 'union', 'enum'
]);

export const C_TYPE_QUALIFIERS = new Set([
  'const', 'volatile', 'restrict', 'static', 'extern', 'inline', 'register', 'auto'
]);

export class Token {
  constructor(id, type, value, line, col, start, end, extra = {}) {
    this.id = id;
    this.type = type;
    this.value = value;
    this.line = line;
    this.col = col;
    this.start = start;
    this.end = end;
    this.extra = extra;
  }
}

export class Lexer {
  constructor(source, options = { includeComments: false }) {
    this.source = source || '';
    this.options = options;
    this.pos = 0;
    this.line = 1;
    this.col = 1;
    this.tokens = [];
    this.errors = [];
    this.tokenIdCounter = 1;
  }

  tokenize() {
    this.tokens = [];
    this.errors = [];
    this.pos = 0;
    this.line = 1;
    this.col = 1;
    this.tokenIdCounter = 1;

    while (this.pos < this.source.length) {
      const ch = this.source[this.pos];

      // Whitespace
      if (this.isWhitespace(ch)) {
        this.consumeWhitespace();
        continue;
      }

      // Preprocessor directive (starting with # at line beginning or after whitespace)
      if (ch === '#') {
        const token = this.readPreprocessor();
        if (token) this.tokens.push(token);
        continue;
      }

      // Comments or Division operator
      if (ch === '/') {
        const next = this.peekNext();
        if (next === '/' || next === '*') {
          const commentToken = this.readComment();
          if (this.options.includeComments && commentToken) {
            this.tokens.push(commentToken);
          }
          continue;
        }
      }

      // Identifiers & Keywords
      if (this.isAlphaOrUnderscore(ch)) {
        this.tokens.push(this.readIdentifierOrKeyword());
        continue;
      }

      // Numbers (decimal, hex, octal, binary, floats)
      if (this.isDigit(ch) || (ch === '.' && this.isDigit(this.peekNext()))) {
        this.tokens.push(this.readNumber());
        continue;
      }

      // String literals
      if (ch === '"') {
        this.tokens.push(this.readString());
        continue;
      }

      // Character literals
      if (ch === "'") {
        this.tokens.push(this.readChar());
        continue;
      }

      // Multi-char & single-char Operators / Punctuators
      const opOrPunc = this.readOperatorOrPunctuator();
      if (opOrPunc) {
        this.tokens.push(opOrPunc);
        continue;
      }

      // Unknown character error
      const errStart = this.pos;
      const errLine = this.line;
      const errCol = this.col;
      const invalidChar = this.source[this.pos++];
      this.col++;
      const errToken = new Token(
        this.tokenIdCounter++,
        TokenType.UNKNOWN,
        invalidChar,
        errLine,
        errCol,
        errStart,
        this.pos
      );
      this.tokens.push(errToken);
      this.errors.push({
        message: `Unexpected character '${invalidChar}'`,
        line: errLine,
        col: errCol,
        start: errStart,
        end: this.pos
      });
    }

    // EOF Token
    this.tokens.push(new Token(
      this.tokenIdCounter++,
      TokenType.EOF,
      '<EOF>',
      this.line,
      this.col,
      this.pos,
      this.pos
    ));

    return {
      tokens: this.tokens,
      errors: this.errors
    };
  }

  isWhitespace(ch) {
    return ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n' || ch === '\v' || ch === '\f';
  }

  consumeWhitespace() {
    const ch = this.source[this.pos++];
    if (ch === '\n') {
      this.line++;
      this.col = 1;
    } else {
      this.col++;
    }
  }

  isAlphaOrUnderscore(ch) {
    return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_';
  }

  isDigit(ch) {
    return ch >= '0' && ch <= '9';
  }

  isHexDigit(ch) {
    return (ch >= '0' && ch <= '9') ||
      (ch >= 'a' && ch <= 'f') ||
      (ch >= 'A' && ch <= 'F');
  }

  isOctalDigit(ch) {
    return ch >= '0' && ch <= '7';
  }

  isBinaryDigit(ch) {
    return ch === '0' || ch === '1';
  }

  peekNext(offset = 1) {
    const target = this.pos + offset;
    return target < this.source.length ? this.source[target] : '';
  }

  readIdentifierOrKeyword() {
    const start = this.pos;
    const startCol = this.col;
    const startLine = this.line;

    while (this.pos < this.source.length && (this.isAlphaOrUnderscore(this.source[this.pos]) || this.isDigit(this.source[this.pos]))) {
      this.pos++;
      this.col++;
    }

    const value = this.source.substring(start, this.pos);
    const isKeyword = C_KEYWORDS.has(value);
    const type = isKeyword ? TokenType.KEYWORD : TokenType.IDENTIFIER;

    const extra = {};
    if (isKeyword) {
      if (C_TYPE_SPECIFIERS.has(value)) extra.isTypeSpecifier = true;
      if (C_TYPE_QUALIFIERS.has(value)) extra.isTypeQualifier = true;
    }

    return new Token(this.tokenIdCounter++, type, value, startLine, startCol, start, this.pos, extra);
  }

  readNumber() {
    const start = this.pos;
    const startCol = this.col;
    const startLine = this.line;
    let isFloat = false;
    let base = 'dec';

    // Hex: 0x... or 0X...
    if (this.source[this.pos] === '0' && (this.peekNext() === 'x' || this.peekNext() === 'X')) {
      base = 'hex';
      this.pos += 2;
      this.col += 2;
      while (this.pos < this.source.length && this.isHexDigit(this.source[this.pos])) {
        this.pos++;
        this.col++;
      }
    }
    // Binary: 0b... or 0B... (GCC / C23 extension)
    else if (this.source[this.pos] === '0' && (this.peekNext() === 'b' || this.peekNext() === 'B')) {
      base = 'bin';
      this.pos += 2;
      this.col += 2;
      while (this.pos < this.source.length && this.isBinaryDigit(this.source[this.pos])) {
        this.pos++;
        this.col++;
      }
    }
    // Octal or Decimal or Float
    else if (this.source[this.pos] === '0' && this.isOctalDigit(this.peekNext())) {
      base = 'oct';
      this.pos++;
      this.col++;
      while (this.pos < this.source.length && this.isOctalDigit(this.source[this.pos])) {
        this.pos++;
        this.col++;
      }
    } else {
      // Decimal digits
      while (this.pos < this.source.length && this.isDigit(this.source[this.pos])) {
        this.pos++;
        this.col++;
      }

      // Fractional part
      if (this.pos < this.source.length && this.source[this.pos] === '.') {
        isFloat = true;
        this.pos++;
        this.col++;
        while (this.pos < this.source.length && this.isDigit(this.source[this.pos])) {
          this.pos++;
          this.col++;
        }
      }

      // Exponent part (e.g. 1e10, 2.5e-3)
      if (this.pos < this.source.length && (this.source[this.pos] === 'e' || this.source[this.pos] === 'E')) {
        isFloat = true;
        this.pos++;
        this.col++;
        if (this.source[this.pos] === '+' || this.source[this.pos] === '-') {
          this.pos++;
          this.col++;
        }
        while (this.pos < this.source.length && this.isDigit(this.source[this.pos])) {
          this.pos++;
          this.col++;
        }
      }
    }

    // Number suffixes (u, l, ul, ull, f, etc.)
    while (this.pos < this.source.length && /[uUlLfF]/.test(this.source[this.pos])) {
      if (/[fF]/.test(this.source[this.pos])) isFloat = true;
      this.pos++;
      this.col++;
    }

    const value = this.source.substring(start, this.pos);
    return new Token(this.tokenIdCounter++, TokenType.NUMBER, value, startLine, startCol, start, this.pos, {
      isFloat,
      base
    });
  }

  readString() {
    const start = this.pos;
    const startCol = this.col;
    const startLine = this.line;

    this.pos++; // skip initial '"'
    this.col++;
    let escaped = false;
    let closed = false;

    while (this.pos < this.source.length) {
      const ch = this.source[this.pos++];
      if (ch === '\n') {
        this.line++;
        this.col = 1;
      } else {
        this.col++;
      }

      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        closed = true;
        break;
      }
    }

    const value = this.source.substring(start, this.pos);
    if (!closed) {
      this.errors.push({
        message: 'Unterminated string literal',
        line: startLine,
        col: startCol,
        start,
        end: this.pos
      });
    }

    return new Token(this.tokenIdCounter++, TokenType.STRING, value, startLine, startCol, start, this.pos, {
      closed
    });
  }

  readChar() {
    const start = this.pos;
    const startCol = this.col;
    const startLine = this.line;

    this.pos++; // skip initial "'"
    this.col++;
    let escaped = false;
    let closed = false;

    while (this.pos < this.source.length) {
      const ch = this.source[this.pos++];
      if (ch === '\n') {
        this.line++;
        this.col = 1;
      } else {
        this.col++;
      }

      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === "'") {
        closed = true;
        break;
      }
    }

    const value = this.source.substring(start, this.pos);
    if (!closed) {
      this.errors.push({
        message: 'Unterminated character literal',
        line: startLine,
        col: startCol,
        start,
        end: this.pos
      });
    }

    return new Token(this.tokenIdCounter++, TokenType.CHAR, value, startLine, startCol, start, this.pos, {
      closed
    });
  }

  readComment() {
    const start = this.pos;
    const startCol = this.col;
    const startLine = this.line;
    const isSingleLine = this.source[this.pos + 1] === '/';

    this.pos += 2;
    this.col += 2;

    if (isSingleLine) {
      while (this.pos < this.source.length && this.source[this.pos] !== '\n' && this.source[this.pos] !== '\r') {
        this.pos++;
        this.col++;
      }
    } else {
      let closed = false;
      while (this.pos < this.source.length) {
        if (this.source[this.pos] === '*' && this.peekNext() === '/') {
          this.pos += 2;
          this.col += 2;
          closed = true;
          break;
        }
        if (this.source[this.pos] === '\n') {
          this.line++;
          this.col = 1;
        } else {
          this.col++;
        }
        this.pos++;
      }
      if (!closed) {
        this.errors.push({
          message: 'Unterminated block comment',
          line: startLine,
          col: startCol,
          start,
          end: this.pos
        });
      }
    }

    const value = this.source.substring(start, this.pos);
    return new Token(this.tokenIdCounter++, TokenType.COMMENT, value, startLine, startCol, start, this.pos, {
      isSingleLine
    });
  }

  readPreprocessor() {
    const start = this.pos;
    const startCol = this.col;
    const startLine = this.line;

    // Read until end of line (taking care of backslash continuation)
    while (this.pos < this.source.length) {
      if (this.source[this.pos] === '\\' && this.peekNext() === '\n') {
        this.pos += 2;
        this.line++;
        this.col = 1;
        continue;
      }
      if (this.source[this.pos] === '\n') {
        break;
      }
      this.pos++;
      this.col++;
    }

    const value = this.source.substring(start, this.pos);
    return new Token(this.tokenIdCounter++, TokenType.PREPROCESSOR, value, startLine, startCol, start, this.pos);
  }

  readOperatorOrPunctuator() {
    const start = this.pos;
    const startCol = this.col;
    const startLine = this.line;

    // 3-character operators: <<=, >>=, ...
    const threeChars = this.source.substring(this.pos, this.pos + 3);
    if (['<<=', '>>=', '...'].includes(threeChars)) {
      this.pos += 3;
      this.col += 3;
      return new Token(this.tokenIdCounter++, TokenType.OPERATOR, threeChars, startLine, startCol, start, this.pos);
    }

    // 2-character operators
    const twoChars = this.source.substring(this.pos, this.pos + 2);
    const twoCharOps = [
      '++', '--', '->', '&&', '||', '<<', '>>',
      '<=', '>=', '==', '!=', '+=', '-=', '*=', '/=', '%=',
      '&=', '^=', '|='
    ];
    if (twoCharOps.includes(twoChars)) {
      this.pos += 2;
      this.col += 2;
      return new Token(this.tokenIdCounter++, TokenType.OPERATOR, twoChars, startLine, startCol, start, this.pos);
    }

    // 1-character operators and punctuators
    const ch = this.source[this.pos];
    const punctuators = [';', ',', '(', ')', '{', '}', '[', ']'];
    const singleOperators = ['+', '-', '*', '/', '%', '<', '>', '=', '!', '~', '&', '|', '^', '?', ':', '.'];

    if (punctuators.includes(ch)) {
      this.pos++;
      this.col++;
      return new Token(this.tokenIdCounter++, TokenType.PUNCTUATOR, ch, startLine, startCol, start, this.pos);
    }

    if (singleOperators.includes(ch)) {
      this.pos++;
      this.col++;
      return new Token(this.tokenIdCounter++, TokenType.OPERATOR, ch, startLine, startCol, start, this.pos);
    }

    return null;
  }
}

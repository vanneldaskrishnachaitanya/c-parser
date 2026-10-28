/**
 * C Language Parser (Recursive Descent + Pratt Expression Parsing)
 * Handles ANSI C / C99 constructs with resilient error synchronization.
 */

import { TokenType, C_TYPE_SPECIFIERS, C_TYPE_QUALIFIERS } from './lexer.js';
import { AST, ASTNodeType } from './ast.js';

export class Parser {
  constructor(tokens, source = '') {
    // Strip comments so they never interfere with parsing grammar
    this.tokens = (tokens || []).filter(t => t.type !== TokenType.COMMENT);
    this.source = source;
    this.pos = 0;
    this.errors = [];
    this.grammarTraces = [];
    this.maxDepth = 0;
    this.currentDepth = 0;
    this.customTypes = new Set();
  }

  traceGrammar(rule, info = '') {
    this.grammarTraces.push({
      rule,
      info,
      line: this.peek()?.line || 1,
      col: this.peek()?.col || 1
    });
  }

  enterNode() {
    this.currentDepth++;
    if (this.currentDepth > this.maxDepth) {
      this.maxDepth = this.currentDepth;
    }
  }

  exitNode() {
    this.currentDepth--;
  }

  peek(offset = 0) {
    const target = this.pos + offset;
    return target < this.tokens.length ? this.tokens[target] : this.tokens[this.tokens.length - 1];
  }

  isAtEnd() {
    return this.peek().type === TokenType.EOF;
  }

  advance() {
    if (!this.isAtEnd()) {
      return this.tokens[this.pos++];
    }
    return this.peek();
  }

  check(type, value = null) {
    if (this.isAtEnd()) return false;
    const tok = this.peek();
    if (tok.type !== type) return false;
    if (value !== null && tok.value !== value) return false;
    return true;
  }

  match(type, value = null) {
    if (this.check(type, value)) {
      return this.advance();
    }
    return null;
  }

  consume(type, value = null, errorMsg = '') {
    if (this.check(type, value)) {
      return this.advance();
    }
    const tok = this.peek();
    const expected = value ? `'${value}'` : type;
    const msg = errorMsg || `Expected ${expected}, but found '${tok.value}'`;
    this.recordError(msg, tok);
    return null;
  }

  recordError(message, token, suggestion = null) {
    const tok = token || this.peek();
    this.errors.push({
      message,
      line: tok.line,
      col: tok.col,
      start: tok.start,
      end: tok.end,
      suggestion,
      found: tok.value
    });
  }

  synchronize() {
    this.advance();
    while (!this.isAtEnd()) {
      if (this.tokens[this.pos - 1].value === ';') return;
      if (this.tokens[this.pos - 1].value === '}') return;

      const tok = this.peek();
      if (['if', 'while', 'for', 'switch', 'return', 'struct', 'typedef', 'int', 'void', 'char'].includes(tok.value)) {
        return;
      }
      this.advance();
    }
  }

  parse() {
    this.enterNode();
    const startTok = this.peek();
    const declarations = [];
    this.traceGrammar('translation-unit', 'Program start');

    while (!this.isAtEnd()) {
      try {
        const decl = this.parseExternalDeclaration();
        if (decl) {
          declarations.push(decl);
        }
      } catch (err) {
        this.recordError(err.message || 'Fatal parsing error', this.peek());
        this.synchronize();
      }
    }

    const endTok = this.peek();
    this.exitNode();

    return {
      ast: AST.translationUnit(declarations, {
        line: startTok.line,
        col: startTok.col,
        start: startTok.start,
        end: endTok.end
      }),
      errors: this.errors,
      grammarTraces: this.grammarTraces,
      maxDepth: this.maxDepth,
      totalTokens: this.tokens.length
    };
  }

  parseExternalDeclaration() {
    const tok = this.peek();

    // Preprocessor directive
    if (tok.type === TokenType.PREPROCESSOR) {
      this.advance();
      this.traceGrammar('preprocessor-directive', tok.value);
      const parts = tok.value.trim().split(/\s+/);
      return AST.preprocessor(parts[0], tok.value, {
        line: tok.line,
        col: tok.col,
        start: tok.start,
        end: tok.end
      });
    }

    // Typedef
    if (tok.type === TokenType.KEYWORD && tok.value === 'typedef') {
      return this.parseTypedefDeclaration();
    }

    // Struct / Union / Enum standalone declaration or type
    if (this.isStructOrUnionOrEnumStart()) {
      return this.parseStructOrUnionDeclaration();
    }

    // Function definition or global variable declaration
    return this.parseFunctionOrVariableDeclaration();
  }

  isStructOrUnionOrEnumStart() {
    const val = this.peek().value;
    return val === 'struct' || val === 'union' || val === 'enum';
  }

  parseTypedefDeclaration() {
    const startTok = this.advance(); // consume 'typedef'
    this.traceGrammar('typedef-declaration');

    // Check if typedef struct
    if (this.isStructOrUnionOrEnumStart()) {
      const structNode = this.parseStructOrUnionDeclaration(true);
      return structNode;
    }

    const baseType = this.parseTypeSpecifier();
    const declarator = this.parseDeclarator();
    this.consume(TokenType.PUNCTUATOR, ';', "Expected ';' after typedef declaration");

    if (declarator && declarator.name) {
      this.customTypes.add(declarator.name);
    }

    return AST.typedefDeclaration(baseType, declarator?.name || '<unknown>', {
      line: startTok.line,
      col: startTok.col,
      start: startTok.start,
      end: this.peek().end
    });
  }

  parseStructOrUnionDeclaration(isTypedef = false) {
    const startTok = this.advance(); // struct / union / enum
    const kind = startTok.value;
    this.traceGrammar(`${kind}-declaration`);

    let name = null;
    if (this.check(TokenType.IDENTIFIER)) {
      name = this.advance().value;
    }

    let members = [];
    if (this.match(TokenType.PUNCTUATOR, '{')) {
      while (!this.check(TokenType.PUNCTUATOR, '}') && !this.isAtEnd()) {
        const memberDecl = this.parseVariableDeclaration();
        if (memberDecl) members.push(memberDecl);
      }
      this.consume(TokenType.PUNCTUATOR, '}', "Expected '}' at end of struct body");
    }

    let alias = null;
    if (this.check(TokenType.IDENTIFIER)) {
      alias = this.advance().value;
      if (isTypedef) {
        this.customTypes.add(alias);
      }
    }

    this.consume(TokenType.PUNCTUATOR, ';', `Expected ';' after ${kind} declaration`);

    if (kind === 'enum') {
      return AST.enumDeclaration(name, members, {
        line: startTok.line,
        col: startTok.col,
        start: startTok.start,
        end: this.peek().end
      });
    }

    return AST.structDeclaration(name, members, isTypedef, alias, {
      line: startTok.line,
      col: startTok.col,
      start: startTok.start,
      end: this.peek().end
    });
  }

  isTypeSpecifier(tok = this.peek()) {
    if (!tok) return false;
    if (tok.type === TokenType.KEYWORD) {
      return C_TYPE_SPECIFIERS.has(tok.value) || C_TYPE_QUALIFIERS.has(tok.value);
    }
    if (tok.type === TokenType.IDENTIFIER) {
      return this.customTypes.has(tok.value);
    }
    return false;
  }

  parseTypeSpecifier() {
    const startTok = this.peek();
    const qualifiers = [];
    let baseTypeName = 'int';

    // Consume qualifiers like const, static, extern
    while (this.check(TokenType.KEYWORD) && C_TYPE_QUALIFIERS.has(this.peek().value)) {
      qualifiers.push(this.advance().value);
    }

    // Base type (struct foo, unsigned int, or simple int)
    if (this.isStructOrUnionOrEnumStart()) {
      const kind = this.advance().value;
      let structName = '';
      if (this.check(TokenType.IDENTIFIER)) {
        structName = this.advance().value;
      }
      baseTypeName = `${kind} ${structName}`.trim();
    } else if (this.isTypeSpecifier()) {
      baseTypeName = this.advance().value;
      // Handle "unsigned int", "long long", etc.
      while (this.isTypeSpecifier() && this.peek().value !== '{' && this.peek().value !== ';' && this.peek().value !== '(') {
        baseTypeName += ' ' + this.advance().value;
      }
    } else {
      this.recordError(`Expected type specifier, found '${this.peek().value}'`, this.peek());
      this.advance();
    }

    // Pointer asterisks
    let pointerLevel = 0;
    while (this.match(TokenType.OPERATOR, '*')) {
      pointerLevel++;
      // Handle const after pointer, e.g. int * const p
      while (this.check(TokenType.KEYWORD) && C_TYPE_QUALIFIERS.has(this.peek().value)) {
        qualifiers.push(this.advance().value);
      }
    }

    return AST.typeSpecifier(baseTypeName, qualifiers, pointerLevel > 0, pointerLevel, {
      line: startTok.line,
      col: startTok.col,
      start: startTok.start,
      end: this.peek().end
    });
  }

  parseFunctionOrVariableDeclaration() {
    this.enterNode();
    const startTok = this.peek();
    this.traceGrammar('declaration-or-function');

    const typeSpec = this.parseTypeSpecifier();

    // Check for pointer asterisks attached to declarator instead of type
    let pointerLevel = 0;
    while (this.match(TokenType.OPERATOR, '*')) {
      pointerLevel++;
    }

    if (!this.check(TokenType.IDENTIFIER)) {
      // Possible abstract declarator or error
      const errTok = this.peek();
      this.recordError(`Expected identifier, found '${errTok.value}'`, errTok);
      this.synchronize();
      this.exitNode();
      return null;
    }

    const nameTok = this.advance();
    const name = nameTok.value;

    // Check if this is a function: identifier followed by '('
    if (this.check(TokenType.PUNCTUATOR, '(')) {
      this.traceGrammar('function-definition', name);
      this.advance(); // '('
      const params = this.parseParameterList();
      this.consume(TokenType.PUNCTUATOR, ')', "Expected ')' after parameter list");

      // If followed by '{', it's a function definition body
      if (this.check(TokenType.PUNCTUATOR, '{')) {
        const body = this.parseCompoundStatement();
        this.exitNode();
        return AST.functionDefinition(typeSpec, name, params, body, {
          line: startTok.line,
          col: startTok.col,
          start: startTok.start,
          end: this.peek().end
        });
      }

      // Otherwise function prototype (declaration followed by ';')
      this.consume(TokenType.PUNCTUATOR, ';', "Expected ';' after function declaration");
      this.exitNode();
      return AST.functionDefinition(typeSpec, name, params, null, {
        line: startTok.line,
        col: startTok.col,
        start: startTok.start,
        end: this.peek().end
      });
    }

    // It's a variable declaration: parse array brackets and initializer
    const declarators = [];
    const firstDecl = this.parseDeclaratorTail(name, pointerLevel, startTok);
    declarators.push(firstDecl);

    while (this.match(TokenType.PUNCTUATOR, ',')) {
      let nextPtrLevel = 0;
      while (this.match(TokenType.OPERATOR, '*')) {
        nextPtrLevel++;
      }
      if (this.check(TokenType.IDENTIFIER)) {
        const nextName = this.advance().value;
        declarators.push(this.parseDeclaratorTail(nextName, nextPtrLevel, this.peek()));
      }
    }

    this.consume(TokenType.PUNCTUATOR, ';', "Expected ';' at end of declaration");
    this.exitNode();

    return AST.variableDeclaration(typeSpec, declarators, {
      line: startTok.line,
      col: startTok.col,
      start: startTok.start,
      end: this.peek().end
    });
  }

  parseDeclaratorTail(name, pointerLevel = 0, startTok = null) {
    const locTok = startTok || this.peek();
    const arrayDimensions = [];

    // Array brackets: [10][20]
    while (this.match(TokenType.PUNCTUATOR, '[')) {
      let dimExpr = null;
      if (!this.check(TokenType.PUNCTUATOR, ']')) {
        dimExpr = this.parseExpression();
      }
      this.consume(TokenType.PUNCTUATOR, ']', "Expected ']' in array dimension");
      arrayDimensions.push(dimExpr);
    }

    // Initializer
    let init = null;
    if (this.match(TokenType.OPERATOR, '=')) {
      init = this.parseInitializer();
    }

    return AST.declarator(name, pointerLevel, arrayDimensions, init, {
      line: locTok.line,
      col: locTok.col,
      start: locTok.start,
      end: this.peek().end
    });
  }

  parseDeclarator() {
    let pointerLevel = 0;
    while (this.match(TokenType.OPERATOR, '*')) {
      pointerLevel++;
    }
    if (!this.check(TokenType.IDENTIFIER)) return null;
    const name = this.advance().value;
    return this.parseDeclaratorTail(name, pointerLevel);
  }

  parseInitializer() {
    if (this.match(TokenType.PUNCTUATOR, '{')) {
      const elements = [];
      while (!this.check(TokenType.PUNCTUATOR, '}') && !this.isAtEnd()) {
        elements.push(this.parseInitializer());
        if (!this.match(TokenType.PUNCTUATOR, ',')) break;
      }
      this.consume(TokenType.PUNCTUATOR, '}', "Expected '}' in initializer list");
      return AST.initializerList(elements, { line: this.peek().line, col: this.peek().col });
    }
    return this.parseAssignmentExpression();
  }

  parseParameterList() {
    this.traceGrammar('parameter-list');
    const params = [];
    if (this.check(TokenType.PUNCTUATOR, ')')) {
      return params;
    }

    // Check for "void" only
    if (this.check(TokenType.KEYWORD, 'void') && this.peek(1)?.value === ')') {
      this.advance();
      return params;
    }

    while (!this.check(TokenType.PUNCTUATOR, ')') && !this.isAtEnd()) {
      // Check for ellipsis: ...
      if (this.match(TokenType.OPERATOR, '...')) {
        params.push(AST.parameter(AST.typeSpecifier('...'), '...'));
        break;
      }

      const paramType = this.parseTypeSpecifier();
      let paramName = null;
      if (this.check(TokenType.IDENTIFIER)) {
        paramName = this.advance().value;
      }
      params.push(AST.parameter(paramType, paramName));

      if (!this.match(TokenType.PUNCTUATOR, ',')) break;
    }

    return params;
  }

  parseCompoundStatement() {
    this.enterNode();
    const startTok = this.consume(TokenType.PUNCTUATOR, '{', "Expected '{' to start compound statement");
    this.traceGrammar('compound-statement');
    const body = [];

    while (!this.check(TokenType.PUNCTUATOR, '}') && !this.isAtEnd()) {
      try {
        const stmt = this.parseStatement();
        if (stmt) body.push(stmt);
      } catch (err) {
        this.recordError(err.message || 'Error inside statement block', this.peek());
        this.synchronize();
      }
    }

    this.consume(TokenType.PUNCTUATOR, '}', "Expected '}' to close compound statement");
    this.exitNode();

    return AST.compoundStatement(body, {
      line: startTok?.line || 1,
      col: startTok?.col || 1,
      start: startTok?.start || 0,
      end: this.peek().end
    });
  }

  parseStatement() {
    const tok = this.peek();

    // Check if it's a declaration inside a block (C99 allows variable declarations anywhere)
    if (this.isTypeSpecifier()) {
      return this.parseVariableDeclaration();
    }

    // Nested block
    if (tok.type === TokenType.PUNCTUATOR && tok.value === '{') {
      return this.parseCompoundStatement();
    }

    // Keyword statements
    if (tok.type === TokenType.KEYWORD) {
      switch (tok.value) {
        case 'if': return this.parseIfStatement();
        case 'while': return this.parseWhileStatement();
        case 'do': return this.parseDoWhileStatement();
        case 'for': return this.parseForStatement();
        case 'switch': return this.parseSwitchStatement();
        case 'case': return this.parseCaseStatement();
        case 'default': return this.parseDefaultStatement();
        case 'return': return this.parseReturnStatement();
        case 'break': return this.parseBreakStatement();
        case 'continue': return this.parseContinueStatement();
      }
    }

    // Empty statement ';'
    if (this.match(TokenType.PUNCTUATOR, ';')) {
      return AST.nullStatement({ line: tok.line, col: tok.col, start: tok.start, end: tok.end });
    }

    // Otherwise expression statement
    return this.parseExpressionStatement();
  }

  parseVariableDeclaration() {
    this.enterNode();
    const startTok = this.peek();
    this.traceGrammar('local-variable-declaration');

    const typeSpec = this.parseTypeSpecifier();
    const declarators = [];

    do {
      let pointerLevel = 0;
      while (this.match(TokenType.OPERATOR, '*')) {
        pointerLevel++;
      }
      if (!this.check(TokenType.IDENTIFIER)) {
        this.recordError(`Expected identifier in variable declaration, found '${this.peek().value}'`, this.peek());
        break;
      }
      const name = this.advance().value;
      declarators.push(this.parseDeclaratorTail(name, pointerLevel, startTok));
    } while (this.match(TokenType.PUNCTUATOR, ','));

    this.consume(TokenType.PUNCTUATOR, ';', "Expected ';' after variable declaration");
    this.exitNode();

    return AST.variableDeclaration(typeSpec, declarators, {
      line: startTok.line,
      col: startTok.col,
      start: startTok.start,
      end: this.peek().end
    });
  }

  parseIfStatement() {
    this.enterNode();
    const startTok = this.advance(); // 'if'
    this.traceGrammar('selection-statement', 'if');

    this.consume(TokenType.PUNCTUATOR, '(', "Expected '(' after 'if'");
    const condition = this.parseExpression();
    this.consume(TokenType.PUNCTUATOR, ')', "Expected ')' after condition");

    const thenBranch = this.parseStatement();
    let elseBranch = null;

    if (this.match(TokenType.KEYWORD, 'else')) {
      elseBranch = this.parseStatement();
    }

    this.exitNode();
    return AST.ifStatement(condition, thenBranch, elseBranch, {
      line: startTok.line,
      col: startTok.col,
      start: startTok.start,
      end: this.peek().end
    });
  }

  parseWhileStatement() {
    this.enterNode();
    const startTok = this.advance(); // 'while'
    this.traceGrammar('iteration-statement', 'while');

    this.consume(TokenType.PUNCTUATOR, '(', "Expected '(' after 'while'");
    const condition = this.parseExpression();
    this.consume(TokenType.PUNCTUATOR, ')', "Expected ')' after condition");

    const body = this.parseStatement();
    this.exitNode();

    return AST.whileStatement(condition, body, {
      line: startTok.line,
      col: startTok.col,
      start: startTok.start,
      end: this.peek().end
    });
  }

  parseDoWhileStatement() {
    this.enterNode();
    const startTok = this.advance(); // 'do'
    this.traceGrammar('iteration-statement', 'do-while');

    const body = this.parseStatement();
    this.consume(TokenType.KEYWORD, 'while', "Expected 'while' after 'do' body");
    this.consume(TokenType.PUNCTUATOR, '(', "Expected '(' after 'while'");
    const condition = this.parseExpression();
    this.consume(TokenType.PUNCTUATOR, ')', "Expected ')' after condition");
    this.consume(TokenType.PUNCTUATOR, ';', "Expected ';' after do-while statement");

    this.exitNode();
    return AST.doWhileStatement(body, condition, {
      line: startTok.line,
      col: startTok.col,
      start: startTok.start,
      end: this.peek().end
    });
  }

  parseForStatement() {
    this.enterNode();
    const startTok = this.advance(); // 'for'
    this.traceGrammar('iteration-statement', 'for');

    this.consume(TokenType.PUNCTUATOR, '(', "Expected '(' after 'for'");

    // For initialization: can be variable declaration `int i = 0;` or expression `i = 0;` or empty `;`
    let init = null;
    if (this.isTypeSpecifier()) {
      init = this.parseVariableDeclaration();
    } else if (!this.check(TokenType.PUNCTUATOR, ';')) {
      init = this.parseExpression();
      this.consume(TokenType.PUNCTUATOR, ';', "Expected ';' after for init expression");
    } else {
      this.advance(); // consume ';'
    }

    // For condition
    let condition = null;
    if (!this.check(TokenType.PUNCTUATOR, ';')) {
      condition = this.parseExpression();
    }
    this.consume(TokenType.PUNCTUATOR, ';', "Expected ';' after for condition");

    // For update / increment
    let update = null;
    if (!this.check(TokenType.PUNCTUATOR, ')')) {
      update = this.parseExpression();
    }
    this.consume(TokenType.PUNCTUATOR, ')', "Expected ')' after for clauses");

    const body = this.parseStatement();
    this.exitNode();

    return AST.forStatement(init, condition, update, body, {
      line: startTok.line,
      col: startTok.col,
      start: startTok.start,
      end: this.peek().end
    });
  }

  parseSwitchStatement() {
    this.enterNode();
    const startTok = this.advance(); // 'switch'
    this.traceGrammar('selection-statement', 'switch');

    this.consume(TokenType.PUNCTUATOR, '(', "Expected '(' after 'switch'");
    const discriminant = this.parseExpression();
    this.consume(TokenType.PUNCTUATOR, ')', "Expected ')' after switch expression");

    const body = this.parseStatement();
    this.exitNode();

    return AST.switchStatement(discriminant, body, {
      line: startTok.line,
      col: startTok.col,
      start: startTok.start,
      end: this.peek().end
    });
  }

  parseCaseStatement() {
    const startTok = this.advance(); // 'case'
    this.traceGrammar('labeled-statement', 'case');
    const value = this.parseExpression();
    this.consume(TokenType.OPERATOR, ':', "Expected ':' after case value");
    let statement = null;
    if (!this.check(TokenType.KEYWORD, 'case') && !this.check(TokenType.KEYWORD, 'default') && !this.check(TokenType.PUNCTUATOR, '}')) {
      statement = this.parseStatement();
    }
    return AST.caseStatement(value, statement, {
      line: startTok.line,
      col: startTok.col,
      start: startTok.start,
      end: this.peek().end
    });
  }

  parseDefaultStatement() {
    const startTok = this.advance(); // 'default'
    this.traceGrammar('labeled-statement', 'default');
    this.consume(TokenType.OPERATOR, ':', "Expected ':' after default");
    let statement = null;
    if (!this.check(TokenType.KEYWORD, 'case') && !this.check(TokenType.KEYWORD, 'default') && !this.check(TokenType.PUNCTUATOR, '}')) {
      statement = this.parseStatement();
    }
    return AST.defaultStatement(statement, {
      line: startTok.line,
      col: startTok.col,
      start: startTok.start,
      end: this.peek().end
    });
  }

  parseReturnStatement() {
    this.enterNode();
    const startTok = this.advance(); // 'return'
    this.traceGrammar('jump-statement', 'return');

    let argument = null;
    if (!this.check(TokenType.PUNCTUATOR, ';')) {
      argument = this.parseExpression();
    }
    this.consume(TokenType.PUNCTUATOR, ';', "Expected ';' after return");
    this.exitNode();

    return AST.returnStatement(argument, {
      line: startTok.line,
      col: startTok.col,
      start: startTok.start,
      end: this.peek().end
    });
  }

  parseBreakStatement() {
    const startTok = this.advance();
    this.traceGrammar('jump-statement', 'break');
    this.consume(TokenType.PUNCTUATOR, ';', "Expected ';' after break");
    return AST.breakStatement({ line: startTok.line, col: startTok.col, start: startTok.start, end: this.peek().end });
  }

  parseContinueStatement() {
    const startTok = this.advance();
    this.traceGrammar('jump-statement', 'continue');
    this.consume(TokenType.PUNCTUATOR, ';', "Expected ';' after continue");
    return AST.continueStatement({ line: startTok.line, col: startTok.col, start: startTok.start, end: this.peek().end });
  }

  parseExpressionStatement() {
    this.enterNode();
    const startTok = this.peek();
    const expr = this.parseExpression();
    this.consume(TokenType.PUNCTUATOR, ';', "Expected ';' after expression");
    this.exitNode();
    return AST.expressionStatement(expr, {
      line: startTok.line,
      col: startTok.col,
      start: startTok.start,
      end: this.peek().end
    });
  }

  // ==========================================
  // Pratt / Precedence Climbing Expression Parser
  // ==========================================

  parseExpression() {
    return this.parseCommaExpression();
  }

  parseCommaExpression() {
    let expr = this.parseAssignmentExpression();
    while (this.match(TokenType.PUNCTUATOR, ',')) {
      const right = this.parseAssignmentExpression();
      expr = AST.binaryExpression(',', expr, right, {
        line: expr.loc.line,
        col: expr.loc.col,
        start: expr.loc.start,
        end: right.loc.end
      });
    }
    return expr;
  }

  parseAssignmentExpression() {
    const expr = this.parseConditionalExpression();

    const assignmentOps = ['=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>='];
    if (this.check(TokenType.OPERATOR) && assignmentOps.includes(this.peek().value)) {
      const opTok = this.advance();
      this.traceGrammar('assignment-expression', opTok.value);
      const right = this.parseAssignmentExpression(); // Right-associative
      return AST.assignmentExpression(opTok.value, expr, right, {
        line: expr.loc.line,
        col: expr.loc.col,
        start: expr.loc.start,
        end: right.loc.end
      });
    }

    return expr;
  }

  parseConditionalExpression() {
    let expr = this.parseLogicalOrExpression();

    if (this.match(TokenType.OPERATOR, '?')) {
      this.traceGrammar('conditional-expression', '?');
      const consequent = this.parseExpression();
      this.consume(TokenType.OPERATOR, ':', "Expected ':' in ternary expression");
      const alternate = this.parseConditionalExpression();
      return AST.conditionalExpression(expr, consequent, alternate, {
        line: expr.loc.line,
        col: expr.loc.col,
        start: expr.loc.start,
        end: alternate.loc.end
      });
    }

    return expr;
  }

  parseLogicalOrExpression() {
    let expr = this.parseLogicalAndExpression();
    while (this.match(TokenType.OPERATOR, '||')) {
      const right = this.parseLogicalAndExpression();
      expr = AST.binaryExpression('||', expr, right, {
        line: expr.loc.line,
        col: expr.loc.col,
        start: expr.loc.start,
        end: right.loc.end
      });
    }
    return expr;
  }

  parseLogicalAndExpression() {
    let expr = this.parseBitwiseOrExpression();
    while (this.match(TokenType.OPERATOR, '&&')) {
      const right = this.parseBitwiseOrExpression();
      expr = AST.binaryExpression('&&', expr, right, {
        line: expr.loc.line,
        col: expr.loc.col,
        start: expr.loc.start,
        end: right.loc.end
      });
    }
    return expr;
  }

  parseBitwiseOrExpression() {
    let expr = this.parseBitwiseXorExpression();
    while (this.match(TokenType.OPERATOR, '|')) {
      const right = this.parseBitwiseXorExpression();
      expr = AST.binaryExpression('|', expr, right, {
        line: expr.loc.line,
        col: expr.loc.col,
        start: expr.loc.start,
        end: right.loc.end
      });
    }
    return expr;
  }

  parseBitwiseXorExpression() {
    let expr = this.parseBitwiseAndExpression();
    while (this.match(TokenType.OPERATOR, '^')) {
      const right = this.parseBitwiseAndExpression();
      expr = AST.binaryExpression('^', expr, right, {
        line: expr.loc.line,
        col: expr.loc.col,
        start: expr.loc.start,
        end: right.loc.end
      });
    }
    return expr;
  }

  parseBitwiseAndExpression() {
    let expr = this.parseEqualityExpression();
    while (this.match(TokenType.OPERATOR, '&')) {
      const right = this.parseEqualityExpression();
      expr = AST.binaryExpression('&', expr, right, {
        line: expr.loc.line,
        col: expr.loc.col,
        start: expr.loc.start,
        end: right.loc.end
      });
    }
    return expr;
  }

  parseEqualityExpression() {
    let expr = this.parseRelationalExpression();
    while (this.check(TokenType.OPERATOR, '==') || this.check(TokenType.OPERATOR, '!=')) {
      const op = this.advance().value;
      const right = this.parseRelationalExpression();
      expr = AST.binaryExpression(op, expr, right, {
        line: expr.loc.line,
        col: expr.loc.col,
        start: expr.loc.start,
        end: right.loc.end
      });
    }
    return expr;
  }

  parseRelationalExpression() {
    let expr = this.parseShiftExpression();
    const relOps = ['<', '>', '<=', '>='];
    while (this.check(TokenType.OPERATOR) && relOps.includes(this.peek().value)) {
      const op = this.advance().value;
      const right = this.parseShiftExpression();
      expr = AST.binaryExpression(op, expr, right, {
        line: expr.loc.line,
        col: expr.loc.col,
        start: expr.loc.start,
        end: right.loc.end
      });
    }
    return expr;
  }

  parseShiftExpression() {
    let expr = this.parseAdditiveExpression();
    while (this.check(TokenType.OPERATOR, '<<') || this.check(TokenType.OPERATOR, '>>')) {
      const op = this.advance().value;
      const right = this.parseAdditiveExpression();
      expr = AST.binaryExpression(op, expr, right, {
        line: expr.loc.line,
        col: expr.loc.col,
        start: expr.loc.start,
        end: right.loc.end
      });
    }
    return expr;
  }

  parseAdditiveExpression() {
    let expr = this.parseMultiplicativeExpression();
    while (this.check(TokenType.OPERATOR, '+') || this.check(TokenType.OPERATOR, '-')) {
      const op = this.advance().value;
      const right = this.parseMultiplicativeExpression();
      expr = AST.binaryExpression(op, expr, right, {
        line: expr.loc.line,
        col: expr.loc.col,
        start: expr.loc.start,
        end: right.loc.end
      });
    }
    return expr;
  }

  parseMultiplicativeExpression() {
    let expr = this.parseCastOrUnaryExpression();
    const multOps = ['*', '/', '%'];
    while (this.check(TokenType.OPERATOR) && multOps.includes(this.peek().value)) {
      const op = this.advance().value;
      const right = this.parseCastOrUnaryExpression();
      expr = AST.binaryExpression(op, expr, right, {
        line: expr.loc.line,
        col: expr.loc.col,
        start: expr.loc.start,
        end: right.loc.end
      });
    }
    return expr;
  }

  parseCastOrUnaryExpression() {
    // Check for cast expression: (type)expr
    if (this.check(TokenType.PUNCTUATOR, '(') && this.isTypeSpecifier(this.peek(1))) {
      const startTok = this.advance(); // '('
      const targetType = this.parseTypeSpecifier();
      this.consume(TokenType.PUNCTUATOR, ')', "Expected ')' in cast expression");
      const expr = this.parseCastOrUnaryExpression();
      return AST.castExpression(targetType, expr, {
        line: startTok.line,
        col: startTok.col,
        start: startTok.start,
        end: expr.loc.end
      });
    }

    return this.parseUnaryExpression();
  }

  parseUnaryExpression() {
    const tok = this.peek();

    // Prefix increment / decrement
    if (this.match(TokenType.OPERATOR, '++') || this.match(TokenType.OPERATOR, '--')) {
      const op = this.tokens[this.pos - 1].value;
      const arg = this.parseUnaryExpression();
      return AST.updateExpression(op, arg, true, {
        line: tok.line,
        col: tok.col,
        start: tok.start,
        end: arg.loc.end
      });
    }

    // Unary operators: +, -, !, ~, *, &
    const unaryOps = ['+', '-', '!', '~', '*', '&'];
    if (this.check(TokenType.OPERATOR) && unaryOps.includes(tok.value)) {
      const op = this.advance().value;
      const arg = this.parseCastOrUnaryExpression();
      return AST.unaryExpression(op, arg, true, {
        line: tok.line,
        col: tok.col,
        start: tok.start,
        end: arg.loc.end
      });
    }

    // sizeof operator
    if (this.match(TokenType.KEYWORD, 'sizeof')) {
      const startTok = this.tokens[this.pos - 1];
      if (this.check(TokenType.PUNCTUATOR, '(') && this.isTypeSpecifier(this.peek(1))) {
        this.advance(); // '('
        const targetType = this.parseTypeSpecifier();
        this.consume(TokenType.PUNCTUATOR, ')', "Expected ')' after sizeof type");
        return AST.sizeofExpression(targetType, true, {
          line: startTok.line,
          col: startTok.col,
          start: startTok.start,
          end: this.peek().end
        });
      }
      const targetExpr = this.parseUnaryExpression();
      return AST.sizeofExpression(targetExpr, false, {
        line: startTok.line,
        col: startTok.col,
        start: startTok.start,
        end: targetExpr.loc.end
      });
    }

    return this.parsePostfixExpression();
  }

  parsePostfixExpression() {
    let expr = this.parsePrimaryExpression();

    while (true) {
      // Function call: f(...)
      if (this.match(TokenType.PUNCTUATOR, '(')) {
        const args = [];
        if (!this.check(TokenType.PUNCTUATOR, ')')) {
          do {
            args.push(this.parseAssignmentExpression());
          } while (this.match(TokenType.PUNCTUATOR, ','));
        }
        this.consume(TokenType.PUNCTUATOR, ')', "Expected ')' after function arguments");
        expr = AST.callExpression(expr, args, {
          line: expr.loc.line,
          col: expr.loc.col,
          start: expr.loc.start,
          end: this.peek().end
        });
      }
      // Array subscript: a[i]
      else if (this.match(TokenType.PUNCTUATOR, '[')) {
        const index = this.parseExpression();
        this.consume(TokenType.PUNCTUATOR, ']', "Expected ']' after array index");
        expr = AST.subscriptExpression(expr, index, {
          line: expr.loc.line,
          col: expr.loc.col,
          start: expr.loc.start,
          end: this.peek().end
        });
      }
      // Member access: . or ->
      else if (this.match(TokenType.OPERATOR, '.') || this.match(TokenType.OPERATOR, '->')) {
        const op = this.tokens[this.pos - 1].value;
        const isArrow = op === '->';
        if (!this.check(TokenType.IDENTIFIER)) {
          this.recordError("Expected member identifier after '.' or '->'", this.peek());
          break;
        }
        const member = this.advance().value;
        expr = AST.memberExpression(expr, member, isArrow, {
          line: expr.loc.line,
          col: expr.loc.col,
          start: expr.loc.start,
          end: this.peek().end
        });
      }
      // Postfix increment / decrement: x++, x--
      else if (this.match(TokenType.OPERATOR, '++') || this.match(TokenType.OPERATOR, '--')) {
        const op = this.tokens[this.pos - 1].value;
        expr = AST.updateExpression(op, expr, false, {
          line: expr.loc.line,
          col: expr.loc.col,
          start: expr.loc.start,
          end: this.tokens[this.pos - 1].end
        });
      } else {
        break;
      }
    }

    return expr;
  }

  parsePrimaryExpression() {
    const tok = this.peek();

    // Identifier
    if (tok.type === TokenType.IDENTIFIER) {
      this.advance();
      return AST.identifier(tok.value, {
        line: tok.line,
        col: tok.col,
        start: tok.start,
        end: tok.end
      });
    }

    // Number literal
    if (tok.type === TokenType.NUMBER) {
      this.advance();
      return AST.numericLiteral(tok.extra?.isFloat ? parseFloat(tok.value) : parseInt(tok.value, 10), tok.value, {
        line: tok.line,
        col: tok.col,
        start: tok.start,
        end: tok.end
      });
    }

    // String literal (handles string concatenation "a" "b")
    if (tok.type === TokenType.STRING) {
      this.advance();
      let fullStr = tok.value;
      while (this.check(TokenType.STRING)) {
        fullStr += this.advance().value;
      }
      return AST.stringLiteral(fullStr, {
        line: tok.line,
        col: tok.col,
        start: tok.start,
        end: this.tokens[this.pos - 1].end
      });
    }

    // Char literal
    if (tok.type === TokenType.CHAR) {
      this.advance();
      return AST.charLiteral(tok.value, {
        line: tok.line,
        col: tok.col,
        start: tok.start,
        end: tok.end
      });
    }

    // Parenthesized expression: (expr)
    if (this.match(TokenType.PUNCTUATOR, '(')) {
      const expr = this.parseExpression();
      this.consume(TokenType.PUNCTUATOR, ')', "Expected ')' after parenthesized expression");
      return expr;
    }

    // Syntax error fallback
    this.recordError(`Unexpected token '${tok.value}' in expression`, tok);
    this.advance();
    return AST.errorNode(`Unexpected token '${tok.value}'`, tok.value, {
      line: tok.line,
      col: tok.col,
      start: tok.start,
      end: tok.end
    });
  }
}

/**
 * C Language Symbol Table & Semantic Scope Analyzer
 * Tracks scopes, identifier declarations, types, and symbol references.
 */

import { ASTNodeType } from './ast.js';

export class Scope {
  constructor(name, parent = null, level = 0) {
    this.name = name;
    this.parent = parent;
    this.level = level;
    this.symbols = new Map();
    this.children = [];
    if (parent) {
      parent.children.push(this);
    }
  }

  define(name, symbol) {
    this.symbols.set(name, symbol);
  }

  resolve(name) {
    if (this.symbols.has(name)) {
      return this.symbols.get(name);
    }
    if (this.parent) {
      return this.parent.resolve(name);
    }
    return null;
  }
}

export class SymbolAnalyzer {
  constructor(ast) {
    this.ast = ast;
    this.globalScope = new Scope('Global', null, 0);
    this.currentScope = this.globalScope;
    this.allSymbols = [];
    this.scopeTree = [this.globalScope];
    this.warnings = [];
    this.references = [];
  }

  analyze() {
    this.walk(this.ast);
    return {
      globalScope: this.globalScope,
      allSymbols: this.allSymbols,
      warnings: this.warnings,
      references: this.references
    };
  }

  enterScope(name) {
    const newScope = new Scope(name, this.currentScope, this.currentScope.level + 1);
    this.currentScope = newScope;
    this.scopeTree.push(newScope);
    return newScope;
  }

  exitScope() {
    if (this.currentScope.parent) {
      this.currentScope = this.currentScope.parent;
    }
  }

  recordSymbol(name, kind, type, loc) {
    if (this.currentScope.symbols.has(name)) {
      this.warnings.push({
        message: `Redeclaration of symbol '${name}' in same scope`,
        line: loc.line,
        col: loc.col
      });
    }

    const symbol = {
      name,
      kind,
      type: typeof type === 'string' ? type : (type?.name || 'unknown'),
      scope: this.currentScope.name,
      level: this.currentScope.level,
      line: loc.line,
      col: loc.col,
      usages: 0
    };

    this.currentScope.define(name, symbol);
    this.allSymbols.push(symbol);
  }

  recordUsage(name, loc) {
    const sym = this.currentScope.resolve(name);
    if (sym) {
      sym.usages++;
      this.references.push({
        name,
        targetSymbol: sym,
        line: loc.line,
        col: loc.col
      });
    } else {
      // Could be library function like printf, scanf, malloc
      const stdLib = ['printf', 'scanf', 'malloc', 'free', 'exit', 'strlen', 'strcpy', 'memcpy', 'memset', 'puts', 'getchar', 'putchar', 'fopen', 'fclose', 'NULL'];
      if (!stdLib.includes(name)) {
        this.warnings.push({
          message: `Reference to undeclared identifier '${name}'`,
          line: loc.line,
          col: loc.col
        });
      }
    }
  }

  walk(node) {
    if (!node) return;

    switch (node.type) {
      case ASTNodeType.TRANSLATION_UNIT:
        if (node.declarations) {
          for (const decl of node.declarations) {
            this.walk(decl);
          }
        }
        break;

      case ASTNodeType.FUNCTION_DEFINITION: {
        const retType = node.returnType?.name || 'void';
        this.recordSymbol(node.name, 'Function', `${retType} (...)`, node.loc);

        this.enterScope(`Function: ${node.name}`);

        if (node.params && Array.isArray(node.params)) {
          for (const param of node.params) {
            if (param.name && param.name !== '...') {
              const pType = param.paramType?.name || 'int';
              this.recordSymbol(param.name, 'Parameter', pType, param.loc);
            }
          }
        }

        if (node.body) {
          this.walk(node.body);
        }

        this.exitScope();
        break;
      }

      case ASTNodeType.VARIABLE_DECLARATION: {
        const typeName = node.typeSpec?.name || 'int';
        if (node.declarators && Array.isArray(node.declarators)) {
          for (const decl of node.declarators) {
            let fullType = typeName;
            if (decl.pointerLevel > 0) {
              fullType += ' ' + '*'.repeat(decl.pointerLevel);
            }
            if (decl.arrayDimensions && decl.arrayDimensions.length > 0) {
              fullType += '[]'.repeat(decl.arrayDimensions.length);
            }
            this.recordSymbol(decl.name, 'Variable', fullType, decl.loc);

            if (decl.init) {
              this.walk(decl.init);
            }
          }
        }
        break;
      }

      case ASTNodeType.STRUCT_DECLARATION: {
        const sName = node.name || (node.typedefAlias ? `typedef ${node.typedefAlias}` : 'anonymous');
        this.recordSymbol(sName, 'Struct', 'struct', node.loc);
        if (node.members) {
          for (const m of node.members) {
            this.walk(m);
          }
        }
        break;
      }

      case ASTNodeType.TYPEDEF_DECLARATION: {
        this.recordSymbol(node.alias, 'Typedef', node.baseType?.name || 'type', node.loc);
        break;
      }

      case ASTNodeType.COMPOUND_STATEMENT: {
        // Only create a new block scope if not already directly inside function entry
        const isFuncEntry = this.currentScope.name.startsWith('Function: ') && this.currentScope.symbols.size <= 5;
        if (!isFuncEntry) {
          this.enterScope(`Block (L${node.loc.line})`);
        }

        if (node.body && Array.isArray(node.body)) {
          for (const stmt of node.body) {
            this.walk(stmt);
          }
        }

        if (!isFuncEntry) {
          this.exitScope();
        }
        break;
      }

      case ASTNodeType.IDENTIFIER:
        this.recordUsage(node.name, node.loc);
        break;

      default:
        // Traverse all child nodes
        for (const child of node.getChildren()) {
          this.walk(child.node);
        }
        break;
    }
  }
}

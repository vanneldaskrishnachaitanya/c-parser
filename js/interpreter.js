/**
 * C Language AST Interpreter & Runtime Execution Engine
 * Executes C code AST in the browser and captures console output (printf, puts, loops, recursion, structs, pointers).
 */

import { ASTNodeType } from './ast.js';

export class CInterpreter {
  constructor(ast) {
    this.ast = ast;
    this.stdout = [];
    this.globals = new Map();
    this.functions = new Map();
    this.structDefs = new Map();
    this.stepCount = 0;
    this.maxSteps = 100000; // Protection against infinite loops
    this.callDepth = 0;
    this.maxCallDepth = 1000; // Protection against stack overflow
    this.memory = new Map(); // Simulated heap/pointers
    this.nextAddress = 1000;
  }

  log(text) {
    this.stdout.push(String(text));
  }

  run() {
    this.stdout = [];
    this.globals.clear();
    this.functions.clear();
    this.structDefs.clear();
    this.memory.clear();
    this.stepCount = 0;
    this.callDepth = 0;
    this.nextAddress = 1000;

    const startTime = performance.now();

    try {
      if (!this.ast || this.ast.type !== ASTNodeType.TRANSLATION_UNIT) {
        throw new Error('Invalid or empty AST translation unit.');
      }

      // Pass 1: Register all declarations, functions, and structs
      for (const decl of this.ast.declarations) {
        this.registerDeclaration(decl);
      }

      // Check for main function
      const mainFunc = this.functions.get('main');
      if (!mainFunc) {
        throw new Error("No 'main' function found. C programs require an entry point: 'int main()' or 'void main()'.");
      }

      // Execute main()
      const exitCode = this.callFunction(mainFunc, []);
      const endTime = performance.now();

      return {
        success: true,
        output: this.stdout.join(''),
        exitCode: exitCode !== undefined ? exitCode : 0,
        executionTimeMs: (endTime - startTime).toFixed(2),
        error: null
      };
    } catch (err) {
      const endTime = performance.now();
      return {
        success: false,
        output: this.stdout.join(''),
        exitCode: -1,
        executionTimeMs: (endTime - startTime).toFixed(2),
        error: err.message || String(err)
      };
    }
  }

  registerDeclaration(decl) {
    if (!decl) return;

    switch (decl.type) {
      case ASTNodeType.FUNCTION_DEFINITION:
        this.functions.set(decl.name, decl);
        break;

      case ASTNodeType.VARIABLE_DECLARATION:
        if (decl.declarators) {
          for (const d of decl.declarators) {
            let val = 0;
            if (d.init) {
              val = this.evaluateExpression(d.init, this.globals);
            }
            this.globals.set(d.name, val);
          }
        }
        break;

      case ASTNodeType.STRUCT_DECLARATION: {
        const memberNames = [];
        if (decl.members) {
          for (const m of decl.members) {
            if (m.declarators) {
              for (const d of m.declarators) {
                if (d.name) memberNames.push(d.name);
              }
            }
          }
        }
        decl.__memberNames = memberNames;
        if (decl.name) {
          this.structDefs.set(decl.name, decl);
          this.structDefs.set(`struct ${decl.name}`, decl);
        }
        if (decl.typedefAlias) {
          this.structDefs.set(decl.typedefAlias, decl);
        }
        break;
      }

      case ASTNodeType.TYPEDEF_DECLARATION:
        if (decl.alias && decl.baseType) {
          this.structDefs.set(decl.alias, decl.baseType);
        }
        break;

      default:
        break;
    }
  }

  callFunction(funcNode, args) {
    this.callDepth++;
    if (this.callDepth > this.maxCallDepth) {
      throw new Error(`Stack overflow: maximum recursion depth (${this.maxCallDepth}) exceeded.`);
    }

    const localScope = new Map();

    // Map parameters to arguments
    if (funcNode.params && Array.isArray(funcNode.params)) {
      funcNode.params.forEach((param, idx) => {
        if (param.name && param.name !== '...') {
          localScope.set(param.name, args[idx] !== undefined ? args[idx] : 0);
        }
      });
    }

    let returnValue = 0;

    if (funcNode.body) {
      const result = this.executeStatement(funcNode.body, localScope);
      if (result && result.__return !== undefined) {
        returnValue = result.__return;
      }
    }

    this.callDepth--;
    return returnValue;
  }

  executeStatement(stmt, scope) {
    if (!stmt) return null;

    this.stepCount++;
    if (this.stepCount > this.maxSteps) {
      throw new Error(`Execution halted: exceeded maximum step limit (${this.maxSteps}). Check for infinite loops.`);
    }

    switch (stmt.type) {
      case ASTNodeType.COMPOUND_STATEMENT: {
        const blockScope = new Map(scope);
        if (stmt.body) {
          for (const s of stmt.body) {
            const res = this.executeStatement(s, blockScope);
            // Reflect mutations back to parent scope
            for (const [k, v] of blockScope.entries()) {
              if (scope.has(k)) {
                scope.set(k, v);
              }
            }
            if (res && (res.__return !== undefined || res.__break || res.__continue)) {
              return res;
            }
          }
        }
        return null;
      }

      case ASTNodeType.VARIABLE_DECLARATION: {
        const typeName = stmt.typeSpec?.name || '';
        const structDef = this.structDefs.get(typeName) || this.structDefs.get(`struct ${typeName}`);
        const memberNames = structDef?.__memberNames || [];

        if (stmt.declarators) {
          for (const d of stmt.declarators) {
            let val = 0;
            if (d.init) {
              if (d.init.type === ASTNodeType.INITIALIZER_LIST) {
                const arr = d.init.elements.map(e => this.evaluateExpression(e, scope));
                const structObj = {};
                arr.forEach((item, idx) => {
                  structObj[idx] = item;
                  if (memberNames[idx]) {
                    structObj[memberNames[idx]] = item;
                  }
                });
                val = structObj;
              } else {
                val = this.evaluateExpression(d.init, scope);
              }
            }
            scope.set(d.name, val);
          }
        }
        return null;
      }

      case ASTNodeType.EXPRESSION_STATEMENT: {
        this.evaluateExpression(stmt.expression, scope);
        return null;
      }

      case ASTNodeType.IF_STATEMENT: {
        const cond = this.evaluateExpression(stmt.condition, scope);
        if (this.isTruthy(cond)) {
          return this.executeStatement(stmt.thenStatement, scope);
        } else if (stmt.elseStatement) {
          return this.executeStatement(stmt.elseStatement, scope);
        }
        return null;
      }

      case ASTNodeType.WHILE_STATEMENT: {
        while (this.isTruthy(this.evaluateExpression(stmt.condition, scope))) {
          const res = this.executeStatement(stmt.body, scope);
          if (res) {
            if (res.__return !== undefined) return res;
            if (res.__break) break;
            if (res.__continue) continue;
          }
        }
        return null;
      }

      case ASTNodeType.DO_WHILE_STATEMENT: {
        do {
          const res = this.executeStatement(stmt.body, scope);
          if (res) {
            if (res.__return !== undefined) return res;
            if (res.__break) break;
            if (res.__continue) continue;
          }
        } while (this.isTruthy(this.evaluateExpression(stmt.condition, scope)));
        return null;
      }

      case ASTNodeType.FOR_STATEMENT: {
        const forScope = new Map(scope);
        if (stmt.init) {
          if (stmt.init.type === ASTNodeType.VARIABLE_DECLARATION) {
            this.executeStatement(stmt.init, forScope);
          } else {
            this.evaluateExpression(stmt.init, forScope);
          }
        }

        while (!stmt.condition || this.isTruthy(this.evaluateExpression(stmt.condition, forScope))) {
          const res = this.executeStatement(stmt.body, forScope);
          for (const [k, v] of forScope.entries()) {
            if (scope.has(k)) scope.set(k, v);
          }
          if (res) {
            if (res.__return !== undefined) return res;
            if (res.__break) break;
            if (res.__continue) {
              if (stmt.update) this.evaluateExpression(stmt.update, forScope);
              continue;
            }
          }
          if (stmt.update) {
            this.evaluateExpression(stmt.update, forScope);
          }
        }
        return null;
      }

      case ASTNodeType.SWITCH_STATEMENT: {
        const val = this.evaluateExpression(stmt.discriminant, scope);
        let matched = false;
        if (stmt.body && stmt.body.body) {
          for (const subStmt of stmt.body.body) {
            if (subStmt.type === ASTNodeType.CASE_STATEMENT) {
              const caseVal = this.evaluateExpression(subStmt.value, scope);
              if (val === caseVal || matched) {
                matched = true;
                if (subStmt.statement) {
                  const res = this.executeStatement(subStmt.statement, scope);
                  if (res && res.__break) break;
                  if (res && res.__return !== undefined) return res;
                }
              }
            } else if (subStmt.type === ASTNodeType.DEFAULT_STATEMENT) {
              matched = true;
              if (subStmt.statement) {
                const res = this.executeStatement(subStmt.statement, scope);
                if (res && res.__break) break;
                if (res && res.__return !== undefined) return res;
              }
            } else if (matched) {
              const res = this.executeStatement(subStmt, scope);
              if (res && res.__break) break;
              if (res && res.__return !== undefined) return res;
            }
          }
        }
        return null;
      }

      case ASTNodeType.RETURN_STATEMENT: {
        const retVal = stmt.argument ? this.evaluateExpression(stmt.argument, scope) : 0;
        return { __return: retVal };
      }

      case ASTNodeType.BREAK_STATEMENT:
        return { __break: true };

      case ASTNodeType.CONTINUE_STATEMENT:
        return { __continue: true };

      case ASTNodeType.NULL_STATEMENT:
        return null;

      default:
        return null;
    }
  }

  evaluateExpression(expr, scope) {
    if (!expr) return 0;

    switch (expr.type) {
      case ASTNodeType.NUMERIC_LITERAL:
        return Number(expr.value);

      case ASTNodeType.STRING_LITERAL: {
        let s = expr.value;
        if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
          s = s.substring(1, s.length - 1);
        }
        return s.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\\\/g, '\\').replace(/\\"/g, '"');
      }

      case ASTNodeType.CHAR_LITERAL: {
        let ch = expr.value;
        if (ch.startsWith("'") && ch.endsWith("'")) ch = ch.substring(1, ch.length - 1);
        return ch.charCodeAt(0) || 0;
      }

      case ASTNodeType.IDENTIFIER: {
        if (expr.name === 'NULL') return null;
        if (scope.has(expr.name)) return scope.get(expr.name);
        if (this.globals.has(expr.name)) return this.globals.get(expr.name);
        return 0;
      }

      case ASTNodeType.BINARY_EXPRESSION: {
        const left = this.evaluateExpression(expr.left, scope);
        const right = this.evaluateExpression(expr.right, scope);

        switch (expr.operator) {
          case '+': return left + right;
          case '-': return left - right;
          case '*': return left * right;
          case '/': return right !== 0 ? Math.trunc(left / right) : 0;
          case '%': return right !== 0 ? (left % right) : 0;
          case '==': return (left === right || (this.isNullish(left) && this.isNullish(right))) ? 1 : 0;
          case '!=': return (left !== right && !(this.isNullish(left) && this.isNullish(right))) ? 1 : 0;
          case '<': return left < right ? 1 : 0;
          case '<=': return left <= right ? 1 : 0;
          case '>': return left > right ? 1 : 0;
          case '>=': return left >= right ? 1 : 0;
          case '&&': return (this.isTruthy(left) && this.isTruthy(right)) ? 1 : 0;
          case '||': return (this.isTruthy(left) || this.isTruthy(right)) ? 1 : 0;
          case '&': return left & right;
          case '|': return left | right;
          case '^': return left ^ right;
          case '<<': return left << right;
          case '>>': return left >> right;
          case ',': return right;
          default: return 0;
        }
      }

      case ASTNodeType.UNARY_EXPRESSION: {
        if (expr.operator === '&') {
          const addr = this.nextAddress++;
          const targetName = expr.argument.name;
          const val = scope.has(targetName) ? scope.get(targetName) : this.globals.get(targetName);
          this.memory.set(addr, { targetName, val, scope });
          return addr;
        }

        if (expr.operator === '*') {
          const ptr = this.evaluateExpression(expr.argument, scope);
          if (this.memory.has(ptr)) {
            const mem = this.memory.get(ptr);
            return mem.val;
          }
          return 0;
        }

        const arg = this.evaluateExpression(expr.argument, scope);
        switch (expr.operator) {
          case '-': return -arg;
          case '+': return +arg;
          case '!': return this.isTruthy(arg) ? 0 : 1;
          case '~': return ~arg;
          default: return arg;
        }
      }

      case ASTNodeType.UPDATE_EXPRESSION: {
        const targetName = expr.argument.name;
        const current = scope.has(targetName) ? scope.get(targetName) : (this.globals.get(targetName) || 0);
        const nextVal = expr.operator === '++' ? current + 1 : current - 1;

        if (scope.has(targetName)) scope.set(targetName, nextVal);
        else this.globals.set(targetName, nextVal);

        return expr.prefix ? nextVal : current;
      }

      case ASTNodeType.ASSIGNMENT_EXPRESSION: {
        const rightVal = this.evaluateExpression(expr.right, scope);

        if (expr.left.type === ASTNodeType.IDENTIFIER) {
          const name = expr.left.name;
          let finalVal = rightVal;
          if (expr.operator !== '=') {
            const cur = scope.has(name) ? scope.get(name) : (this.globals.get(name) || 0);
            if (expr.operator === '+=') finalVal = cur + rightVal;
            else if (expr.operator === '-=') finalVal = cur - rightVal;
            else if (expr.operator === '*=') finalVal = cur * rightVal;
            else if (expr.operator === '/=') finalVal = rightVal !== 0 ? Math.trunc(cur / rightVal) : 0;
            else if (expr.operator === '%=') finalVal = cur % rightVal;
            else if (expr.operator === '&=') finalVal = cur & rightVal;
            else if (expr.operator === '|=') finalVal = cur | rightVal;
            else if (expr.operator === '^=') finalVal = cur ^ rightVal;
          }

          if (scope.has(name)) scope.set(name, finalVal);
          else this.globals.set(name, finalVal);

          return finalVal;
        }

        if (expr.left.type === ASTNodeType.UNARY_EXPRESSION && expr.left.operator === '*') {
          const ptr = this.evaluateExpression(expr.left.argument, scope);
          if (this.memory.has(ptr)) {
            const mem = this.memory.get(ptr);
            mem.val = rightVal;
            if (mem.targetName && mem.scope) {
              mem.scope.set(mem.targetName, rightVal);
            }
          }
          return rightVal;
        }

        if (expr.left.type === ASTNodeType.MEMBER_EXPRESSION) {
          const obj = this.evaluateExpression(expr.left.object, scope);
          if (obj && typeof obj === 'object') {
            obj[expr.left.property] = rightVal;
          }
          return rightVal;
        }

        if (expr.left.type === ASTNodeType.SUBSCRIPT_EXPRESSION) {
          const arr = this.evaluateExpression(expr.left.object, scope);
          const idx = this.evaluateExpression(expr.left.index, scope);
          if (Array.isArray(arr) || typeof arr === 'object') {
            arr[idx] = rightVal;
          }
          return rightVal;
        }

        return rightVal;
      }

      case ASTNodeType.CONDITIONAL_EXPRESSION: {
        const cond = this.evaluateExpression(expr.condition, scope);
        return this.isTruthy(cond)
          ? this.evaluateExpression(expr.consequent, scope)
          : this.evaluateExpression(expr.alternate, scope);
      }

      case ASTNodeType.CALL_EXPRESSION: {
        const funcName = expr.callee.name;
        const evaluatedArgs = expr.arguments ? expr.arguments.map(a => this.evaluateExpression(a, scope)) : [];

        if (funcName === 'printf') {
          return this.builtinPrintf(evaluatedArgs);
        } else if (funcName === 'puts') {
          const str = String(evaluatedArgs[0] || '');
          this.log(str + '\n');
          return str.length + 1;
        } else if (funcName === 'putchar') {
          const ch = String.fromCharCode(evaluatedArgs[0] || 0);
          this.log(ch);
          return evaluatedArgs[0];
        } else if (funcName === 'malloc') {
          const addr = this.nextAddress++;
          const bytes = evaluatedArgs[0] || 1;
          const block = new Array(bytes).fill(0);
          this.memory.set(addr, { val: block, bytes });
          return addr;
        } else if (funcName === 'free') {
          const addr = evaluatedArgs[0];
          this.memory.delete(addr);
          return 0;
        }

        const targetFunc = this.functions.get(funcName);
        if (targetFunc) {
          return this.callFunction(targetFunc, evaluatedArgs);
        }

        return 0;
      }

      case ASTNodeType.INITIALIZER_LIST: {
        const arr = expr.elements.map(e => this.evaluateExpression(e, scope));
        const obj = {};
        arr.forEach((item, idx) => {
          obj[idx] = item;
        });
        return obj;
      }

      case ASTNodeType.MEMBER_EXPRESSION: {
        const obj = this.evaluateExpression(expr.object, scope);
        const prop = expr.property;

        let target = obj;
        if (expr.isArrow) {
          if (typeof obj === 'number' && this.memory.has(obj)) {
            target = this.memory.get(obj).val;
          }
        }

        if (target && typeof target === 'object') {
          if (target[prop] !== undefined) return target[prop];
          if (prop === 'data' && target[0] !== undefined) return target[0];
          if (prop === 'next' && target[1] !== undefined) return target[1];
          if (prop === 'val' && target[0] !== undefined) return target[0];
          if (prop === 'x' && target[0] !== undefined) return target[0];
          if (prop === 'y' && target[1] !== undefined) return target[1];
        }
        return 0;
      }

      case ASTNodeType.SUBSCRIPT_EXPRESSION: {
        const arr = this.evaluateExpression(expr.object, scope);
        const idx = this.evaluateExpression(expr.index, scope);
        if (arr && typeof arr === 'object') {
          return arr[idx] !== undefined ? arr[idx] : 0;
        }
        return 0;
      }

      case ASTNodeType.CAST_EXPRESSION:
        return this.evaluateExpression(expr.expression, scope);

      case ASTNodeType.SIZEOF_EXPRESSION:
        return 4;

      default:
        return 0;
    }
  }

  builtinPrintf(args) {
    if (!args || args.length === 0) return 0;
    let format = String(args[0]);
    let argIndex = 1;

    const formatted = format.replace(/%(\.\d+)?([discfxXp%])/g, (match, precision, specifier) => {
      if (specifier === '%') return '%';
      if (argIndex >= args.length) return match;

      const argVal = args[argIndex++];
      switch (specifier) {
        case 'd':
        case 'i':
          return Math.trunc(Number(argVal));
        case 's':
          return String(argVal);
        case 'c':
          return typeof argVal === 'number' ? String.fromCharCode(argVal) : String(argVal)[0] || '';
        case 'f': {
          const num = Number(argVal);
          if (precision) {
            const decimals = parseInt(precision.substring(1), 10);
            return num.toFixed(decimals);
          }
          return num.toFixed(6);
        }
        case 'x':
          return Number(argVal).toString(16);
        case 'X':
          return Number(argVal).toString(16).toUpperCase();
        case 'p':
          return '0x' + Number(argVal).toString(16).padStart(8, '0');
        default:
          return String(argVal);
      }
    });

    this.log(formatted);
    return formatted.length;
  }

  isNullish(val) {
    return val === null || val === undefined || val === 0;
  }

  isTruthy(val) {
    if (val === null || val === undefined) return false;
    if (typeof val === 'boolean') return val;
    if (typeof val === 'number') return val !== 0;
    if (typeof val === 'string') return val.length > 0;
    return true;
  }
}

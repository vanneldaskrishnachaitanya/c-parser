/**
 * C Language Control Flow Graph (CFG) Generator
 * Constructs basic blocks and directed execution flow edges from C functions.
 */

import { ASTNodeType } from './ast.js';

export class CFGBlock {
  constructor(id, label, type = 'normal') {
    this.id = id;
    this.label = label;
    this.type = type; // entry, exit, condition, normal, loop
    this.instructions = [];
    this.successors = []; // [{ toBlock, label, type }]
  }

  addInstruction(text) {
    if (text) this.instructions.push(text);
  }

  addEdge(targetBlock, label = '', edgeType = 'normal') {
    this.successors.push({
      target: targetBlock,
      label,
      edgeType // 'true', 'false', 'loop', 'normal', 'return'
    });
  }
}

export class CFGBuilder {
  constructor(functionNode) {
    this.func = functionNode;
    this.blockCounter = 1;
    this.blocks = [];
    this.entryBlock = null;
    this.exitBlock = null;
  }

  createBlock(label, type = 'normal') {
    const id = `B${this.blockCounter++}`;
    const block = new CFGBlock(id, label, type);
    this.blocks.push(block);
    return block;
  }

  build() {
    if (!this.func || this.func.type !== ASTNodeType.FUNCTION_DEFINITION) {
      return null;
    }

    this.entryBlock = this.createBlock(`Entry: ${this.func.name}()`, 'entry');
    this.exitBlock = this.createBlock(`Exit: ${this.func.name}()`, 'exit');

    let currentBlock = this.createBlock('Function Body');
    this.entryBlock.addEdge(currentBlock);

    if (this.func.body && this.func.body.body) {
      currentBlock = this.processStatements(this.func.body.body, currentBlock);
    }

    if (currentBlock && !currentBlock.successors.some(e => e.target === this.exitBlock)) {
      currentBlock.addEdge(this.exitBlock, 'Return');
    }

    return {
      functionName: this.func.name,
      blocks: this.blocks,
      entryBlock: this.entryBlock,
      exitBlock: this.exitBlock
    };
  }

  processStatements(statements, currentBlock) {
    let curr = currentBlock;

    for (const stmt of statements) {
      if (!curr) curr = this.createBlock('Block');

      switch (stmt.type) {
        case ASTNodeType.VARIABLE_DECLARATION: {
          const names = stmt.declarators.map(d => d.name).join(', ');
          curr.addInstruction(`${stmt.typeSpec?.name || 'var'} ${names}`);
          break;
        }

        case ASTNodeType.EXPRESSION_STATEMENT: {
          curr.addInstruction(this.exprToString(stmt.expression));
          break;
        }

        case ASTNodeType.IF_STATEMENT: {
          const condStr = this.exprToString(stmt.condition);
          const condBlock = this.createBlock(`if (${condStr})`, 'condition');
          curr.addEdge(condBlock);

          const thenBlock = this.createBlock('Then Branch');
          condBlock.addEdge(thenBlock, 'True', 'true');
          const afterThen = this.processStatements(
            stmt.thenStatement.type === ASTNodeType.COMPOUND_STATEMENT ? stmt.thenStatement.body : [stmt.thenStatement],
            thenBlock
          );

          let afterElse = null;
          if (stmt.elseStatement) {
            const elseBlock = this.createBlock('Else Branch');
            condBlock.addEdge(elseBlock, 'False', 'false');
            afterElse = this.processStatements(
              stmt.elseStatement.type === ASTNodeType.COMPOUND_STATEMENT ? stmt.elseStatement.body : [stmt.elseStatement],
              elseBlock
            );
          }

          const joinBlock = this.createBlock('Join Block');
          if (afterThen) afterThen.addEdge(joinBlock);
          if (afterElse) {
            afterElse.addEdge(joinBlock);
          } else {
            condBlock.addEdge(joinBlock, 'False', 'false');
          }

          curr = joinBlock;
          break;
        }

        case ASTNodeType.WHILE_STATEMENT: {
          const condStr = this.exprToString(stmt.condition);
          const condBlock = this.createBlock(`while (${condStr})`, 'loop');
          curr.addEdge(condBlock);

          const bodyBlock = this.createBlock('Loop Body');
          condBlock.addEdge(bodyBlock, 'True', 'true');

          const afterBody = this.processStatements(
            stmt.body.type === ASTNodeType.COMPOUND_STATEMENT ? stmt.body.body : [stmt.body],
            bodyBlock
          );

          if (afterBody) {
            afterBody.addEdge(condBlock, 'Loop Back', 'loop');
          }

          const loopExit = this.createBlock('After Loop');
          condBlock.addEdge(loopExit, 'False', 'false');
          curr = loopExit;
          break;
        }

        case ASTNodeType.FOR_STATEMENT: {
          if (stmt.init) {
            curr.addInstruction(stmt.init.type === ASTNodeType.VARIABLE_DECLARATION
              ? `int ${stmt.init.declarators?.map(d => d.name).join(', ')}`
              : this.exprToString(stmt.init));
          }

          const condStr = stmt.condition ? this.exprToString(stmt.condition) : 'true';
          const condBlock = this.createBlock(`for (; ${condStr};)`, 'loop');
          curr.addEdge(condBlock);

          const bodyBlock = this.createBlock('Loop Body');
          condBlock.addEdge(bodyBlock, 'True', 'true');

          const afterBody = this.processStatements(
            stmt.body.type === ASTNodeType.COMPOUND_STATEMENT ? stmt.body.body : [stmt.body],
            bodyBlock
          );

          if (stmt.update) {
            afterBody?.addInstruction(this.exprToString(stmt.update));
          }

          afterBody?.addEdge(condBlock, 'Next Iteration', 'loop');

          const loopExit = this.createBlock('After Loop');
          condBlock.addEdge(loopExit, 'False', 'false');
          curr = loopExit;
          break;
        }

        case ASTNodeType.RETURN_STATEMENT: {
          const retVal = stmt.argument ? this.exprToString(stmt.argument) : '';
          curr.addInstruction(`return ${retVal};`.trim());
          curr.addEdge(this.exitBlock, 'Return', 'return');
          curr = null; // code after return is dead in this block
          break;
        }

        case ASTNodeType.COMPOUND_STATEMENT: {
          curr = this.processStatements(stmt.body, curr);
          break;
        }

        default:
          curr.addInstruction(`/* ${stmt.type} */`);
          break;
      }
    }

    return curr;
  }

  exprToString(expr) {
    if (!expr) return '';
    switch (expr.type) {
      case ASTNodeType.IDENTIFIER: return expr.name;
      case ASTNodeType.NUMERIC_LITERAL: return expr.raw || String(expr.value);
      case ASTNodeType.STRING_LITERAL: return expr.value;
      case ASTNodeType.CHAR_LITERAL: return expr.value;
      case ASTNodeType.BINARY_EXPRESSION:
        return `${this.exprToString(expr.left)} ${expr.operator} ${this.exprToString(expr.right)}`;
      case ASTNodeType.ASSIGNMENT_EXPRESSION:
        return `${this.exprToString(expr.left)} ${expr.operator} ${this.exprToString(expr.right)}`;
      case ASTNodeType.UNARY_EXPRESSION:
        return `${expr.operator}${this.exprToString(expr.argument)}`;
      case ASTNodeType.UPDATE_EXPRESSION:
        return expr.prefix ? `${expr.operator}${this.exprToString(expr.argument)}` : `${this.exprToString(expr.argument)}${expr.operator}`;
      case ASTNodeType.CALL_EXPRESSION:
        return `${this.exprToString(expr.callee)}(${expr.arguments?.map(a => this.exprToString(a)).join(', ') || ''})`;
      case ASTNodeType.MEMBER_EXPRESSION:
        return `${this.exprToString(expr.object)}${expr.isArrow ? '->' : '.'}${expr.property}`;
      case ASTNodeType.SUBSCRIPT_EXPRESSION:
        return `${this.exprToString(expr.object)}[${this.exprToString(expr.index)}]`;
      case ASTNodeType.CONDITIONAL_EXPRESSION:
        return `${this.exprToString(expr.condition)} ? ${this.exprToString(expr.consequent)} : ${this.exprToString(expr.alternate)}`;
      default:
        return '<expr>';
    }
  }
}

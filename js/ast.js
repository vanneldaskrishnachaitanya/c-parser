/**
 * C Language AST (Abstract Syntax Tree) Node Definitions and Factory
 */

export const ASTNodeType = {
  // Top-level
  TRANSLATION_UNIT: 'TranslationUnit',
  PREPROCESSOR: 'PreprocessorDirective',

  // Declarations
  FUNCTION_DEFINITION: 'FunctionDefinition',
  VARIABLE_DECLARATION: 'VariableDeclaration',
  DECLARATOR: 'Declarator',
  STRUCT_DECLARATION: 'StructDeclaration',
  UNION_DECLARATION: 'UnionDeclaration',
  ENUM_DECLARATION: 'EnumDeclaration',
  ENUM_MEMBER: 'EnumMember',
  TYPEDEF_DECLARATION: 'TypedefDeclaration',
  PARAMETER_LIST: 'ParameterList',
  PARAMETER: 'Parameter',

  // Types
  TYPE_SPECIFIER: 'TypeSpecifier',
  POINTER_TYPE: 'PointerType',
  ARRAY_TYPE: 'ArrayType',

  // Statements
  COMPOUND_STATEMENT: 'CompoundStatement',
  EXPRESSION_STATEMENT: 'ExpressionStatement',
  IF_STATEMENT: 'IfStatement',
  WHILE_STATEMENT: 'WhileStatement',
  DO_WHILE_STATEMENT: 'DoWhileStatement',
  FOR_STATEMENT: 'ForStatement',
  SWITCH_STATEMENT: 'SwitchStatement',
  CASE_STATEMENT: 'CaseStatement',
  DEFAULT_STATEMENT: 'DefaultStatement',
  RETURN_STATEMENT: 'ReturnStatement',
  BREAK_STATEMENT: 'BreakStatement',
  CONTINUE_STATEMENT: 'ContinueStatement',
  GOTO_STATEMENT: 'GotoStatement',
  LABELED_STATEMENT: 'LabeledStatement',
  NULL_STATEMENT: 'NullStatement',

  // Expressions
  BINARY_EXPRESSION: 'BinaryExpression',
  UNARY_EXPRESSION: 'UnaryExpression',
  UPDATE_EXPRESSION: 'UpdateExpression',
  ASSIGNMENT_EXPRESSION: 'AssignmentExpression',
  CONDITIONAL_EXPRESSION: 'ConditionalExpression',
  CALL_EXPRESSION: 'CallExpression',
  MEMBER_EXPRESSION: 'MemberExpression',
  SUBSCRIPT_EXPRESSION: 'SubscriptExpression',
  CAST_EXPRESSION: 'CastExpression',
  SIZEOF_EXPRESSION: 'SizeofExpression',
  COMMA_EXPRESSION: 'CommaExpression',
  INITIALIZER_LIST: 'InitializerList',

  // Literals & Primaries
  IDENTIFIER: 'Identifier',
  NUMERIC_LITERAL: 'NumericLiteral',
  STRING_LITERAL: 'StringLiteral',
  CHAR_LITERAL: 'CharLiteral',

  // Error recovery placeholder
  ERROR_NODE: 'ErrorNode'
};

export class ASTNode {
  constructor(type, loc = {}) {
    this.type = type;
    this.loc = {
      line: loc.line || 1,
      col: loc.col || 1,
      start: loc.start !== undefined ? loc.start : 0,
      end: loc.end !== undefined ? loc.end : 0
    };
    this.id = 'node_' + Math.random().toString(36).substring(2, 9);
  }

  getChildren() {
    const children = [];
    for (const [key, val] of Object.entries(this)) {
      if (key === 'loc' || key === 'id' || key === 'type') continue;
      if (val instanceof ASTNode) {
        children.push({ prop: key, node: val });
      } else if (Array.isArray(val)) {
        val.forEach((item, idx) => {
          if (item instanceof ASTNode) {
            children.push({ prop: `${key}[${idx}]`, node: item });
          }
        });
      }
    }
    return children;
  }
}

export const AST = {
  translationUnit(declarations, loc) {
    const node = new ASTNode(ASTNodeType.TRANSLATION_UNIT, loc);
    node.declarations = declarations;
    return node;
  },

  preprocessor(directive, value, loc) {
    const node = new ASTNode(ASTNodeType.PREPROCESSOR, loc);
    node.directive = directive;
    node.value = value;
    return node;
  },

  typeSpecifier(name, qualifiers = [], isPointer = false, pointerLevel = 0, loc) {
    const node = new ASTNode(ASTNodeType.TYPE_SPECIFIER, loc);
    node.name = name;
    node.qualifiers = qualifiers;
    node.isPointer = isPointer;
    node.pointerLevel = pointerLevel;
    return node;
  },

  functionDefinition(returnType, name, params, body, loc) {
    const node = new ASTNode(ASTNodeType.FUNCTION_DEFINITION, loc);
    node.returnType = returnType;
    node.name = name;
    node.params = params;
    node.body = body;
    return node;
  },

  parameter(type, name, loc) {
    const node = new ASTNode(ASTNodeType.PARAMETER, loc);
    node.paramType = type;
    node.name = name;
    return node;
  },

  variableDeclaration(typeSpec, declarators, loc) {
    const node = new ASTNode(ASTNodeType.VARIABLE_DECLARATION, loc);
    node.typeSpec = typeSpec;
    node.declarators = declarators;
    return node;
  },

  declarator(name, pointerLevel = 0, arrayDimensions = [], init = null, loc) {
    const node = new ASTNode(ASTNodeType.DECLARATOR, loc);
    node.name = name;
    node.pointerLevel = pointerLevel;
    node.arrayDimensions = arrayDimensions;
    node.init = init;
    return node;
  },

  structDeclaration(name, members = [], isTypedef = false, typedefAlias = null, loc) {
    const node = new ASTNode(ASTNodeType.STRUCT_DECLARATION, loc);
    node.name = name;
    node.members = members;
    node.isTypedef = isTypedef;
    node.typedefAlias = typedefAlias;
    return node;
  },

  enumDeclaration(name, members = [], loc) {
    const node = new ASTNode(ASTNodeType.ENUM_DECLARATION, loc);
    node.name = name;
    node.members = members;
    return node;
  },

  enumMember(name, value = null, loc) {
    const node = new ASTNode(ASTNodeType.ENUM_MEMBER, loc);
    node.name = name;
    node.value = value;
    return node;
  },

  typedefDeclaration(baseType, alias, loc) {
    const node = new ASTNode(ASTNodeType.TYPEDEF_DECLARATION, loc);
    node.baseType = baseType;
    node.alias = alias;
    return node;
  },

  compoundStatement(body = [], loc) {
    const node = new ASTNode(ASTNodeType.COMPOUND_STATEMENT, loc);
    node.body = body;
    return node;
  },

  expressionStatement(expression, loc) {
    const node = new ASTNode(ASTNodeType.EXPRESSION_STATEMENT, loc);
    node.expression = expression;
    return node;
  },

  ifStatement(condition, thenStatement, elseStatement = null, loc) {
    const node = new ASTNode(ASTNodeType.IF_STATEMENT, loc);
    node.condition = condition;
    node.thenStatement = thenStatement;
    node.elseStatement = elseStatement;
    return node;
  },

  whileStatement(condition, body, loc) {
    const node = new ASTNode(ASTNodeType.WHILE_STATEMENT, loc);
    node.condition = condition;
    node.body = body;
    return node;
  },

  doWhileStatement(body, condition, loc) {
    const node = new ASTNode(ASTNodeType.DO_WHILE_STATEMENT, loc);
    node.body = body;
    node.condition = condition;
    return node;
  },

  forStatement(init, condition, update, body, loc) {
    const node = new ASTNode(ASTNodeType.FOR_STATEMENT, loc);
    node.init = init;
    node.condition = condition;
    node.update = update;
    node.body = body;
    return node;
  },

  switchStatement(discriminant, body, loc) {
    const node = new ASTNode(ASTNodeType.SWITCH_STATEMENT, loc);
    node.discriminant = discriminant;
    node.body = body;
    return node;
  },

  caseStatement(value, statement = null, loc) {
    const node = new ASTNode(ASTNodeType.CASE_STATEMENT, loc);
    node.value = value;
    node.statement = statement;
    return node;
  },

  defaultStatement(statement = null, loc) {
    const node = new ASTNode(ASTNodeType.DEFAULT_STATEMENT, loc);
    node.statement = statement;
    return node;
  },

  returnStatement(argument = null, loc) {
    const node = new ASTNode(ASTNodeType.RETURN_STATEMENT, loc);
    node.argument = argument;
    return node;
  },

  breakStatement(loc) {
    return new ASTNode(ASTNodeType.BREAK_STATEMENT, loc);
  },

  continueStatement(loc) {
    return new ASTNode(ASTNodeType.CONTINUE_STATEMENT, loc);
  },

  nullStatement(loc) {
    return new ASTNode(ASTNodeType.NULL_STATEMENT, loc);
  },

  binaryExpression(operator, left, right, loc) {
    const node = new ASTNode(ASTNodeType.BINARY_EXPRESSION, loc);
    node.operator = operator;
    node.left = left;
    node.right = right;
    return node;
  },

  unaryExpression(operator, argument, prefix = true, loc) {
    const node = new ASTNode(ASTNodeType.UNARY_EXPRESSION, loc);
    node.operator = operator;
    node.argument = argument;
    node.prefix = prefix;
    return node;
  },

  updateExpression(operator, argument, prefix = false, loc) {
    const node = new ASTNode(ASTNodeType.UPDATE_EXPRESSION, loc);
    node.operator = operator;
    node.argument = argument;
    node.prefix = prefix;
    return node;
  },

  assignmentExpression(operator, left, right, loc) {
    const node = new ASTNode(ASTNodeType.ASSIGNMENT_EXPRESSION, loc);
    node.operator = operator;
    node.left = left;
    node.right = right;
    return node;
  },

  conditionalExpression(condition, consequent, alternate, loc) {
    const node = new ASTNode(ASTNodeType.CONDITIONAL_EXPRESSION, loc);
    node.condition = condition;
    node.consequent = consequent;
    node.alternate = alternate;
    return node;
  },

  callExpression(callee, args = [], loc) {
    const node = new ASTNode(ASTNodeType.CALL_EXPRESSION, loc);
    node.callee = callee;
    node.arguments = args;
    return node;
  },

  memberExpression(object, property, isArrow = false, loc) {
    const node = new ASTNode(ASTNodeType.MEMBER_EXPRESSION, loc);
    node.object = object;
    node.property = property;
    node.isArrow = isArrow; // -> or .
    return node;
  },

  subscriptExpression(object, index, loc) {
    const node = new ASTNode(ASTNodeType.SUBSCRIPT_EXPRESSION, loc);
    node.object = object;
    node.index = index;
    return node;
  },

  castExpression(targetType, expression, loc) {
    const node = new ASTNode(ASTNodeType.CAST_EXPRESSION, loc);
    node.targetType = targetType;
    node.expression = expression;
    return node;
  },

  sizeofExpression(target, isType = false, loc) {
    const node = new ASTNode(ASTNodeType.SIZEOF_EXPRESSION, loc);
    node.target = target;
    node.isType = isType;
    return node;
  },

  initializerList(elements = [], loc) {
    const node = new ASTNode(ASTNodeType.INITIALIZER_LIST, loc);
    node.elements = elements;
    return node;
  },

  identifier(name, loc) {
    const node = new ASTNode(ASTNodeType.IDENTIFIER, loc);
    node.name = name;
    return node;
  },

  numericLiteral(value, raw, loc) {
    const node = new ASTNode(ASTNodeType.NUMERIC_LITERAL, loc);
    node.value = value;
    node.raw = raw;
    return node;
  },

  stringLiteral(value, loc) {
    const node = new ASTNode(ASTNodeType.STRING_LITERAL, loc);
    node.value = value;
    return node;
  },

  charLiteral(value, loc) {
    const node = new ASTNode(ASTNodeType.CHAR_LITERAL, loc);
    node.value = value;
    return node;
  },

  errorNode(message, rawToken, loc) {
    const node = new ASTNode(ASTNodeType.ERROR_NODE, loc);
    node.message = message;
    node.rawToken = rawToken;
    return node;
  }
};

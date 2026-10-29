/**
 * ANSI C (C99/C11) Formal BNF Grammar Rules & Reference Catalog
 */

export const C_GRAMMAR_CATALOG = {
  'translation-unit': {
    category: 'Program Structure',
    name: 'translation-unit',
    bnf: '<translation-unit> ::= { <external-declaration> }+',
    description: 'The top-level root nonterminal of every C program, comprising a sequence of external declarations (functions, variables, structs, preprocessor directives).'
  },
  'external-declaration': {
    category: 'Program Structure',
    name: 'external-declaration',
    bnf: '<external-declaration> ::= <function-definition> | <declaration> | <preprocessor-directive>',
    description: 'Declarations that exist at the global scope level outside any function body.'
  },
  'preprocessor-directive': {
    category: 'Preprocessor',
    name: 'preprocessor-directive',
    bnf: '<preprocessor-directive> ::= "#" ( "include" | "define" | "undef" | "ifdef" | "ifndef" | "if" | "elif" | "else" | "endif" | "pragma" ) [ <token-sequence> ]',
    description: 'Source-level directives executed during the preprocessing phase before syntactic compilation.'
  },
  'function-definition': {
    category: 'Declarations',
    name: 'function-definition',
    bnf: '<function-definition> ::= { <declaration-specifier> }* <declarator> [ <declaration-list> ] <compound-statement>',
    description: 'Declares and defines the executable body and parameter interface of a C function.'
  },
  'parameter-list': {
    category: 'Declarations',
    name: 'parameter-list',
    bnf: '<parameter-list> ::= <parameter-declaration> { "," <parameter-declaration> }* [ "," "..." ]',
    description: 'The comma-separated parameter declarations enclosed in parentheses for a function prototype or definition.'
  },
  'compound-statement': {
    category: 'Statements',
    name: 'compound-statement',
    bnf: '<compound-statement> ::= "{" [ <declaration-or-statement-list> ] "}"',
    description: 'A block enclosed in curly braces creating a new local scope for variable declarations and statements.'
  },
  'declaration-or-function': {
    category: 'Declarations',
    name: 'declaration-or-function',
    bnf: '<declaration-or-function> ::= <type-specifier> <declarator> ( <compound-statement> | ";" )',
    description: 'Determines whether a declaration header introduces an executable function body or variable declarations.'
  },
  'local-variable-declaration': {
    category: 'Declarations',
    name: 'local-variable-declaration',
    bnf: '<local-variable-declaration> ::= <type-specifier> <init-declarator> { "," <init-declarator> }* ";"',
    description: 'Allocates local automatic or static variables within a compound block scope.'
  },
  'struct-declaration': {
    category: 'Declarations',
    name: 'struct-declaration',
    bnf: '<struct-declaration> ::= "struct" [ <identifier> ] "{" { <struct-member-declaration> }+ "}" [ <declarator> ] ";"',
    description: 'Defines an aggregate record type grouping heterogeneous variables together in contiguous memory.'
  },
  'typedef-declaration': {
    category: 'Declarations',
    name: 'typedef-declaration',
    bnf: '<typedef-declaration> ::= "typedef" <type-specifier> <declarator> ";"',
    description: 'Creates a custom semantic alias identifier for an existing built-in or structured C type.'
  },
  'selection-statement': {
    category: 'Statements',
    name: 'selection-statement',
    bnf: '<selection-statement> ::= "if" "(" <expression> ")" <statement> [ "else" <statement> ] | "switch" "(" <expression> ")" <statement>',
    description: 'Conditional branching construct choosing alternative execution paths based on evaluated boolean expressions.'
  },
  'iteration-statement': {
    category: 'Statements',
    name: 'iteration-statement',
    bnf: '<iteration-statement> ::= "while" "(" <expression> ")" <statement>\n                       | "do" <statement> "while" "(" <expression> ")" ";"\n                       | "for" "(" [ <expression> | <declaration> ] ";" [ <expression> ] ";" [ <expression> ] ")" <statement>',
    description: 'Looping construct executing a target statement body repeatedly as long as the test condition remains true.'
  },
  'jump-statement': {
    category: 'Statements',
    name: 'jump-statement',
    bnf: '<jump-statement> ::= "return" [ <expression> ] ";" | "break" ";" | "continue" ";" | "goto" <identifier> ";"',
    description: 'Unconditionally transfers program control flow to another point or exits the enclosing function or loop.'
  },
  'labeled-statement': {
    category: 'Statements',
    name: 'labeled-statement',
    bnf: '<labeled-statement> ::= ( "case" <constant-expression> ":" | "default" ":" | <identifier> ":" ) <statement>',
    description: 'Targets for branch jumps within switch constructs or goto statements.'
  },
  'expression-statement': {
    category: 'Statements',
    name: 'expression-statement',
    bnf: '<expression-statement> ::= [ <expression> ] ";"',
    description: 'An expression evaluated for its side effects (e.g. assignments, function calls, increment operations) terminated by a semicolon.'
  },
  'assignment-expression': {
    category: 'Expressions',
    name: 'assignment-expression',
    bnf: '<assignment-expression> ::= <unary-expression> <assignment-operator> <assignment-expression> | <conditional-expression>',
    description: 'Right-associative expression updating a left-hand lvalue with the value of a right-hand expression.'
  },
  'conditional-expression': {
    category: 'Expressions',
    name: 'conditional-expression',
    bnf: '<conditional-expression> ::= <logical-or-expression> [ "?" <expression> ":" <conditional-expression> ]',
    description: 'Ternary conditional operator (?:) evaluating one of two expressions depending on a boolean test condition.'
  },
  'binary-expression': {
    category: 'Expressions',
    name: 'binary-expression',
    bnf: '<binary-expression> ::= <cast-expression> { <binary-operator> <cast-expression> }*',
    description: 'Infix binary operator expression (arithmetic, bitwise, relational, logical, shift).'
  },
  'call-expression': {
    category: 'Expressions',
    name: 'call-expression',
    bnf: '<call-expression> ::= <postfix-expression> "(" [ <argument-expression-list> ] ")"',
    description: 'Invokes a function passing argument expressions evaluated from left to right.'
  },
  'member-expression': {
    category: 'Expressions',
    name: 'member-expression',
    bnf: '<member-expression> ::= <postfix-expression> ( "." | "->" ) <identifier>',
    description: 'Accesses a named member field of a struct either directly (.) or via pointer dereferencing (->).'
  },
  'subscript-expression': {
    category: 'Expressions',
    name: 'subscript-expression',
    bnf: '<subscript-expression> ::= <postfix-expression> "[" <expression> "]"',
    description: 'Indexed array access equivalent to pointer addition and dereferencing: *(ptr + index).'
  },
  'cast-expression': {
    category: 'Expressions',
    name: 'cast-expression',
    bnf: '<cast-expression> ::= "(" <type-name> ")" <cast-expression> | <unary-expression>',
    description: 'Explicit type conversion operator coercing an expression value to a specified target data type.'
  },
  'unary-expression': {
    category: 'Expressions',
    name: 'unary-expression',
    bnf: '<unary-expression> ::= ( "++" | "--" | "+" | "-" | "!" | "~" | "*" | "&" | "sizeof" ) <cast-expression>',
    description: 'Prefix operator operating on a single operand (e.g. pointer dereference *, address-of &, negation, logical NOT).'
  },
  'primary-expression': {
    category: 'Expressions',
    name: 'primary-expression',
    bnf: '<primary-expression> ::= <identifier> | <constant> | <string-literal> | "(" <expression> ")"',
    description: 'Fundamental building block of expressions: variable names, numeric/string literals, or parenthesized expressions.'
  }
};

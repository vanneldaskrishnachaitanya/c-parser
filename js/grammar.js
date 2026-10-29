/**
 * C / C++ BNF Grammar Rules Catalog
 *
 * Derived from grammar.y — the Bison/Yacc specification for the C++17 parser.
 * Each entry maps directly to one or more productions in the .y file and
 * describes the corresponding recursive-descent parser function.
 *
 * Categories mirror the .y section headings:
 *   Program Structure | Preprocessor | Declarations | Classes | Enums |
 *   Statements | Expressions | Types & Declarators
 */

export const C_GRAMMAR_CATALOG = {

  /* =========================================================================
   * 1. PROGRAM STRUCTURE
   * ========================================================================= */

  'translation-unit': {
    category: 'Program Structure',
    name: 'translation-unit',
    bnf: `<translation-unit>
    ::= <declaration-seq>
      | ε`,
    description:
      'The top-level root non-terminal of every C/C++ program. It contains a ' +
      'sequence of external declarations (functions, variables, classes, ' +
      'preprocessor directives). An empty file is also valid.'
  },

  'declaration-seq': {
    category: 'Program Structure',
    name: 'declaration-seq',
    bnf: `<declaration-seq>
    ::= <declaration>
      | <declaration-seq> <declaration>`,
    description:
      'A non-empty, ordered sequence of top-level declarations that together ' +
      'form the translation unit.'
  },

  'declaration': {
    category: 'Program Structure',
    name: 'declaration',
    bnf: `<declaration>
    ::= <simple-declaration> ";"
      | <function-definition>
      | <class-specifier> ";"
      | <enum-specifier> ";"
      | <namespace-definition>
      | <using-declaration>
      | <typedef-declaration>
      | <template-declaration>
      | <static-assert-declaration>
      | <linkage-specification>
      | <preprocessor-directive>
      | ";"`,
    description:
      'The fundamental unit of source-level syntax. A declaration introduces ' +
      'a name, defines a type, or issues a directive. Every top-level ' +
      'construct reduces to one of these alternatives.'
  },

  /* =========================================================================
   * 2. PREPROCESSOR
   * ========================================================================= */

  'preprocessor-directive': {
    category: 'Preprocessor',
    name: 'preprocessor-directive',
    bnf: `<preprocessor-directive>
    ::= "#" ( "include" | "define" | "undef"
            | "ifdef"  | "ifndef" | "if"
            | "elif"   | "else"   | "endif"
            | "pragma" | "error"  | "line" )
          [ <token-sequence> ]`,
    description:
      'Source-level directives handled by the C preprocessor before syntactic ' +
      'analysis. They manage file inclusion, conditional compilation, macro ' +
      'definitions, and compiler pragmas.'
  },

  /* =========================================================================
   * 3. NAMESPACES
   * ========================================================================= */

  'namespace-definition': {
    category: 'Declarations',
    name: 'namespace-definition',
    bnf: `<namespace-definition>
    ::= "namespace" <identifier> "{" <declaration-seq> "}"
      | "namespace"              "{" <declaration-seq> "}"
      | "namespace" <identifier> "=" <qualified-id> ";"
      | "inline" "namespace" <identifier> "{" <declaration-seq> "}"`,
    description:
      'Introduces a named or anonymous namespace scope, an inline namespace, ' +
      'or a namespace alias (e.g. namespace Alias = A::B).'
  },

  /* =========================================================================
   * 4. USING & TYPEDEF
   * ========================================================================= */

  'using-declaration': {
    category: 'Declarations',
    name: 'using-declaration',
    bnf: `<using-declaration>
    ::= "using" "namespace" <qualified-id> ";"
      | "using" <identifier> "=" <type-specifier> ";"
      | "using" <qualified-id> ";"
      | "using" "typename" <qualified-id> ";"`,
    description:
      'Brings a name from another namespace into the current scope, ' +
      'creates a type alias (using T = int;), or imports a base-class member.'
  },

  'typedef-declaration': {
    category: 'Declarations',
    name: 'typedef-declaration',
    bnf: `<typedef-declaration>
    ::= "typedef" <type-specifier> <init-declarator-list> ";"`,
    description:
      'Creates a semantic alias for an existing type. Equivalent to a ' +
      '"using" alias in modern C++. E.g. typedef unsigned int uint;'
  },

  /* =========================================================================
   * 5. TEMPLATES
   * ========================================================================= */

  'template-declaration': {
    category: 'Declarations',
    name: 'template-declaration',
    bnf: `<template-declaration>
    ::= "template" "<" <template-parameter-list> ">" <declaration>`,
    description:
      'Declares a class or function template parameterised over types or ' +
      'non-type values. The parameter list is enclosed in angle brackets.'
  },

  'template-parameter-list': {
    category: 'Declarations',
    name: 'template-parameter-list',
    bnf: `<template-parameter-list>
    ::= <template-parameter>
      | <template-parameter-list> "," <template-parameter>`,
    description:
      'A comma-separated list of template parameters (type, non-type, or ' +
      'template-template parameters).'
  },

  'template-parameter': {
    category: 'Declarations',
    name: 'template-parameter',
    bnf: `<template-parameter>
    ::= "typename" [ <identifier> ]
      | "class"    [ <identifier> ]
      | "typename" "..." [ <identifier> ]
      | "class"    "..." [ <identifier> ]
      | <type-specifier> <declarator>`,
    description:
      'One parameter of a template. Type parameters use typename/class; ' +
      'non-type parameters look like ordinary declarations. Pack expansions ' +
      'use "...".'
  },

  /* =========================================================================
   * 6. STATIC ASSERT & LINKAGE
   * ========================================================================= */

  'static-assert-declaration': {
    category: 'Declarations',
    name: 'static-assert-declaration',
    bnf: `<static-assert-declaration>
    ::= "static_assert" "(" <expression> "," <string-literal> ")" ";"`,
    description:
      'Compile-time assertion. If the constant expression evaluates to false ' +
      'the compiler issues the specified diagnostic message.'
  },

  'linkage-specification': {
    category: 'Declarations',
    name: 'linkage-specification',
    bnf: `<linkage-specification>
    ::= "extern" <string-literal> "{" <declaration-seq> "}"
      | "extern" <string-literal> <declaration>`,
    description:
      'Specifies the language linkage for a group of declarations — most ' +
      'commonly extern "C" to suppress C++ name mangling.'
  },

  /* =========================================================================
   * 7. FUNCTION DEFINITION
   * ========================================================================= */

  'function-definition': {
    category: 'Declarations',
    name: 'function-definition',
    bnf: `<function-definition>
    ::= <type-specifier> <declarator> <function-body>`,
    description:
      'Declares and defines a callable function: the return type, the ' +
      'declarator (name + parameter list), and the body. Maps to ' +
      'Parser::parseFunctionDef().'
  },

  'function-body': {
    category: 'Declarations',
    name: 'function-body',
    bnf: `<function-body>
    ::= [ <ctor-initializer> ] <compound-statement>
      | "=" "default" ";"
      | "=" "delete"  ";"
      | "=" "0"       ";"`,
    description:
      'The body of a function. Regular functions use a compound statement. ' +
      'Special member functions may use = default, = delete, or = 0 ' +
      '(pure virtual).'
  },

  'ctor-initializer': {
    category: 'Declarations',
    name: 'ctor-initializer',
    bnf: `<ctor-initializer>
    ::= ":" <mem-initializer-list>

<mem-initializer-list>
    ::= <mem-initializer>
      | <mem-initializer-list> "," <mem-initializer>

<mem-initializer>
    ::= <qualified-id> "(" [ <expression-list> ] ")"
      | <qualified-id> <braced-init-list>`,
    description:
      'The member-initializer list of a constructor, following the colon ' +
      'before the body. Initializes base classes and member variables directly ' +
      'before the constructor body runs.'
  },

  /* =========================================================================
   * 8. SIMPLE DECLARATIONS
   * ========================================================================= */

  'simple-declaration': {
    category: 'Declarations',
    name: 'simple-declaration',
    bnf: `<simple-declaration>
    ::= <type-specifier> <init-declarator-list>
      | <type-specifier>`,
    description:
      'Declares one or more variables or function prototypes sharing the same ' +
      'type specifier. E.g. int x = 0, y = 1;'
  },

  'init-declarator-list': {
    category: 'Declarations',
    name: 'init-declarator-list',
    bnf: `<init-declarator-list>
    ::= <init-declarator>
      | <init-declarator-list> "," <init-declarator>`,
    description:
      'A comma-separated list of declarators, each optionally followed by an ' +
      'initializer.'
  },

  'init-declarator': {
    category: 'Declarations',
    name: 'init-declarator',
    bnf: `<init-declarator>
    ::= <declarator> [ <initializer> ]`,
    description:
      'One variable name (with optional pointer/array modifiers) paired with ' +
      'an optional initializer.'
  },

  'initializer': {
    category: 'Declarations',
    name: 'initializer',
    bnf: `<initializer>
    ::= "=" <initializer-clause>
      | "(" <expression-list> ")"
      | <braced-init-list>`,
    description:
      'The value assigned to a newly declared variable. Supports copy ' +
      'initialization (=), direct initialization (()), and list ' +
      'initialization ({}).'
  },

  /* =========================================================================
   * 9. CLASSES & STRUCTS
   * ========================================================================= */

  'class-specifier': {
    category: 'Classes',
    name: 'class-specifier',
    bnf: `<class-specifier>
    ::= <class-head> "{" [ <member-specification> ] "}"

<class-head>
    ::= <class-key> [ <identifier> ] [ "final" ] [ <base-clause> ]

<class-key>
    ::= "class" | "struct" | "union"`,
    description:
      'Defines a class, struct, or union type. The class-head gives the keyword, ' +
      'optional name, optional "final" specifier, and optional base class list. ' +
      'The body contains member declarations.'
  },

  'base-clause': {
    category: 'Classes',
    name: 'base-clause',
    bnf: `<base-clause>
    ::= ":" <base-specifier-list>

<base-specifier-list>
    ::= <base-specifier>
      | <base-specifier-list> "," <base-specifier>

<base-specifier>
    ::= [ <access-specifier> ] <qualified-id>
      | "virtual" [ <access-specifier> ] <qualified-id>
      | [ <access-specifier> ] "virtual" <qualified-id>

<access-specifier>
    ::= "public" | "protected" | "private"`,
    description:
      'Specifies zero or more base classes that the derived class inherits from, ' +
      'with optional access specifiers (public/protected/private) and optional ' +
      'virtual inheritance.'
  },

  'member-declaration': {
    category: 'Classes',
    name: 'member-declaration',
    bnf: `<member-declaration>
    ::= <declaration>
      | <access-specifier> ":"`,
    description:
      'One item in a class body: either a regular declaration (field, method, ' +
      'nested type) or an access specifier label (public:, protected:, private:).'
  },

  /* =========================================================================
   * 10. ENUMS
   * ========================================================================= */

  'enum-specifier': {
    category: 'Enums',
    name: 'enum-specifier',
    bnf: `<enum-specifier>
    ::= "enum" [ "class" | "struct" ] [ <identifier> ] [ ":" <type-specifier> ]
        "{" [ <enumerator-list> [ "," ] ] "}"`,
    description:
      'Defines an enumeration type. Scoped enums (enum class / enum struct) ' +
      'prevent implicit conversion. An optional base type sets the underlying ' +
      'integer representation.'
  },

  'enumerator': {
    category: 'Enums',
    name: 'enumerator',
    bnf: `<enumerator>
    ::= <identifier>
      | <identifier> "=" <expression>`,
    description:
      'One named constant in an enumeration. An explicit initializer overrides ' +
      'the implicit auto-incremented value.'
  },

  /* =========================================================================
   * 11. STATEMENTS
   * ========================================================================= */

  'statement': {
    category: 'Statements',
    name: 'statement',
    bnf: `<statement>
    ::= <labeled-statement>
      | <compound-statement>
      | <selection-statement>
      | <iteration-statement>
      | <jump-statement>
      | <declaration-statement>
      | <expression-statement>
      | <try-block>
      | ";"`,
    description:
      'The fundamental unit of executable C/C++ code. Every construct that ' +
      'performs an action — branching, looping, returning, declaring — is a ' +
      'statement.'
  },

  'compound-statement': {
    category: 'Statements',
    name: 'compound-statement',
    bnf: `<compound-statement>
    ::= "{" { <statement> }* "}"`,
    description:
      'A block enclosed in curly braces. Creates a new local scope: variables ' +
      'declared inside are destroyed when the closing brace is reached. Used as ' +
      'the body of functions, loops, and conditionals.'
  },

  'selection-statement': {
    category: 'Statements',
    name: 'selection-statement',
    bnf: `<selection-statement>
    ::= "if"              "(" <condition> ")" <statement>
      | "if"              "(" <condition> ")" <statement> "else" <statement>
      | "if" "constexpr"  "(" <condition> ")" <statement>
      | "if" "constexpr"  "(" <condition> ")" <statement> "else" <statement>
      | "switch"          "(" <condition> ")" <statement>`,
    description:
      'Conditional branching. if/else chooses between two paths; switch ' +
      'dispatches to a matching case label. if constexpr is evaluated at ' +
      'compile time (C++17). The dangling-else ambiguity is resolved by ' +
      'associating "else" with the nearest "if".'
  },

  'condition': {
    category: 'Statements',
    name: 'condition',
    bnf: `<condition>
    ::= <expression>
      | <simple-declaration>`,
    description:
      'The test inside if, while, or for. May be a plain expression or a ' +
      'declaration (the declared variable is in scope for the body).'
  },

  'iteration-statement': {
    category: 'Statements',
    name: 'iteration-statement',
    bnf: `<iteration-statement>
    ::= "while" "(" <condition> ")" <statement>
      | "do" <statement> "while" "(" <expression> ")" ";"
      | "for" "(" <for-init-statement> [ <expression> ] ";" [ <expression> ] ")" <statement>
      | "for" "(" <type-specifier> <declarator> ":" <expression> ")" <statement>`,
    description:
      'Looping constructs. while tests before each iteration; do-while tests ' +
      'after. for provides init/condition/increment in one line. Range-for ' +
      '(C++11) iterates over containers and arrays.'
  },

  'for-init-statement': {
    category: 'Statements',
    name: 'for-init-statement',
    bnf: `<for-init-statement>
    ::= <expression-statement>
      | <simple-declaration> ";"
      | ";"`,
    description:
      'The initializer clause at the start of a for loop. May declare a new ' +
      'variable, evaluate an expression, or be empty.'
  },

  'jump-statement': {
    category: 'Statements',
    name: 'jump-statement',
    bnf: `<jump-statement>
    ::= "break"    ";"
      | "continue" ";"
      | "return" [ <expression> | <braced-init-list> ] ";"
      | "goto" <identifier> ";"`,
    description:
      'Unconditionally transfers control flow. break exits the nearest ' +
      'enclosing loop or switch; continue skips to the next iteration; ' +
      'return exits the function; goto jumps to a label.'
  },

  'labeled-statement': {
    category: 'Statements',
    name: 'labeled-statement',
    bnf: `<labeled-statement>
    ::= "case" <constant-expression> ":" <statement>
      | "default" ":" <statement>
      | <identifier> ":" <statement>`,
    description:
      'Marks a statement as a target for switch case matching or a goto jump. ' +
      '"case" and "default" are used inside switch bodies; identifier labels ' +
      'are jump targets for goto.'
  },

  'expression-statement': {
    category: 'Statements',
    name: 'expression-statement',
    bnf: `<expression-statement>
    ::= [ <expression> ] ";"`,
    description:
      'An expression followed by a semicolon. The expression is evaluated ' +
      'for its side effects (assignment, function call, increment, etc.). ' +
      'The empty form (just ";") is a no-op statement.'
  },

  'declaration-statement': {
    category: 'Statements',
    name: 'declaration-statement',
    bnf: `<declaration-statement>
    ::= <simple-declaration> ";"`,
    description:
      'Introduces a local variable declaration inside a compound statement ' +
      'block. The variable\'s lifetime ends at the closing brace.'
  },

  'try-block': {
    category: 'Statements',
    name: 'try-block',
    bnf: `<try-block>
    ::= "try" <compound-statement> <handler-seq>

<handler-seq>
    ::= <handler> { <handler> }*

<handler>
    ::= "catch" "(" <exception-declaration> ")" <compound-statement>

<exception-declaration>
    ::= <type-specifier> <declarator>
      | <type-specifier>
      | "..."`,
    description:
      'C++ exception handling. The try block executes guarded code; each ' +
      'catch handler matches exceptions by type. catch(...) catches any ' +
      'exception type.'
  },

  /* =========================================================================
   * 12. EXPRESSIONS
   * ========================================================================= */

  'expression': {
    category: 'Expressions',
    name: 'expression',
    bnf: `<expression>
    ::= <assignment-expression>
      | <expression> "," <assignment-expression>`,
    description:
      'The comma expression evaluates operands left-to-right and returns the ' +
      'rightmost value. In most contexts a single assignment-expression is used.'
  },

  'assignment-expression': {
    category: 'Expressions',
    name: 'assignment-expression',
    bnf: `<assignment-expression>
    ::= <conditional-expression>
      | <unary-expression> <assignment-operator> <assignment-expression>
      | "throw" [ <assignment-expression> ]

<assignment-operator>
    ::= "=" | "+=" | "-=" | "*=" | "/=" | "%="
      | "<<=" | ">>=" | "&=" | "^=" | "|="`,
    description:
      'Right-associative assignment. The left-hand side must be an lvalue. ' +
      'Compound assignment operators (+=, -=, etc.) combine arithmetic with ' +
      'assignment. "throw" used as an expression is also handled here.'
  },

  'conditional-expression': {
    category: 'Expressions',
    name: 'conditional-expression',
    bnf: `<conditional-expression>
    ::= <binary-expression>
      | <binary-expression> "?" <expression> ":" <assignment-expression>`,
    description:
      'The ternary (?: ) operator. Evaluates the condition; if true, returns ' +
      'the second operand, otherwise returns the third. Right-associative.'
  },

  'binary-expression': {
    category: 'Expressions',
    name: 'binary-expression',
    bnf: `<binary-expression>
    ::= <unary-expression>
      | <binary-expression> "||"  <binary-expression>
      | <binary-expression> "&&"  <binary-expression>
      | <binary-expression> "|"   <binary-expression>
      | <binary-expression> "^"   <binary-expression>
      | <binary-expression> "&"   <binary-expression>
      | <binary-expression> "=="  <binary-expression>
      | <binary-expression> "!="  <binary-expression>
      | <binary-expression> "<"   <binary-expression>
      | <binary-expression> ">"   <binary-expression>
      | <binary-expression> "<="  <binary-expression>
      | <binary-expression> ">="  <binary-expression>
      | <binary-expression> "<<"  <binary-expression>
      | <binary-expression> ">>"  <binary-expression>
      | <binary-expression> "+"   <binary-expression>
      | <binary-expression> "-"   <binary-expression>
      | <binary-expression> "*"   <binary-expression>
      | <binary-expression> "/"   <binary-expression>
      | <binary-expression> "%"   <binary-expression>
      | <binary-expression> ".*"  <binary-expression>
      | <binary-expression> "->*" <binary-expression>`,
    description:
      'Infix binary operators in descending precedence order: logical OR/AND, ' +
      'bitwise OR/XOR/AND, equality, relational, shift, additive, ' +
      'multiplicative, and pointer-to-member (.*  ->*).'
  },

  'unary-expression': {
    category: 'Expressions',
    name: 'unary-expression',
    bnf: `<unary-expression>
    ::= <postfix-expression>
      | "++"    <unary-expression>
      | "--"    <unary-expression>
      | "+"     <unary-expression>
      | "-"     <unary-expression>
      | "!"     <unary-expression>
      | "~"     <unary-expression>
      | "*"     <unary-expression>
      | "&"     <unary-expression>
      | "sizeof" <unary-expression>
      | "sizeof" "(" <type-specifier> ")"
      | "alignof" "(" <type-specifier> ")"
      | "new"    <type-specifier> [ <new-initializer> ]
      | "delete" <unary-expression>
      | "delete" "[" "]" <unary-expression>
      | "(" <type-specifier> ")" <unary-expression>`,
    description:
      'Prefix operations: pre-increment/decrement, arithmetic +/-, logical ' +
      'NOT, bitwise complement, pointer dereference *, address-of &, sizeof, ' +
      'alignof, new, delete, and C-style cast.'
  },

  'postfix-expression': {
    category: 'Expressions',
    name: 'postfix-expression',
    bnf: `<postfix-expression>
    ::= <primary-expression>
      | <postfix-expression> "[" <expression> "]"
      | <postfix-expression> "(" [ <expression-list> ] ")"
      | <postfix-expression> "."  <identifier>
      | <postfix-expression> "->" <identifier>
      | <postfix-expression> "++"
      | <postfix-expression> "--"`,
    description:
      'Postfix operations applied to a primary expression: array subscript, ' +
      'function call, member access (. and ->), and post-increment/decrement. ' +
      'Higher precedence than any prefix operator.'
  },

  'call-expression': {
    category: 'Expressions',
    name: 'call-expression',
    bnf: `<call-expression>
    ::= <postfix-expression> "(" [ <argument-expression-list> ] ")"`,
    description:
      'Invokes a function or functor. Arguments are comma-separated ' +
      'assignment-expressions evaluated left-to-right. Maps to ' +
      'Parser::parsePostfix() → CallExpr node.'
  },

  'member-expression': {
    category: 'Expressions',
    name: 'member-expression',
    bnf: `<member-expression>
    ::= <postfix-expression> "."  <identifier>
      | <postfix-expression> "->" <identifier>`,
    description:
      'Accesses a named member of a struct or class. "." for direct access; ' +
      '"->" for pointer-based access (equivalent to (*ptr).member).'
  },

  'subscript-expression': {
    category: 'Expressions',
    name: 'subscript-expression',
    bnf: `<subscript-expression>
    ::= <postfix-expression> "[" <expression> "]"`,
    description:
      'Indexed array access. Equivalent to pointer arithmetic: *(ptr + index). ' +
      'Maps to Parser::parsePostfix() → IndexExpr node.'
  },

  'cast-expression': {
    category: 'Expressions',
    name: 'cast-expression',
    bnf: `<cast-expression>
    ::= "(" <type-specifier> ")" <unary-expression>`,
    description:
      'C-style explicit type cast. Coerces the operand to the target type ' +
      'without any safety checks. Prefer C++ named casts for clarity.'
  },

  'cpp-cast-expression': {
    category: 'Expressions',
    name: 'cpp-cast-expression',
    bnf: `<cpp-cast-expression>
    ::= "static_cast"      "<" <type-specifier> ">" "(" <expression> ")"
      | "dynamic_cast"     "<" <type-specifier> ">" "(" <expression> ")"
      | "const_cast"       "<" <type-specifier> ">" "(" <expression> ")"
      | "reinterpret_cast" "<" <type-specifier> ">" "(" <expression> ")"`,
    description:
      'C++ named cast operators with explicit intent: static_cast for safe ' +
      'conversions, dynamic_cast for polymorphic downcasts (RTTI), ' +
      'const_cast to add/remove const, reinterpret_cast for low-level ' +
      'bit-pattern reinterpretation.'
  },

  'primary-expression': {
    category: 'Expressions',
    name: 'primary-expression',
    bnf: `<primary-expression>
    ::= <integer-literal>
      | <floating-literal>
      | <character-literal>
      | <string-literal>
      | "true"
      | "false"
      | "nullptr"
      | "this"
      | <qualified-id>
      | "(" <expression> ")"
      | <braced-init-list>
      | <cpp-cast-expression>`,
    description:
      'The atomic building blocks of expressions: numeric constants, character ' +
      'and string literals, boolean keywords (true/false), nullptr, this ' +
      'pointer, named variables/functions, parenthesized sub-expressions, and ' +
      'brace-enclosed initializer lists.'
  },

  'braced-init-list': {
    category: 'Expressions',
    name: 'braced-init-list',
    bnf: `<braced-init-list>
    ::= "{" [ <initializer-list> [ "," ] ] "}"

<initializer-list>
    ::= <initializer-clause>
      | <initializer-list> "," <initializer-clause>

<initializer-clause>
    ::= <assignment-expression>
      | <braced-init-list>`,
    description:
      'Uniform initializer syntax (C++11). Used to initialize aggregates, ' +
      'containers, or any type with an initializer_list constructor. ' +
      'Trailing commas are permitted.'
  },

  /* =========================================================================
   * 13. TYPES & DECLARATORS
   * ========================================================================= */

  'type-specifier': {
    category: 'Types & Declarators',
    name: 'type-specifier',
    bnf: `<type-specifier>
    ::= <trailing-type-specifier>
      | "const"    <type-specifier>
      | "volatile" <type-specifier>
      | "constexpr" <type-specifier>

<trailing-type-specifier>
    ::= <simple-type-specifier>
      | <class-specifier>
      | <enum-specifier>

<simple-type-specifier>
    ::= "char" | "char16_t" | "char32_t" | "wchar_t"
      | "bool" | "short" | "int" | "long"
      | "signed" | "unsigned" | "float" | "double"
      | "void" | "auto"
      | <qualified-id>
      | "decltype" "(" <expression> ")"`,
    description:
      'Describes the type of a declaration. Fundamental types (int, char, ' +
      'float…), qualified types (const, volatile, constexpr), user-defined ' +
      'types (class/struct/enum names), and auto/decltype for type deduction.'
  },

  'declarator': {
    category: 'Types & Declarators',
    name: 'declarator',
    bnf: `<declarator>
    ::= <ptr-declarator>

<ptr-declarator>
    ::= <noptr-declarator>
      | <ptr-operator> <ptr-declarator>

<ptr-operator>
    ::= "*" [ <cv-qualifier-seq> ]
      | "&"
      | "&&"

<noptr-declarator>
    ::= <declarator-id>
      | <noptr-declarator> <parameters-and-qualifiers>
      | <noptr-declarator> "[" [ <expression> ] "]"
      | "(" <ptr-declarator> ")"`,
    description:
      'Encodes the name and derived type modifiers of a declaration: pointer ' +
      '(*), lvalue reference (&), rvalue reference (&&), function parameters, ' +
      'and array dimensions. Reads inside-out: e.g. int (*fp)(int) declares ' +
      'fp as a pointer to function taking int returning int.'
  },

  'parameter-list': {
    category: 'Types & Declarators',
    name: 'parameter-list',
    bnf: `<parameter-declaration-clause>
    ::= ε
      | <parameter-declaration-list>
      | <parameter-declaration-list> "," "..."

<parameter-declaration-list>
    ::= <parameter-declaration>
      | <parameter-declaration-list> "," <parameter-declaration>

<parameter-declaration>
    ::= <type-specifier> <declarator>
      | <type-specifier> <declarator> "=" <initializer-clause>
      | <type-specifier>`,
    description:
      'The comma-separated parameter declarations enclosed in parentheses for ' +
      'a function prototype or definition. Parameters may have default values. ' +
      'A trailing "..." allows a variadic argument list.'
  },

  /* =========================================================================
   * 14. PARSER-TRACED SUPPLEMENTARY RULES
   *     These keys are emitted by traceGrammar() calls in parser.js and must
   *     exist in the catalog so the Grammar Traces tab can look them up.
   * ========================================================================= */

  'declaration-or-function': {
    category: 'Declarations',
    name: 'declaration-or-function',
    bnf: `<declaration-or-function>
    ::= <type-specifier> <declarator> <compound-statement>
      | <type-specifier> <declarator> ";"`,
    description:
      'Disambiguation point after parsing a type + declarator: decides whether ' +
      'the construct is a function definition (followed by "{") or a variable / ' +
      'prototype declaration (followed by ";"). Maps to Parser::parseDeclaration().'
  },

  'local-variable-declaration': {
    category: 'Declarations',
    name: 'local-variable-declaration',
    bnf: `<local-variable-declaration>
    ::= <type-specifier> <init-declarator> { "," <init-declarator> }* ";"`,
    description:
      'Allocates one or more local automatic or static variables within a ' +
      'compound (block) scope. Variables are destroyed at the end of the ' +
      'enclosing block.'
  },

  'struct-declaration': {
    category: 'Classes',
    name: 'struct-declaration',
    bnf: `<struct-declaration>
    ::= "struct" [ <identifier> ] "{" { <struct-member-declaration> }+ "}" [ <declarator> ] ";"

<struct-member-declaration>
    ::= <type-specifier> <declarator> { "," <declarator> }* ";"`,
    description:
      'Defines an aggregate record type grouping heterogeneous variables in ' +
      'contiguous memory. Members are accessed with "." (direct) or "->" ' +
      '(pointer). Optionally declares a variable of the struct type inline.'
  },

  'union-declaration': {
    category: 'Classes',
    name: 'union-declaration',
    bnf: `<union-declaration>
    ::= "union" [ <identifier> ] "{" { <union-member-declaration> }+ "}" [ <declarator> ] ";"

<union-member-declaration>
    ::= <type-specifier> <declarator> { "," <declarator> }* ";"`,
    description:
      'Defines a union type where all members share the same memory region. ' +
      'Only one member is active at a time. The size of the union is the size ' +
      'of its largest member.'
  },

  'enum-declaration': {
    category: 'Enums',
    name: 'enum-declaration',
    bnf: `<enum-declaration>
    ::= "enum" [ <identifier> ] "{" [ <enumerator-list> ] "}"

<enumerator-list>
    ::= <enumerator>
      | <enumerator-list> "," <enumerator>

<enumerator>
    ::= <identifier>
      | <identifier> "=" <constant-expression>`,
    description:
      'Defines a set of named integer constants (an enumerated type). Each ' +
      'enumerator is implicitly assigned a sequential integer value unless ' +
      'given an explicit constant initializer.'
  },

  'qualified-id': {
    category: 'Types & Declarators',
    name: 'qualified-id',
    bnf: `<qualified-id>
    ::= [ <nested-name-specifier> ] <unqualified-id>

<nested-name-specifier>
    ::= <type-or-namespace-name> "::"
      | <nested-name-specifier> <type-or-namespace-name> "::"
      | "::"

<unqualified-id>
    ::= <identifier>
      | "~" <identifier>
      | "operator" <operator-symbol>`,
    description:
      'A possibly namespace- or class-qualified name, e.g. std::string or ' +
      'MyClass::memberFn. The nested-name-specifier chains scope resolution ' +
      'operators (::). Used for destructors (~T) and operator names too.'
  }
};

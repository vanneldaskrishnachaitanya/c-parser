# C-AST Studio ⚡
> **Interactive C Language Lexer, Pratt Parser, AST & Control Flow Graph (CFG) Visualizer**

C-AST Studio is a high-performance, zero-dependency compiler frontend and visualization workbench built for C (ANSI C / C99 / C11). It features real-time lexical analysis, recursive descent parsing with Pratt expression precedence climbing, interactive SVG graph visualization, scope & symbol table resolution, control flow graph generation, and compiler error diagnostics.

---

## ✨ Features

- **⚡ High-Performance C Lexer (`lexer.js`)**:
  - Full ANSI C / C99 / C11 token stream generation.
  - Recognizes keywords, preprocessor directives (`#include`, `#define`, `#pragma`), decimal/hex/octal/float literals, string/char literals, operators, and comments.
  - Exact source position tracking (line, column, start/end byte offsets).

- **🌳 Recursive Descent & Pratt Parser (`parser.js`)**:
  - Full translation unit parsing: function definitions, structs, typedefs, global & local declarations.
  - Complete 17-level Pratt expression parsing for operator precedence and associativity (arithmetic, bitwise, relational, logical, ternary `?:`, assignment, member access `.`, `->`, array subscripts `[]`, and casts).
  - Resilient error recovery: parses through syntax mistakes using synchronization tokens to avoid cascading compiler failures.

- **🎨 Interactive SVG AST Graph Visualizer (`tree-visualizer.js`)**:
  - Smooth zoom (wheel & buttons) and pan navigation.
  - Reingold-Tilford inspired tidy tree layout with cubic bezier splines.
  - Color-coded category badges (Declarations, Statements, Expressions, Types, Literals).
  - Collapsible subtrees (`[-]` / `[+]` branch toggling).
  - One-click node inspection drawer showing attributes, code ranges, and raw AST JSON.
  - High-resolution SVG export.

- **🔀 Control Flow Graph (CFG) Visualizer (`cfg.js`)**:
  - Extracts basic blocks (`ENTRY`, condition checks, loop bodies, branches, and `EXIT`).
  - Draws directed execution flow edges with color-coded paths (True, False, Loop-Back, Return).

- **🗂️ Symbol Table & Semantic Analysis (`symbol-table.js`)**:
  - Hierarchical scope tree (Global Scope → Function Scope → Nested Block Scopes).
  - Tracks symbol kinds (`Function`, `Variable`, `Parameter`, `Struct`, `Typedef`), types, scope depth, and declaration coordinates.
  - Reference resolution and undeclared identifier warnings.

- **🔎 Real-Time Token Stream & Grammar Traces**:
  - Searchable, filterable table of all tokens with quick jump to code editor.
  - Real-time ANSI C BNF production rule tracer.

- **💻 Sleek Code Editor (`editor.js`)**:
  - Line numbers gutter with error marker dots.
  - Multi-pass syntax highlighting overlay.
  - Cursor coordinates and character counts.
  - Curated sample library (Fibonacci, Linked List, Operator Precedence, Control Flow, Error Recovery).

---

## 🚀 Quick Start

### 1. Clone the repository
```bash
git clone <repository-url>
cd c-parser-studio
```

### 2. Run Locally
Because this project uses standard ES modules and vanilla web standards, it requires no build step.

Using Node.js:
```bash
npx serve -l 5173 -n .
```
Or with Python:
```bash
python -m http.server 5173
```

Then open `http://localhost:5173` in your browser.

---

## 📂 Project Architecture

```
├── index.html              # Main workspace layout & views
├── package.json            # Project configuration & scripts
├── .gitignore              # Ignored files
├── README.md               # Documentation
├── css/
│   └── style.css           # Modern dark luxury design system
└── js/
    ├── lexer.js            # C tokenizer & lexical analysis
    ├── parser.js           # Recursive descent & Pratt parser
    ├── ast.js              # AST node factory & definitions
    ├── symbol-table.js     # Scope manager & symbol table
    ├── cfg.js              # Control Flow Graph generator
    ├── tree-visualizer.js  # Interactive SVG tree & graph visualizer
    ├── editor.js           # Code editor with syntax highlighting
    ├── samples.js          # Curated C language code examples
    └── app.js              # Application orchestrator
```

---

## 📜 License
MIT License. Built with ❤️ for computer science students, compiler enthusiasts, and developers.

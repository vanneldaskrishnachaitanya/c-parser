/**
 * High-performance code editor component with syntax highlighting,
 * line numbers, error squiggles, and AST node range highlighting.
 */

export class CodeEditor {
  constructor(containerElement, onCodeChange) {
    this.container = containerElement;
    this.onCodeChange = onCodeChange || (() => {});
    this.activeHighlightRange = null;
    this.errors = [];

    this.initEditor();
  }

  initEditor() {
    this.container.innerHTML = `
      <div class="editor-shell">
        <div class="editor-gutter" id="editor-gutter">
          <div class="line-numbers" id="line-numbers">1</div>
        </div>
        <div class="editor-content-area" id="editor-area">
          <pre class="editor-highlight-layer" id="highlight-layer" aria-hidden="true"><code></code></pre>
          <div class="editor-active-line-marker" id="active-line-marker"></div>
          <div class="editor-selection-overlay" id="selection-overlay"></div>
          <textarea class="editor-textarea" id="editor-input" spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="off"></textarea>
        </div>
      </div>
      <div class="editor-statusbar">
        <div class="status-left">
          <span class="status-badge status-c">C99 / C11</span>
          <span class="status-item" id="editor-pos">Ln 1, Col 1</span>
          <span class="status-item" id="editor-length">0 chars</span>
        </div>
        <div class="status-right">
          <span class="status-item" id="editor-lines-count">1 line</span>
          <span class="status-item">UTF-8</span>
          <span class="status-item">Spaces: 4</span>
        </div>
      </div>
    `;

    this.textarea = this.container.querySelector('#editor-input');
    this.highlightPre = this.container.querySelector('#highlight-layer');
    this.highlightLayer = this.container.querySelector('#highlight-layer code');
    this.lineNumbers = this.container.querySelector('#line-numbers');
    this.activeMarker = this.container.querySelector('#active-line-marker');
    this.selectionOverlay = this.container.querySelector('#selection-overlay');
    this.posEl = this.container.querySelector('#editor-pos');
    this.lengthEl = this.container.querySelector('#editor-length');
    this.linesCountEl = this.container.querySelector('#editor-lines-count');

    this.bindEvents();
  }

  bindEvents() {
    // Input handling
    this.textarea.addEventListener('input', () => {
      this.updateHighlighting();
      this.updateLineNumbers();
      this.updateStatus();
      this.onCodeChange(this.textarea.value);
    });

    // Scroll synchronization — sync highlight layer via transform (content-area is overflow:hidden)
    this.textarea.addEventListener('scroll', () => {
      const st = this.textarea.scrollTop;
      const sl = this.textarea.scrollLeft;
      // Shift highlight layer to match textarea scroll position
      this.highlightPre.style.transform = `translate(${-sl}px, ${-st}px)`;
      // Sync gutter line numbers
      this.lineNumbers.style.transform = `translateY(${-st}px)`;
      this.updateActiveLine();
    });

    // Cursor position & selection tracking
    const updateCursor = () => {
      this.updateCursorPosition();
      this.updateActiveLine();
    };

    this.textarea.addEventListener('keyup', updateCursor);
    this.textarea.addEventListener('click', updateCursor);
    this.textarea.addEventListener('select', updateCursor);

    // Tab key handling (indent 4 spaces)
    this.textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        const value = this.textarea.value;

        this.textarea.value = value.substring(0, start) + '    ' + value.substring(end);
        this.textarea.selectionStart = this.textarea.selectionEnd = start + 4;
        this.updateHighlighting();
        this.updateLineNumbers();
        this.onCodeChange(this.textarea.value);
      }
    });
  }

  setValue(code) {
    this.textarea.value = code;
    this.updateHighlighting();
    this.updateLineNumbers();
    this.updateStatus();
    this.updateActiveLine();
  }

  getValue() {
    return this.textarea.value;
  }

  updateLineNumbers() {
    const lines = this.textarea.value.split('\n');
    let numbersHtml = '';
    const errLines = new Set(this.errors.map(e => e.line));

    for (let i = 1; i <= lines.length; i++) {
      const hasErr = errLines.has(i);
      numbersHtml += `<div class="gutter-line ${hasErr ? 'gutter-error' : ''}" data-line="${i}">${hasErr ? '<span class="gutter-err-dot" title="Syntax error">●</span>' : ''}${i}</div>`;
    }
    this.lineNumbers.innerHTML = numbersHtml;
  }

  updateCursorPosition() {
    const val = this.textarea.value;
    const pos = this.textarea.selectionStart;
    const lines = val.substring(0, pos).split('\n');
    const line = lines.length;
    const col = lines[lines.length - 1].length + 1;

    this.posEl.textContent = `Ln ${line}, Col ${col}`;
  }

  updateStatus() {
    const val = this.textarea.value;
    const lines = val.split('\n').length;
    this.lengthEl.textContent = `${val.length} chars`;
    this.linesCountEl.textContent = `${lines} line${lines > 1 ? 's' : ''}`;
  }

  updateActiveLine() {
    const val = this.textarea.value;
    const pos = this.textarea.selectionStart;
    const lineIndex = val.substring(0, pos).split('\n').length - 1;
    // Read the actual computed line-height so it never drifts from CSS
    const lineHeight = parseFloat(getComputedStyle(this.textarea).lineHeight) || 21;
    // padding-top must be added so the marker aligns with the first line correctly
    const paddingTop = parseFloat(getComputedStyle(this.textarea).paddingTop) || 10;
    const topPos = paddingTop + lineIndex * lineHeight - this.textarea.scrollTop;
    this.activeMarker.style.top = `${topPos}px`;
  }

  setErrors(errors) {
    this.errors = errors || [];
    this.updateLineNumbers();
    this.updateHighlighting();
  }

  highlightRange(start, end) {
    if (start === undefined || end === undefined) return;
    this.textarea.focus();
    this.textarea.setSelectionRange(start, end);
    this.updateCursorPosition();
    this.updateActiveLine();

    // Scroll to selection if out of view
    const val = this.textarea.value;
    const lineIndex = val.substring(0, start).split('\n').length - 1;
    const lineHeight = 21;
    const targetScroll = lineIndex * lineHeight - 100;
    this.textarea.scrollTo({
      top: Math.max(0, targetScroll),
      behavior: 'smooth'
    });
  }

  updateHighlighting() {
    const code = this.textarea.value;
    this.highlightLayer.innerHTML = this.highlightC(code);
  }

  escape(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  highlightC(code) {
    // High-fidelity syntax highlighter with regex passes
    const tokens = [];

    // Comments: //... and /*...*/
    const commentRegex = /\/\/.*|\/\*[\s\S]*?\*\//g;
    // Strings & Chars
    const stringRegex = /"([^"\\]|\\.)*"|'([^'\\]|\\.)*'/g;
    // Preprocessor directives
    const preprocRegex = /^\s*#[a-zA-Z_]\w*([^\n\\]|\\.)*/gm;
    // Numbers
    const numberRegex = /\b0[xX][0-9a-fA-F]+|\b0[bB][01]+|\b\d+(\.\d+)?([eE][+-]?\d+)?[fFuUlL]*\b/g;
    // Keywords
    const keywordRegex = /\b(auto|break|case|char|const|continue|default|do|double|else|enum|extern|float|for|goto|if|inline|int|long|register|restrict|return|short|signed|sizeof|static|struct|switch|typedef|union|unsigned|void|volatile|while|_Bool|_Complex|_Imaginary)\b/g;
    // Standard library functions & types
    const stdRegex = /\b(printf|scanf|malloc|free|exit|size_t|uint8_t|uint16_t|uint32_t|int32_t|FILE|NULL|stdin|stdout|stderr)\b/g;
    // Operators
    const opRegex = /(->|\+\+|--|<=|>=|==|!=|&&|\|\||<<|>>|\+=|-=|\*=|\/=|%=|&=|\|=|\^=|\+|-|\*|\/|%|=|<|>|!|~|&|\||\^|\?|:)/g;

    const ranges = [];

    const addRanges = (regex, cls) => {
      let match;
      while ((match = regex.exec(code)) !== null) {
        ranges.push({
          start: match.index,
          end: match.index + match[0].length,
          cls
        });
      }
    };

    addRanges(commentRegex, 'tok-comment');
    addRanges(stringRegex, 'tok-string');
    addRanges(preprocRegex, 'tok-preproc');
    addRanges(keywordRegex, 'tok-keyword');
    addRanges(stdRegex, 'tok-std');
    addRanges(numberRegex, 'tok-number');
    addRanges(opRegex, 'tok-operator');

    // Sort ranges and filter overlapping
    ranges.sort((a, b) => a.start - b.start || b.end - a.end);

    const nonOverlapping = [];
    let lastEnd = 0;
    for (const r of ranges) {
      if (r.start >= lastEnd) {
        nonOverlapping.push(r);
        lastEnd = r.end;
      }
    }

    // Build highlighted HTML string
    let result = '';
    let curr = 0;
    for (const r of nonOverlapping) {
      if (r.start > curr) {
        result += this.escape(code.substring(curr, r.start));
      }
      result += `<span class="${r.cls}">${this.escape(code.substring(r.start, r.end))}</span>`;
      curr = r.end;
    }
    if (curr < code.length) {
      result += this.escape(code.substring(curr));
    }

    // Add trailing newline if needed to match textarea scroll height
    if (code.endsWith('\n')) {
      result += '\n';
    }

    return result;
  }
}

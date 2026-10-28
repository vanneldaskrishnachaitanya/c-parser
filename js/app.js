/**
 * C Language Parser Studio - Main Application Orchestrator
 */

import { Lexer } from './lexer.js';
import { Parser } from './parser.js';
import { ASTNodeType } from './ast.js';
import { SymbolAnalyzer } from './symbol-table.js';
import { CFGBuilder } from './cfg.js';
import { TreeVisualizer } from './tree-visualizer.js';
import { CodeEditor } from './editor.js';
import { C_SAMPLES } from './samples.js';

class App {
  constructor() {
    this.currentAST = null;
    this.currentTokens = [];
    this.currentCFG = null;
    this.currentSymbols = null;
    this.parseTimer = null;
    this.activeTab = 'tab-ast';

    this.initUI();
    this.initComponents();
    this.bindEvents();

    // Load initial sample
    this.loadSample('fibonacci');
  }

  initUI() {
    // Populate sample select
    const sampleSelect = document.getElementById('sample-select');
    sampleSelect.innerHTML = Object.entries(C_SAMPLES).map(([key, item]) => `
      <option value="${key}">${item.name}</option>
    `).join('');
  }

  initComponents() {
    // Code Editor
    const editorContainer = document.getElementById('editor-container');
    this.editor = new CodeEditor(editorContainer, (newCode) => {
      this.handleCodeChange(newCode);
    });

    // Tree Visualizer
    const visualizerContainer = document.getElementById('visualizer-container');
    this.visualizer = new TreeVisualizer(visualizerContainer, (selectedNode) => {
      this.handleNodeSelected(selectedNode);
    });
  }

  bindEvents() {
    // Sample change
    document.getElementById('sample-select').addEventListener('change', (e) => {
      this.loadSample(e.target.value);
    });

    // Parse button
    document.getElementById('btn-parse').addEventListener('click', () => {
      this.runPipeline();
    });

    // Format / clean code button
    document.getElementById('btn-format').addEventListener('click', () => {
      this.formatCode();
    });

    // Clear code button
    document.getElementById('btn-clear').addEventListener('click', () => {
      this.editor.setValue('');
      this.runPipeline();
    });

    // Copy JSON AST
    document.getElementById('btn-copy-ast').addEventListener('click', () => {
      if (!this.currentAST) return;
      navigator.clipboard.writeText(JSON.stringify(this.currentAST, null, 2)).then(() => {
        this.showToast('AST JSON copied to clipboard!');
      });
    });

    // Export SVG
    document.getElementById('btn-export-svg').addEventListener('click', () => {
      this.exportSVG();
    });

    // Tab switching
    document.querySelectorAll('.view-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.getAttribute('data-tab');
        this.switchTab(target);
      });
    });

    // Keyboard shortcut (Ctrl+Enter to parse)
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.runPipeline();
      }
    });

    // Node inspector close button
    document.getElementById('btn-close-inspector').addEventListener('click', () => {
      document.getElementById('node-inspector').classList.remove('open');
    });

    // CFG function selector
    document.getElementById('cfg-func-select').addEventListener('change', (e) => {
      this.updateCFGView(e.target.value);
    });

    // Token filter
    const tokenFilterInput = document.getElementById('token-search');
    if (tokenFilterInput) {
      tokenFilterInput.addEventListener('input', (e) => {
        this.filterTokens(e.target.value);
      });
    }

    // Token type filter select
    const tokenTypeSelect = document.getElementById('token-type-filter');
    if (tokenTypeSelect) {
      tokenTypeSelect.addEventListener('change', () => {
        this.filterTokens(tokenFilterInput.value);
      });
    }
  }

  loadSample(sampleKey) {
    const sample = C_SAMPLES[sampleKey];
    if (!sample) return;
    this.editor.setValue(sample.code);
    this.runPipeline();
  }

  handleCodeChange() {
    clearTimeout(this.parseTimer);
    this.parseTimer = setTimeout(() => {
      this.runPipeline();
    }, 280);
  }

  runPipeline() {
    const code = this.editor.getValue();
    const t0 = performance.now();

    // 1. Lexical Analysis
    const lexer = new Lexer(code, { includeComments: true });
    const lexResult = lexer.tokenize();
    this.currentTokens = lexResult.tokens;

    // 2. Syntactic Analysis (Parsing)
    const parser = new Parser(lexResult.tokens, code);
    const parseResult = parser.parse();
    this.currentAST = parseResult.ast;

    const t1 = performance.now();
    const parseTimeMs = (t1 - t0).toFixed(2);

    // Merge errors
    const allErrors = [...lexResult.errors, ...parseResult.errors];

    // 3. Semantic Analysis (Symbol Table)
    const symbolAnalyzer = new SymbolAnalyzer(this.currentAST);
    this.currentSymbols = symbolAnalyzer.analyze();

    // Count AST nodes
    const nodeCount = this.countNodes(this.currentAST);

    // Update Stats Bar
    this.updateStats({
      timeMs: parseTimeMs,
      tokensCount: this.currentTokens.length,
      nodesCount: nodeCount,
      maxDepth: parseResult.maxDepth,
      errorsCount: allErrors.length,
      warningsCount: this.currentSymbols.warnings.length
    });

    // Update Editor Error Highlights
    this.editor.setErrors(allErrors);

    // Update Diagnostics Panel
    this.renderDiagnostics(allErrors, this.currentSymbols.warnings);

    // Update Active View
    this.updateActiveTabContent(parseResult.grammarTraces);
  }

  updateStats(stats) {
    document.getElementById('stat-time').textContent = `${stats.timeMs} ms`;
    document.getElementById('stat-tokens').textContent = stats.tokensCount;
    document.getElementById('stat-nodes').textContent = stats.nodesCount;
    document.getElementById('stat-depth').textContent = stats.maxDepth;

    const statusBadge = document.getElementById('parse-status-badge');
    if (stats.errorsCount > 0) {
      statusBadge.className = 'status-badge error';
      statusBadge.innerHTML = `<span class="badge-dot"></span>${stats.errorsCount} Error${stats.errorsCount > 1 ? 's' : ''}`;
    } else if (stats.warningsCount > 0) {
      statusBadge.className = 'status-badge warning';
      statusBadge.innerHTML = `<span class="badge-dot"></span>${stats.warningsCount} Warning${stats.warningsCount > 1 ? 's' : ''}`;
    } else {
      statusBadge.className = 'status-badge success';
      statusBadge.innerHTML = `<span class="badge-dot"></span>Valid C AST`;
    }
  }

  countNodes(root) {
    if (!root) return 0;
    let count = 1;
    for (const child of root.getChildren()) {
      count += this.countNodes(child.node);
    }
    return count;
  }

  switchTab(tabId) {
    this.activeTab = tabId;

    document.querySelectorAll('.view-tab').forEach(t => {
      t.classList.toggle('active', t.getAttribute('data-tab') === tabId);
    });

    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === tabId);
    });

    this.updateActiveTabContent();
  }

  updateActiveTabContent(grammarTraces = []) {
    switch (this.activeTab) {
      case 'tab-ast':
        this.visualizer.setAST(this.currentAST);
        break;

      case 'tab-tree':
        this.renderOutlineTree();
        break;

      case 'tab-tokens':
        this.renderTokensTable();
        break;

      case 'tab-symbols':
        this.renderSymbolsTable();
        break;

      case 'tab-cfg':
        this.initCFGSelector();
        break;

      case 'tab-grammar':
        this.renderGrammarRules(grammarTraces);
        break;
    }
  }

  // ==========================================
  // Outline Tree View
  // ==========================================
  renderOutlineTree() {
    const container = document.getElementById('tree-view-content');
    if (!this.currentAST) {
      container.innerHTML = '<div class="empty-state">No AST available</div>';
      return;
    }

    container.innerHTML = this.buildOutlineTreeHTML(this.currentAST);

    // Attach tree toggle listeners
    container.querySelectorAll('.tree-node-header').forEach(header => {
      header.addEventListener('click', (e) => {
        const row = header.closest('.tree-node-row');
        row.classList.toggle('collapsed');
        const nodeId = header.getAttribute('data-node-id');
        const node = this.findNodeById(this.currentAST, nodeId);
        if (node) {
          this.handleNodeSelected(node);
        }
      });
    });
  }

  buildOutlineTreeHTML(node, propName = 'root') {
    if (!node) return '';
    const children = node.getChildren ? node.getChildren() : [];
    const hasChildren = children.length > 0;
    const summary = this.visualizer.getNodeSummary(node);
    const category = this.visualizer.getNodeCategory(node.type);

    let html = `
      <div class="tree-node-row" data-node-id="${node.id}">
        <div class="tree-node-header" data-node-id="${node.id}">
          <span class="tree-expander ${hasChildren ? '' : 'leaf'}">
            ${hasChildren ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>' : '•'}
          </span>
          <span class="tree-prop-label">${propName}:</span>
          <span class="tree-type-tag ${category}">${node.type}</span>
          ${summary ? `<span class="tree-summary">${this.escape(summary)}</span>` : ''}
          <span class="tree-loc">L${node.loc?.line || 1}:${node.loc?.col || 1}</span>
        </div>
    `;

    if (hasChildren) {
      html += `<div class="tree-children">`;
      for (const child of children) {
        html += this.buildOutlineTreeHTML(child.node, child.prop);
      }
      html += `</div>`;
    }

    html += `</div>`;
    return html;
  }

  // ==========================================
  // Tokens Table
  // ==========================================
  renderTokensTable() {
    const tbody = document.getElementById('tokens-tbody');
    if (!this.currentTokens || this.currentTokens.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No tokens</td></tr>';
      return;
    }

    this.filterTokens(document.getElementById('token-search')?.value || '');
  }

  filterTokens(query = '') {
    const tbody = document.getElementById('tokens-tbody');
    const typeFilter = document.getElementById('token-type-filter')?.value || 'ALL';
    const q = query.toLowerCase().trim();

    const filtered = this.currentTokens.filter(t => {
      if (typeFilter !== 'ALL' && t.type !== typeFilter) return false;
      if (q && !t.value.toLowerCase().includes(q) && !t.type.toLowerCase().includes(q)) return false;
      return true;
    });

    tbody.innerHTML = filtered.map(t => `
      <tr class="token-row" data-start="${t.start}" data-end="${t.end}">
        <td class="col-id">#${t.id}</td>
        <td><span class="token-badge tok-badge-${t.type.toLowerCase()}">${t.type}</span></td>
        <td class="col-val"><code>${this.escape(t.value)}</code></td>
        <td>Ln ${t.line}, Col ${t.col}</td>
        <td><code>${t.start}..${t.end}</code></td>
        <td class="col-action">
          <button class="btn-jump-token" title="Jump to in editor">Focus</button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.token-row').forEach(row => {
      row.addEventListener('click', () => {
        const start = parseInt(row.getAttribute('data-start'), 10);
        const end = parseInt(row.getAttribute('data-end'), 10);
        this.editor.highlightRange(start, end);
      });
    });
  }

  // ==========================================
  // Symbols Table
  // ==========================================
  renderSymbolsTable() {
    const tbody = document.getElementById('symbols-tbody');
    if (!this.currentSymbols || this.currentSymbols.allSymbols.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No symbols declared</td></tr>';
      return;
    }

    tbody.innerHTML = this.currentSymbols.allSymbols.map(sym => `
      <tr class="symbol-row" data-line="${sym.line}">
        <td><strong>${this.escape(sym.name)}</strong></td>
        <td><span class="symbol-kind-tag kind-${sym.kind.toLowerCase()}">${sym.kind}</span></td>
        <td><code>${this.escape(sym.type)}</code></td>
        <td>${this.escape(sym.scope)}</td>
        <td><span class="scope-depth-pill">Level ${sym.level}</span></td>
        <td>Ln ${sym.line}:${sym.col}</td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.symbol-row').forEach(row => {
      row.addEventListener('click', () => {
        const line = parseInt(row.getAttribute('data-line'), 10);
        const code = this.editor.getValue();
        const lines = code.split('\n');
        let charPos = 0;
        for (let i = 0; i < line - 1 && i < lines.length; i++) {
          charPos += lines[i].length + 1;
        }
        const lineLen = lines[line - 1]?.length || 0;
        this.editor.highlightRange(charPos, charPos + lineLen);
      });
    });
  }

  // ==========================================
  // Control Flow Graph (CFG)
  // ==========================================
  initCFGSelector() {
    const select = document.getElementById('cfg-func-select');
    const functions = [];

    if (this.currentAST && this.currentAST.declarations) {
      for (const decl of this.currentAST.declarations) {
        if (decl.type === ASTNodeType.FUNCTION_DEFINITION && decl.body) {
          functions.push(decl);
        }
      }
    }

    if (functions.length === 0) {
      select.innerHTML = '<option value="">No functions with body</option>';
      const vizContainer = document.getElementById('cfg-visualizer-container');
      vizContainer.innerHTML = '<div class="empty-state">No function bodies found to generate Control Flow Graph.</div>';
      return;
    }

    select.innerHTML = functions.map(f => `<option value="${f.name}">${f.name}()</option>`).join('');
    this.updateCFGView(functions[0].name);
  }

  updateCFGView(funcName) {
    if (!funcName || !this.currentAST) return;
    const funcNode = this.currentAST.declarations.find(
      d => d.type === ASTNodeType.FUNCTION_DEFINITION && d.name === funcName
    );

    if (!funcNode) return;

    const builder = new CFGBuilder(funcNode);
    this.currentCFG = builder.build();

    const vizContainer = document.getElementById('cfg-visualizer-container');
    if (!this.cfgVisualizer) {
      this.cfgVisualizer = new TreeVisualizer(vizContainer, () => {});
    }
    this.cfgVisualizer.renderCFG(this.currentCFG);
  }

  // ==========================================
  // Grammar Rules
  // ==========================================
  renderGrammarRules(traces = []) {
    const container = document.getElementById('grammar-traces-list');
    if (!traces || traces.length === 0) {
      container.innerHTML = '<div class="empty-state">No grammar traces recorded</div>';
      return;
    }

    container.innerHTML = traces.slice(0, 50).map((t, idx) => `
      <div class="grammar-rule-card">
        <span class="grammar-idx">#${idx + 1}</span>
        <div class="grammar-body">
          <span class="grammar-name">&lt;${t.rule}&gt;</span>
          ${t.info ? `<span class="grammar-info">${this.escape(t.info)}</span>` : ''}
        </div>
        <span class="grammar-loc">Ln ${t.line}:${t.col}</span>
      </div>
    `).join('');
  }

  // ==========================================
  // Diagnostics
  // ==========================================
  renderDiagnostics(errors, warnings) {
    const panel = document.getElementById('diagnostics-panel');
    const badge = document.getElementById('diag-count-badge');
    const total = errors.length + warnings.length;
    badge.textContent = `${total} issue${total === 1 ? '' : 's'}`;

    if (total === 0) {
      panel.innerHTML = '<div class="diag-clean"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> No syntax errors or warnings detected. Parser passed cleanly!</div>';
      return;
    }

    const code = this.editor.getValue();
    const lines = code.split('\n');

    let html = '';

    for (const err of errors) {
      const lineText = lines[err.line - 1] || '';
      const caret = ' '.repeat(Math.max(0, err.col - 1)) + '^';

      html += `
        <div class="diag-item error" data-start="${err.start}" data-end="${err.end}">
          <div class="diag-header">
            <span class="diag-type-tag error">ERROR</span>
            <span class="diag-msg">${this.escape(err.message)}</span>
            <span class="diag-pos">Line ${err.line}, Column ${err.col}</span>
          </div>
          <pre class="diag-snippet"><code>${this.escape(lineText)}\n<span class="diag-caret">${caret}</span></code></pre>
        </div>
      `;
    }

    for (const warn of warnings) {
      html += `
        <div class="diag-item warning" data-line="${warn.line}">
          <div class="diag-header">
            <span class="diag-type-tag warning">WARNING</span>
            <span class="diag-msg">${this.escape(warn.message)}</span>
            <span class="diag-pos">Line ${warn.line}, Column ${warn.col}</span>
          </div>
        </div>
      `;
    }

    panel.innerHTML = html;

    // Click diagnostic to jump
    panel.querySelectorAll('.diag-item').forEach(item => {
      item.addEventListener('click', () => {
        const start = parseInt(item.getAttribute('data-start'), 10);
        const end = parseInt(item.getAttribute('data-end'), 10);
        if (!isNaN(start) && !isNaN(end)) {
          this.editor.highlightRange(start, Math.max(start + 1, end));
        }
      });
    });
  }

  // ==========================================
  // Node Inspector
  // ==========================================
  handleNodeSelected(node) {
    if (!node) return;
    const inspector = document.getElementById('node-inspector');
    inspector.classList.add('open');

    document.getElementById('inspect-node-type').textContent = node.type;
    document.getElementById('inspect-node-id').textContent = node.id;
    document.getElementById('inspect-node-loc').textContent = `Ln ${node.loc?.line || 1}:${node.loc?.col || 1} (Offset ${node.loc?.start || 0}..${node.loc?.end || 0})`;

    // Props table
    const propsList = document.getElementById('inspect-props-list');
    let propsHtml = '';
    for (const [key, val] of Object.entries(node)) {
      if (['loc', 'id', 'type', '_width'].includes(key)) continue;
      if (val instanceof Object && !Array.isArray(val) && val.type) {
        propsHtml += `<div class="inspect-prop-row"><span class="prop-key">${key}:</span> <span class="prop-val-obj">&lt;${val.type}&gt;</span></div>`;
      } else if (Array.isArray(val)) {
        propsHtml += `<div class="inspect-prop-row"><span class="prop-key">${key}:</span> <span class="prop-val-arr">Array[${val.length}]</span></div>`;
      } else {
        propsHtml += `<div class="inspect-prop-row"><span class="prop-key">${key}:</span> <span class="prop-val-prim">${this.escape(String(val))}</span></div>`;
      }
    }
    propsList.innerHTML = propsHtml || '<div class="empty-state">No direct scalar attributes</div>';

    // JSON snippet
    document.getElementById('inspect-json-code').textContent = JSON.stringify(node, (k, v) => (k === '_width' ? undefined : v), 2);

    // Jump to code in editor
    if (node.loc && node.loc.start !== undefined && node.loc.end !== undefined) {
      this.editor.highlightRange(node.loc.start, node.loc.end);
    }
  }

  findNodeById(root, id) {
    if (!root) return null;
    if (root.id === id) return root;
    for (const child of root.getChildren()) {
      const res = this.findNodeById(child.node, id);
      if (res) return res;
    }
    return null;
  }

  formatCode() {
    // Basic automatic C formatter: ensures proper indentation
    const code = this.editor.getValue();
    const lines = code.split('\n');
    let indent = 0;
    const formatted = lines.map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('}') || trimmed.startsWith(');')) {
        indent = Math.max(0, indent - 1);
      }
      const indented = '    '.repeat(indent) + trimmed;
      if (trimmed.endsWith('{')) {
        indent++;
      }
      return indented;
    }).join('\n');

    this.editor.setValue(formatted);
    this.runPipeline();
    this.showToast('Code indentation cleaned!');
  }

  exportSVG() {
    const svgEl = document.getElementById('ast-svg');
    if (!svgEl) return;
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svgEl);

    // Add XML declaration
    if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
      source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = 'c-ast-visualization.svg';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    this.showToast('SVG tree exported successfully!');
  }

  showToast(msg) {
    let toast = document.getElementById('app-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'app-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }

  escape(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}

// Initialize on DOM load
window.addEventListener('DOMContentLoaded', () => {
  new App();
});

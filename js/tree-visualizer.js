/**
 * Interactive SVG Tree & Graph Visualizer for AST & CFG
 * Includes zoom, pan, tidy layout, collapsible subtrees, and node inspection.
 */

import { ASTNodeType } from './ast.js';

export class TreeVisualizer {
  constructor(containerElement, onNodeSelect) {
    this.container = containerElement;
    this.onNodeSelect = onNodeSelect || (() => {});
    this.astRoot = null;
    this.collapsedNodes = new Set();
    this.selectedNodeId = null;

    // Viewport transform (zoom & pan)
    this.scale = 1.0;
    this.translateX = 0;
    this.translateY = 40;
    this.isPanning = false;
    this.startX = 0;
    this.startY = 0;

    this.initCanvas();
  }

  initCanvas() {
    this.container.innerHTML = `
      <div class="visualizer-wrapper">
        <div class="visualizer-toolbar">
          <div class="toolbar-group">
            <button class="viz-btn" id="btn-zoom-in" title="Zoom In">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
            </button>
            <button class="viz-btn" id="btn-zoom-out" title="Zoom Out">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
            </button>
            <button class="viz-btn" id="btn-zoom-reset" title="Reset View">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            </button>
            <button class="viz-btn" id="btn-fit-screen" title="Fit to Screen">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
            </button>
          </div>
          <div class="toolbar-group">
            <button class="viz-btn" id="btn-collapse-all" title="Collapse All">Collapse</button>
            <button class="viz-btn" id="btn-expand-all" title="Expand All">Expand</button>
          </div>
          <div class="zoom-indicator" id="zoom-level">100%</div>
        </div>
        <div class="svg-viewport" id="svg-viewport">
          <svg id="ast-svg" width="100%" height="100%">
            <defs>
              <linearGradient id="edge-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.6"/>
                <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0.6"/>
              </linearGradient>
              <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#06b6d4" />
              </marker>
              <marker id="arrowhead-loop" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#f59e0b" />
              </marker>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <g id="svg-scene" transform="translate(0, 40) scale(1)">
              <g id="edges-layer"></g>
              <g id="nodes-layer"></g>
            </g>
          </svg>
        </div>
      </div>
    `;

    this.svg = this.container.querySelector('#ast-svg');
    this.scene = this.container.querySelector('#svg-scene');
    this.edgesLayer = this.container.querySelector('#edges-layer');
    this.nodesLayer = this.container.querySelector('#nodes-layer');
    this.viewport = this.container.querySelector('#svg-viewport');
    this.zoomLevelEl = this.container.querySelector('#zoom-level');

    this.bindEvents();
  }

  bindEvents() {
    // Zoom buttons
    this.container.querySelector('#btn-zoom-in').addEventListener('click', () => this.zoom(1.2));
    this.container.querySelector('#btn-zoom-out').addEventListener('click', () => this.zoom(0.8));
    this.container.querySelector('#btn-zoom-reset').addEventListener('click', () => this.resetView());
    this.container.querySelector('#btn-fit-screen').addEventListener('click', () => this.fitToScreen());

    this.container.querySelector('#btn-collapse-all').addEventListener('click', () => {
      this.collapseAllDeep(this.astRoot, 2);
      this.render();
    });

    this.container.querySelector('#btn-expand-all').addEventListener('click', () => {
      this.collapsedNodes.clear();
      this.render();
    });

    // Mouse wheel zoom
    this.viewport.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
      const rect = this.viewport.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const newScale = Math.max(0.15, Math.min(3.5, this.scale * zoomFactor));
      this.translateX = mouseX - (mouseX - this.translateX) * (newScale / this.scale);
      this.translateY = mouseY - (mouseY - this.translateY) * (newScale / this.scale);
      this.scale = newScale;

      this.updateTransform();
    });

    // Pan drag
    this.viewport.addEventListener('mousedown', (e) => {
      if (e.target.closest('.ast-node-card')) return;
      this.isPanning = true;
      this.startX = e.clientX - this.translateX;
      this.startY = e.clientY - this.translateY;
      this.viewport.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isPanning) return;
      this.translateX = e.clientX - this.startX;
      this.translateY = e.clientY - this.startY;
      this.updateTransform();
    });

    window.addEventListener('mouseup', () => {
      if (this.isPanning) {
        this.isPanning = false;
        this.viewport.style.cursor = 'grab';
      }
    });
  }

  updateTransform() {
    this.scene.setAttribute('transform', `translate(${this.translateX}, ${this.translateY}) scale(${this.scale})`);
    this.zoomLevelEl.textContent = `${Math.round(this.scale * 100)}%`;
  }

  zoom(factor) {
    const rect = this.viewport.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const newScale = Math.max(0.15, Math.min(3.5, this.scale * factor));
    this.translateX = centerX - (centerX - this.translateX) * (newScale / this.scale);
    this.translateY = centerY - (centerY - this.translateY) * (newScale / this.scale);
    this.scale = newScale;
    this.updateTransform();
  }

  resetView() {
    const rect = this.viewport.getBoundingClientRect();
    this.scale = 1.0;
    this.translateX = rect.width / 2;
    this.translateY = 60;
    this.updateTransform();
  }

  fitToScreen() {
    if (!this.treeBounds) return;
    const rect = this.viewport.getBoundingClientRect();
    const padding = 80;
    const w = this.treeBounds.maxX - this.treeBounds.minX + padding * 2;
    const h = this.treeBounds.maxY - this.treeBounds.minY + padding * 2;

    const scaleX = rect.width / w;
    const scaleY = rect.height / h;
    this.scale = Math.max(0.2, Math.min(1.2, Math.min(scaleX, scaleY)));

    const treeCenterX = (this.treeBounds.minX + this.treeBounds.maxX) / 2;
    this.translateX = rect.width / 2 - treeCenterX * this.scale;
    this.translateY = 60;
    this.updateTransform();
  }

  collapseAllDeep(node, depthLimit) {
    if (!node) return;
    const traverse = (n, depth) => {
      const children = this.getVisibleChildren(n);
      if (children.length > 0) {
        if (depth >= depthLimit) {
          this.collapsedNodes.add(n.id);
        }
        for (const c of children) {
          traverse(c.node, depth + 1);
        }
      }
    };
    traverse(node, 1);
  }

  getVisibleChildren(node) {
    if (!node) return [];
    const children = [];
    for (const [key, val] of Object.entries(node)) {
      if (['loc', 'id', 'type'].includes(key)) continue;
      if (val && typeof val === 'object' && val.type) {
        children.push({ label: key, node: val });
      } else if (Array.isArray(val)) {
        val.forEach((item, idx) => {
          if (item && typeof item === 'object' && item.type) {
            children.push({ label: `${key}[${idx}]`, node: item });
          }
        });
      }
    }
    return children;
  }

  getNodeCategory(type) {
    if (!type) return 'other';
    if (type.includes('Statement')) return 'statement';
    if (type.includes('Declaration') || type.includes('Definition') || type === 'Parameter') return 'declaration';
    if (type.includes('Expression')) return 'expression';
    if (type.includes('Literal') || type === 'Identifier') return 'literal';
    if (type.includes('Type') || type === 'TypeSpecifier') return 'type';
    if (type === 'ErrorNode') return 'error';
    return 'structure';
  }

  getNodeSummary(node) {
    if (!node) return '';
    switch (node.type) {
      case ASTNodeType.IDENTIFIER: return node.name;
      case ASTNodeType.NUMERIC_LITERAL: return node.raw || String(node.value);
      case ASTNodeType.STRING_LITERAL: return `"${node.value.replace(/"/g, '\\"')}"`;
      case ASTNodeType.CHAR_LITERAL: return `'${node.value}'`;
      case ASTNodeType.BINARY_EXPRESSION:
      case ASTNodeType.ASSIGNMENT_EXPRESSION:
      case ASTNodeType.UNARY_EXPRESSION:
      case ASTNodeType.UPDATE_EXPRESSION:
        return node.operator;
      case ASTNodeType.FUNCTION_DEFINITION: return `${node.name}()`;
      case ASTNodeType.DECLARATOR: return node.name;
      case ASTNodeType.TYPE_SPECIFIER: return node.name;
      case ASTNodeType.PREPROCESSOR: return node.directive;
      case ASTNodeType.IF_STATEMENT: return 'if (...)';
      case ASTNodeType.WHILE_STATEMENT: return 'while (...)';
      case ASTNodeType.FOR_STATEMENT: return 'for (...)';
      case ASTNodeType.RETURN_STATEMENT: return 'return';
      case ASTNodeType.STRUCT_DECLARATION: return node.name || 'struct';
      case ASTNodeType.CALL_EXPRESSION: return 'call()';
      default: return '';
    }
  }

  setAST(astRoot) {
    this.astRoot = astRoot;
    this.selectedNodeId = null;
    const rect = this.viewport.getBoundingClientRect();
    this.translateX = rect.width / 2;
    this.translateY = 60;
    this.scale = 1.0;
    this.render();
    setTimeout(() => this.fitToScreen(), 60);
  }

  render() {
    if (!this.astRoot) {
      this.edgesLayer.innerHTML = '';
      this.nodesLayer.innerHTML = '<text x="0" y="40" fill="#94a3b8" font-size="14" text-anchor="middle">No AST data to visualize</text>';
      return;
    }

    // Compute layout coordinates
    const layout = this.computeTreeLayout(this.astRoot);
    this.treeBounds = layout.bounds;

    // Render edges
    let edgesSvg = '';
    for (const edge of layout.edges) {
      const x1 = edge.from.x;
      const y1 = edge.from.y + 24;
      const x2 = edge.to.x;
      const y2 = edge.to.y - 20;
      const cy = (y1 + y2) / 2;

      edgesSvg += `
        <path d="M ${x1} ${y1} C ${x1} ${cy}, ${x2} ${cy}, ${x2} ${y2}"
              class="tree-edge"
              stroke="url(#edge-grad)"
              stroke-width="2"
              fill="none" />
      `;

      if (edge.label) {
        const lx = (x1 + x2) / 2;
        const ly = cy;
        edgesSvg += `
          <rect x="${lx - 28}" y="${ly - 9}" width="56" height="18" rx="4" class="edge-label-bg" />
          <text x="${lx}" y="${ly + 3}" class="edge-label-text" text-anchor="middle">${edge.label}</text>
        `;
      }
    }
    this.edgesLayer.innerHTML = edgesSvg;

    // Render nodes
    let nodesSvg = '';
    for (const item of layout.nodes) {
      const { node, x, y, hasChildren, isCollapsed } = item;
      const category = this.getNodeCategory(node.type);
      const summary = this.getNodeSummary(node);
      const isSelected = this.selectedNodeId === node.id;

      const cardW = 150;
      const cardH = 46;
      const cardX = x - cardW / 2;
      const cardY = y - cardH / 2;

      nodesSvg += `
        <g class="ast-node-card ${category} ${isSelected ? 'selected' : ''}"
           data-node-id="${node.id}"
           transform="translate(${cardX}, ${cardY})">
          <rect width="${cardW}" height="${cardH}" rx="8" class="node-bg" />
          <rect width="4" height="${cardH}" rx="2" class="node-accent-bar" />
          <text x="12" y="19" class="node-type-title">${this.formatTypeTitle(node.type)}</text>
          <text x="12" y="36" class="node-summary-text" title="${summary}">${this.escapeHtml(summary)}</text>
          ${hasChildren ? `
            <g class="node-toggle" data-toggle-id="${node.id}" transform="translate(${cardW - 24}, 12)">
              <rect width="18" height="18" rx="4" class="toggle-bg" />
              <text x="9" y="13" class="toggle-icon" text-anchor="middle">${isCollapsed ? '+' : '−'}</text>
            </g>
          ` : ''}
        </g>
      `;
    }
    this.nodesLayer.innerHTML = nodesSvg;

    // Attach click handlers to nodes and toggles
    this.attachNodeListeners(layout.nodeMap);
    this.updateTransform();
  }

  formatTypeTitle(type) {
    if (!type) return '';
    return type
      .replace('Expression', 'Expr')
      .replace('Statement', 'Stmt')
      .replace('Declaration', 'Decl')
      .replace('Definition', 'Def');
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  attachNodeListeners(nodeMap) {
    // Node selection
    this.nodesLayer.querySelectorAll('.ast-node-card').forEach(el => {
      el.addEventListener('click', (e) => {
        // If clicked on collapse/expand toggle, handle toggle instead
        const toggle = e.target.closest('.node-toggle');
        if (toggle) {
          const toggleId = toggle.getAttribute('data-toggle-id');
          if (this.collapsedNodes.has(toggleId)) {
            this.collapsedNodes.delete(toggleId);
          } else {
            this.collapsedNodes.add(toggleId);
          }
          this.render();
          return;
        }

        const nodeId = el.getAttribute('data-node-id');
        this.selectedNodeId = nodeId;
        const targetNode = nodeMap.get(nodeId);
        if (targetNode) {
          this.onNodeSelect(targetNode);
          this.nodesLayer.querySelectorAll('.ast-node-card').forEach(c => c.classList.remove('selected'));
          el.classList.add('selected');
        }
      });
    });
  }

  computeTreeLayout(root) {
    const nodes = [];
    const edges = [];
    const nodeMap = new Map();
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    // Calculate subtree widths
    const calcWidth = (node) => {
      nodeMap.set(node.id, node);
      const isCollapsed = this.collapsedNodes.has(node.id);
      const children = isCollapsed ? [] : this.getVisibleChildren(node);

      if (children.length === 0) {
        node._width = 170;
        return node._width;
      }

      let totalW = 0;
      for (const child of children) {
        totalW += calcWidth(child.node);
      }
      node._width = Math.max(170, totalW);
      return node._width;
    };

    calcWidth(root);

    // Assign X, Y coordinates
    const assignCoords = (node, x, y) => {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);

      const isCollapsed = this.collapsedNodes.has(node.id);
      const allChildren = this.getVisibleChildren(node);
      const hasChildren = allChildren.length > 0;
      const children = isCollapsed ? [] : allChildren;

      nodes.push({
        node,
        x,
        y,
        hasChildren,
        isCollapsed
      });

      if (children.length > 0) {
        let startX = x - node._width / 2;
        for (const child of children) {
          const childW = child.node._width;
          const childX = startX + childW / 2;
          const childY = y + 100;

          edges.push({
            from: { x, y },
            to: { x: childX, y: childY },
            label: child.label
          });

          assignCoords(child.node, childX, childY);
          startX += childW;
        }
      }
    };

    assignCoords(root, 0, 0);

    return {
      nodes,
      edges,
      nodeMap,
      bounds: { minX, maxX, minY, maxY }
    };
  }

  // ==========================================
  // Control Flow Graph (CFG) Renderer
  // ==========================================
  renderCFG(cfgData) {
    if (!cfgData || !cfgData.blocks || cfgData.blocks.length === 0) {
      this.edgesLayer.innerHTML = '';
      this.nodesLayer.innerHTML = '<text x="0" y="40" fill="#94a3b8" font-size="14" text-anchor="middle">No CFG data available for this function</text>';
      return;
    }

    const blocks = cfgData.blocks;
    const blockWidth = 200;
    const blockHeight = 85;
    const layerSpacingY = 130;

    // Simple layered layout: order blocks sequentially or in branched lanes
    const blockCoords = new Map();
    let currentY = 0;
    let maxLaneWidth = 0;

    blocks.forEach((block, idx) => {
      // Determine lane offset based on block type
      let laneX = 0;
      if (block.type === 'condition') {
        laneX = 0;
      } else if (block.label.includes('Then')) {
        laneX = -130;
      } else if (block.label.includes('Else')) {
        laneX = 130;
      } else if (block.type === 'loop') {
        laneX = 0;
      }

      blockCoords.set(block.id, { x: laneX, y: currentY });
      maxLaneWidth = Math.max(maxLaneWidth, Math.abs(laneX) + blockWidth);
      currentY += layerSpacingY;
    });

    // Edges
    let edgesSvg = '';
    blocks.forEach(block => {
      const fromPos = blockCoords.get(block.id);
      block.successors.forEach(succ => {
        const toPos = blockCoords.get(succ.target.id);
        if (fromPos && toPos) {
          const x1 = fromPos.x;
          const y1 = fromPos.y + blockHeight / 2;
          const x2 = toPos.x;
          const y2 = toPos.y - blockHeight / 2;

          const isLoopBack = toPos.y <= fromPos.y;
          let d = '';
          const marker = succ.edgeType === 'loop' ? 'url(#arrowhead-loop)' : 'url(#arrowhead)';

          if (isLoopBack) {
            // Arc to the left
            const loopX = Math.min(x1, x2) - 150;
            d = `M ${x1 - blockWidth / 2} ${fromPos.y} C ${loopX} ${fromPos.y}, ${loopX} ${toPos.y}, ${x2 - blockWidth / 2} ${toPos.y}`;
          } else {
            const midY = (y1 + y2) / 2;
            d = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
          }

          const strokeColor = succ.edgeType === 'true' ? '#10b981' :
                              succ.edgeType === 'false' ? '#ef4444' :
                              succ.edgeType === 'loop' ? '#f59e0b' : '#06b6d4';

          edgesSvg += `
            <path d="${d}" stroke="${strokeColor}" stroke-width="2.5" fill="none" marker-end="${marker}" />
          `;

          if (succ.label) {
            const lx = isLoopBack ? (x1 - 80) : ((x1 + x2) / 2);
            const ly = (y1 + y2) / 2;
            edgesSvg += `
              <rect x="${lx - 26}" y="${ly - 9}" width="52" height="18" rx="4" class="edge-label-bg" />
              <text x="${lx}" y="${ly + 3}" class="edge-label-text" text-anchor="middle" fill="${strokeColor}">${succ.label}</text>
            `;
          }
        }
      });
    });

    this.edgesLayer.innerHTML = edgesSvg;

    // Nodes
    let nodesSvg = '';
    blocks.forEach(block => {
      const pos = blockCoords.get(block.id);
      const bx = pos.x - blockWidth / 2;
      const by = pos.y - blockHeight / 2;

      let typeClass = 'cfg-normal';
      if (block.type === 'entry') typeClass = 'cfg-entry';
      if (block.type === 'exit') typeClass = 'cfg-exit';
      if (block.type === 'condition') typeClass = 'cfg-condition';
      if (block.type === 'loop') typeClass = 'cfg-loop';

      const instrText = block.instructions.slice(0, 3).map((instr, i) => `
        <text x="12" y="${46 + i * 16}" class="cfg-instr-text">${this.escapeHtml(instr)}</text>
      `).join('');

      nodesSvg += `
        <g class="cfg-block-card ${typeClass}" transform="translate(${bx}, ${by})">
          <rect width="${blockWidth}" height="${blockHeight}" rx="10" class="cfg-card-bg" />
          <rect width="4" height="${blockHeight}" rx="2" class="cfg-card-accent" />
          <text x="12" y="22" class="cfg-block-id">${block.id}: ${this.escapeHtml(block.label)}</text>
          ${instrText}
        </g>
      `;
    });

    this.nodesLayer.innerHTML = nodesSvg;
    this.treeBounds = {
      minX: -maxLaneWidth,
      maxX: maxLaneWidth,
      minY: -50,
      maxY: currentY + 100
    };
    setTimeout(() => this.fitToScreen(), 40);
  }
}

import { Entity } from '../models/entity.js';
import { Relation } from '../models/relation.js';
import { ENTITY_TYPES, LanguageCode } from '../i18n/language-config.js';
import { el, svgEl } from '../utils/dom-helper.js';

export interface GraphNode {
  id: string;
  name: string;
  type: string;
  relationCount: number;
  filePath?: string;
  summary?: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  relationType: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export const getEntityTypeColors = (lang: LanguageCode = 'zh-CN'): Record<string, string> => {
  const types = ENTITY_TYPES[lang] || ENTITY_TYPES['zh-CN'];
  const colors: Record<string, string> = {};
  types.forEach(t => {
    colors[t.type] = t.color;
  });
  colors['default'] = '#6366f1';
  return new Proxy(colors, {
    get(target, prop: string) {
      return target[prop] || target['default'];
    }
  });
};

export const getAllEntityTypes = (lang: LanguageCode = 'zh-CN'): string[] => {
  const types = ENTITY_TYPES[lang] || ENTITY_TYPES['zh-CN'];
  return types.map(t => t.type);
};

export const DEFAULT_NODE_SIZE = 20;
export const MIN_NODE_SIZE = 10;
export const MAX_NODE_SIZE = 50;
export const SIZE_SCALING_FACTOR = 3;

export const FORCE_CHARGE_STRENGTH = -300;
export const FORCE_LINK_DISTANCE = 100;
export const FORCE_LINK_STRENGTH = 0.5;
export const FORCE_CENTER_STRENGTH = 0.05;

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 4;
export const ZOOM_STEP = 0.1;

export const MAX_VISIBLE_NODES = 500;
export const CLUSTER_DISTANCE = 200;

export interface TooltipData {
  node: GraphNode;
  x: number;
  y: number;
}

export interface UpgradeModalData {
  isOpen: boolean;
  feature: string;
}

export interface NodePopupData {
  isOpen: boolean;
  node: GraphNode | null;
}

export class GraphView {
  private canvas: any;
  private ctx: any;
  private container: any;
  private nodes: GraphNode[] = [];
  private edges: GraphEdge[] = [];
  private isPro: boolean;
  private simulation: Simulation | null = null;
  private transform: { x: number; y: number; scale: number } = { x: 0, y: 0, scale: 1 };
  private hoveredNode: GraphNode | null = null;
  private selectedNode: GraphNode | null = null;
  private draggedNode: GraphNode | null = null;
  private isDragging: boolean = false;
  private isPanning: boolean = false;
  private lastMousePos: { x: number; y: number } = { x: 0, y: 0 };
  private animationFrameId: number | null = null;
  private typeFilters: Set<string> = new Set();
  private searchQuery: string = '';
  private highlightedNodes: Set<string> = new Set();
  private tooltip: TooltipData | null = null;
  private upgradeModal: UpgradeModalData = { isOpen: false, feature: '' };
  private nodePopup: NodePopupData = { isOpen: false, node: null };
  private onJumpToFile: ((filePath: string) => void) | null = null;
  private width: number = 0;
  private height: number = 0;
  private dpr: number = 1;
  private searchInput: any = null;
  private searchContainer: any = null;
  private plugin: any = null;
  private handleKeyDown: (e: KeyboardEvent) => void;
  private handleResize: () => void;
  private language: LanguageCode = 'zh-CN';

  constructor(container: HTMLElement, isPro: boolean = false, plugin?: any) {
    this.container = container;
    this.isPro = isPro;
    this.plugin = plugin || null;
    this.canvas = el('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    
    this.handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'f' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.searchInput?.focus();
      }
    };
    
    this.handleResize = () => {
      this.updateCanvasSize();
    };
    
    this.setupCanvas();
    this.setupEventListeners();
    this.typeFilters = new Set(getAllEntityTypes(this.language));
    this.setupSearchBox();
  }

  setLanguage(lang: LanguageCode): void {
    this.language = lang;
    this.typeFilters = new Set(getAllEntityTypes(this.language));
    this.render();
  }

  private setupSearchBox(): void {
    const isTrialActive = this.plugin?.isTrialActive?.() ?? false;
    const canSearch = this.isPro || isTrialActive;

    this.searchContainer = el('div', { cls: 'kg-graph-search-container' });

    const icon = el('div', { cls: 'kg-graph-search-icon' });

    const iconSvg = svgEl('svg', { attr: { width: '20', height: '20', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' } });
    iconSvg.setCssProps({ color: '#667eea' });
    const iconPath = svgEl('circle', { attr: { cx: '11', cy: '11', r: '8' } });
    const iconLine = svgEl('line', { attr: { x1: '21', y1: '21', x2: '16.65', y2: '16.65' } });
    iconSvg.appendChild(iconPath);
    iconSvg.appendChild(iconLine);
    icon.appendChild(iconSvg);

    this.searchInput = el('input', { cls: canSearch ? 'kg-graph-search-input' : 'kg-graph-search-input kg-graph-search-input-disabled' });
    this.searchInput.type = 'text';
    this.searchInput.placeholder = canSearch ? 'Search nodes...' : '🔒 Search (Pro only)';
    if (!canSearch) {
      this.searchInput.disabled = true;
    }
    this.searchInput.addEventListener('input', (e) => {
      const value = (e.target as unknown as HTMLInputElement).value;
      this.search(value);
      if (clearBtn) {
        clearBtn.setCssProps({ display: value.trim() ? 'flex' : 'none' });
      }
    });

    const clearBtn = el('button', { cls: 'kg-graph-search-clear' });
    clearBtn.setCssProps({ display: 'none' });
    clearBtn.title = 'Clear';
    const clearSvg = svgEl('svg', { attr: { width: '14', height: '14', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' } });
    const clearLine1 = svgEl('line', { attr: { x1: '18', y1: '6', x2: '6', y2: '18' } });
    const clearLine2 = svgEl('line', { attr: { x1: '6', y1: '6', x2: '18', y2: '18' } });
    clearSvg.appendChild(clearLine1);
    clearSvg.appendChild(clearLine2);
    clearBtn.appendChild(clearSvg);
    clearBtn.addEventListener('click', () => {
      this.searchInput.value = '';
      this.search('');
      clearBtn.setCssProps({ display: 'none' });
      this.searchInput.focus();
    });

    this.searchContainer.appendChild(icon as unknown as Node);
    this.searchContainer.appendChild(this.searchInput as unknown as Node);
    this.searchContainer.appendChild(clearBtn as unknown as Node);
    this.container.appendChild(this.searchContainer as unknown as Node);

    document.addEventListener('keydown', this.handleKeyDown);
  }

  private setupCanvas(): void {
    this.canvas.setCssProps({ position: 'absolute', top: '0', left: '0', width: '100%', height: '100%' });
    this.container.setCssProps({ position: 'relative' });
    this.container.appendChild(this.canvas as unknown as Node);
    this.updateCanvasSize();
  }

  private updateCanvasSize(): void {
    const rect = this.container.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.setCssProps({ width: `${this.width}px`, height: `${this.height}px` });
    this.ctx.scale(this.dpr, this.dpr);
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('wheel', this.handleWheel.bind(this));
    this.canvas.addEventListener('click', this.handleClick.bind(this));
    this.canvas.addEventListener('dblclick', this.handleDoubleClick.bind(this));
    window.addEventListener('resize', this.handleResize);
  }

  private screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: (screenX - this.transform.x) / this.transform.scale,
      y: (screenY - this.transform.y) / this.transform.scale,
    };
  }

  private worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: worldX * this.transform.scale + this.transform.x,
      y: worldY * this.transform.scale + this.transform.y,
    };
  }

  private getNodeAtPosition(screenX: number, screenY: number): GraphNode | null {
    const worldPos = this.screenToWorld(screenX, screenY);
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const node = this.nodes[i];
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const size = this.getNodeSize(node);
      const dist = Math.sqrt((worldPos.x - x) ** 2 + (worldPos.y - y) ** 2);
      if (dist <= size) {
        return node;
      }
    }
    return null;
  }

  private getEdgeAtPosition(screenX: number, screenY: number): GraphEdge | null {
    const worldPos = this.screenToWorld(screenX, screenY);
    for (const edge of this.edges) {
      const source = this.nodes.find(n => n.id === edge.sourceId);
      const target = this.nodes.find(n => n.id === edge.targetId);
      if (!source || !target) continue;

      const sx = source.x ?? 0;
      const sy = source.y ?? 0;
      const tx = target.x ?? 0;
      const ty = target.y ?? 0;

      const dist = this.pointToLineDistance(worldPos.x, worldPos.y, sx, sy, tx, ty);
      if (dist < 5) {
        return edge;
      }
    }
    return null;
  }

  private pointToLineDistance(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;
    let xx, yy;
    if (param < 0) { xx = x1; yy = y1; }
    else if (param > 1) { xx = x2; yy = y2; }
    else { xx = x1 + param * C; yy = y1 + param * D; }
    return Math.sqrt((px - xx) ** 2 + (py - yy) ** 2);
  }

  private handleMouseDown(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const node = this.getNodeAtPosition(x, y);

    if (node) {
      this.draggedNode = node;
      this.isDragging = true;
      node.fx = node.x;
      node.fy = node.y;
    } else {
      this.isPanning = true;
    }
    this.lastMousePos = { x, y };
  }

  private handleMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (this.isDragging && this.draggedNode) {
      const worldPos = this.screenToWorld(x, y);
      this.draggedNode.fx = worldPos.x;
      this.draggedNode.fy = worldPos.y;
    } else if (this.isPanning) {
      const dx = x - this.lastMousePos.x;
      const dy = y - this.lastMousePos.y;
      this.transform.x += dx;
      this.transform.y += dy;
    } else {
      const node = this.getNodeAtPosition(x, y);
      if (node) {
        this.hoveredNode = node;
        this.canvas.setCssProps({ position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', cursor: 'pointer' });
      } else {
        this.hoveredNode = null;
        const edge = this.getEdgeAtPosition(x, y);
        if (edge) {
          this.canvas.setCssProps({ position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', cursor: 'help' });
        } else {
          this.canvas.setCssProps({ position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', cursor: 'default' });
        }
      }
    }
    this.lastMousePos = { x, y };
    this.render();
  }

  private handleMouseUp(): void {
    if (this.draggedNode) {
      this.draggedNode.fx = null;
      this.draggedNode.fy = null;
    }
    this.draggedNode = null;
    this.isDragging = false;
    this.isPanning = false;
  }

  private handleWheel(e: WheelEvent): void {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const delta = -e.deltaY * 0.001;
    const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.transform.scale * (1 + delta)));
    const worldPos = this.screenToWorld(x, y);
    this.transform.scale = newScale;
    const newScreenPos = this.worldToScreen(worldPos.x, worldPos.y);
    this.transform.x += x - newScreenPos.x;
    this.transform.y += y - newScreenPos.y;
    this.render();
  }

  private handleClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (this.nodePopup.isOpen) {
      const popupWidth = 250;
      const popupHeight = 180;
      const popupX = (this.width - popupWidth) / 2;
      const popupY = (this.height - popupHeight) / 2;

      const closeBtnX = popupX + 75;
      const closeBtnY = popupY + 140;
      const closeBtnWidth = 100;
      const closeBtnHeight = 25;

      const jumpBtnX = popupX + 75;
      const jumpBtnY = popupY + 110;

      if (x >= closeBtnX && x <= closeBtnX + closeBtnWidth && y >= closeBtnY && y <= closeBtnY + closeBtnHeight) {
        this.closeNodePopup();
        return;
      }

      if (this.nodePopup.node?.filePath && x >= jumpBtnX && x <= jumpBtnX + closeBtnWidth && y >= jumpBtnY && y <= jumpBtnY + closeBtnHeight) {
        if (this.onJumpToFile) {
          this.onJumpToFile(this.nodePopup.node.filePath);
        }
        this.closeNodePopup();
        return;
      }

      if (x >= popupX && x <= popupX + popupWidth && y >= popupY && y <= popupY + popupHeight) {
        return;
      } else {
        this.closeNodePopup();
        return;
      }
    }

    if (this.upgradeModal.isOpen) {
      const modalWidth = 300;
      const modalHeight = 180;
      const modalX = (this.width - modalWidth) / 2;
      const modalY = (this.height - modalHeight) / 2;

      const closeBtnX = modalX + 100;
      const closeBtnY = modalY + 130;
      const closeBtnWidth = 100;
      const closeBtnHeight = 30;

      const upgradeBtnX = modalX + 100;
      const upgradeBtnY = modalY + 95;

      if (x >= closeBtnX && x <= closeBtnX + closeBtnWidth && y >= closeBtnY && y <= closeBtnY + closeBtnHeight) {
        this.closeUpgradeModal();
        return;
      }

      if (x >= upgradeBtnX && x <= upgradeBtnX + closeBtnWidth && y >= upgradeBtnY && y <= upgradeBtnY + closeBtnHeight) {
        this.closeUpgradeModal();
        window.open('https://knowledgegraph.app/#pricing', '_blank');
        return;
      }
      return;
    }

    const node = this.getNodeAtPosition(x, y);
    const edge = this.getEdgeAtPosition(x, y);

    if (node) {
      this.selectedNode = node;
      this.nodePopup = { isOpen: true, node };
      this.render();
    } else if (edge) {
      this.tooltip = {
        node: this.nodes.find(n => n.id === edge.sourceId) || this.nodes[0],
        x,
        y,
      };
      this.render();
    }
  }

  private handleDoubleClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const node = this.getNodeAtPosition(x, y);
    if (node) {
      node.fx = null;
      node.fy = null;
    }
  }

  public setOnJumpToFile(callback: (filePath: string) => void): void {
    this.onJumpToFile = callback;
  }

  public setData(entities: Entity[], relations: Relation[]): void {
    const nodeMap = new Map<string, GraphNode>();
    for (const entity of entities) {
      const relationCount = relations.filter(
        r => r.sourceId === entity.id || r.targetId === entity.id
      ).length;
      nodeMap.set(entity.id, {
        id: entity.id,
        name: entity.name,
        type: entity.type,
        relationCount,
        filePath: entity.filePath,
        summary: entity.summary,
        x: this.width / 2 + (Math.random() - 0.5) * 100,
        y: this.height / 2 + (Math.random() - 0.5) * 100,
      });
    }
    this.nodes = Array.from(nodeMap.values());
    if (this.nodes.length > MAX_VISIBLE_NODES) {
      this.clusterNodes();
    }
    this.edges = relations.map(r => ({
      id: r.id,
      sourceId: r.sourceId,
      targetId: r.targetId,
      relationType: r.relationType,
    })).filter(e => nodeMap.has(e.sourceId) && nodeMap.has(e.targetId));
    this.initSimulation();
    this.updateHighlightedNodes();
  }

  private clusterNodes(): void {
    const clusters: GraphNode[][] = [];
    const visited = new Set<string>();
    for (const node of this.nodes) {
      if (visited.has(node.id)) continue;
      const cluster: GraphNode[] = [node];
      visited.add(node.id);
      for (const other of this.nodes) {
        if (visited.has(other.id)) continue;
        const dx = (node.x ?? 0) - (other.x ?? 0);
        const dy = (node.y ?? 0) - (other.y ?? 0);
        if (Math.sqrt(dx * dx + dy * dy) < CLUSTER_DISTANCE) {
          cluster.push(other);
          visited.add(other.id);
        }
      }
      clusters.push(cluster);
    }
    const representativeNodes: GraphNode[] = [];
    for (const cluster of clusters) {
      let maxRelations = 0;
      let representative = cluster[0];
      for (const node of cluster) {
        if (node.relationCount > maxRelations) {
          maxRelations = node.relationCount;
          representative = node;
        }
      }
      representativeNodes.push(representative);
    }
    this.nodes = representativeNodes;
  }

  private initSimulation(): void {
    this.simulation = new Simulation(this.nodes, this.edges, {
      chargeStrength: FORCE_CHARGE_STRENGTH,
      linkDistance: FORCE_LINK_DISTANCE,
      linkStrength: FORCE_LINK_STRENGTH,
      centerStrength: FORCE_CENTER_STRENGTH,
      width: this.width,
      height: this.height,
    });
    this.simulation.onTick(() => this.render());
    this.simulation.start();
  }

  public zoomIn(): void {
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const newScale = Math.min(MAX_ZOOM, this.transform.scale + ZOOM_STEP);
    const worldPos = this.screenToWorld(centerX, centerY);
    this.transform.scale = newScale;
    const newScreenPos = this.worldToScreen(worldPos.x, worldPos.y);
    this.transform.x += centerX - newScreenPos.x;
    this.transform.y += centerY - newScreenPos.y;
    this.render();
  }

  public zoomOut(): void {
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const newScale = Math.max(MIN_ZOOM, this.transform.scale - ZOOM_STEP);
    const worldPos = this.screenToWorld(centerX, centerY);
    this.transform.scale = newScale;
    const newScreenPos = this.worldToScreen(worldPos.x, worldPos.y);
    this.transform.x += centerX - newScreenPos.x;
    this.transform.y += centerY - newScreenPos.y;
    this.render();
  }

  public resetView(): void {
    if (this.nodes.length === 0) return;
    
    // 计算所有节点的边界框
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const node of this.nodes) {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x);
      maxY = Math.max(maxY, node.y);
    }
    
    // 计算边界框中心
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    // 计算缩放比例以适应视图
    const padding = 50;
    const scaleX = (this.width - padding * 2) / (maxX - minX || 1);
    const scaleY = (this.height - padding * 2) / (maxY - minY || 1);
    const scale = Math.min(scaleX, scaleY, 1);
    
    // 设置变换
    this.transform = {
      x: this.width / 2 - centerX * scale,
      y: this.height / 2 - centerY * scale,
      scale: Math.max(scale, 0.1)
    };
    
    this.render();
  }

  public toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      this.container.requestFullscreen().catch(err => {
        console.error('Fullscreen error:', err);
      });
    } else {
      document.exitFullscreen();
    }
  }

  public setTypeFilter(type: string, enabled: boolean): void {
    if (enabled) {
      this.typeFilters.add(type);
    } else {
      this.typeFilters.delete(type);
    }
    this.updateHighlightedNodes();
    this.render();
  }

  public search(query: string): void {
    this.searchQuery = query.toLowerCase();

    // Allow search for Pro users and trial users
    const isTrialActive = this.plugin?.isTrialActive?.() ?? false;
    if (!this.isPro && !isTrialActive && query.length > 0) {
      this.upgradeModal = { isOpen: true, feature: '搜索' };
      this.render();
      return;
    }

    this.updateHighlightedNodes();
    this.render();
  }

  private updateHighlightedNodes(): void {
    this.highlightedNodes.clear();
    if (!this.searchQuery) return;
    for (const node of this.nodes) {
      if (
        node.name.toLowerCase().includes(this.searchQuery) ||
        node.type.toLowerCase().includes(this.searchQuery)
      ) {
        this.highlightedNodes.add(node.id);
        for (const edge of this.edges) {
          if (edge.sourceId === node.id) this.highlightedNodes.add(edge.targetId);
          if (edge.targetId === node.id) this.highlightedNodes.add(edge.sourceId);
        }
      }
    }
  }

  public showUpgradeModal(): void {
    this.upgradeModal = { isOpen: true, feature: '' };
    this.render();
  }

  public closeUpgradeModal(): void {
    this.upgradeModal.isOpen = false;
    this.render();
  }

  public closeNodePopup(): void {
    this.nodePopup.isOpen = false;
    this.nodePopup.node = null;
    this.render();
  }

  public isProVersion(): boolean {
    return this.isPro;
  }

  public setPro(isPro: boolean): void {
    this.isPro = isPro;
    this.render();
  }

  private getNodeSize(node: GraphNode): number {
    const baseSize = DEFAULT_NODE_SIZE + node.relationCount * SIZE_SCALING_FACTOR;
    return Math.max(MIN_NODE_SIZE, Math.min(MAX_NODE_SIZE, baseSize));
  }

  private getNodeColor(type: string): string {
    const colors = getEntityTypeColors(this.language);
    return colors[type] || colors['default'];
  }

  private render(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.animationFrameId = window.requestAnimationFrame(() => {
      this.doRender();
      this.animationFrameId = null;
    });
  }

  private doRender(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.save();
    this.ctx.translate(this.transform.x, this.transform.y);
    this.ctx.scale(this.transform.scale, this.transform.scale);
    this.renderEdges();
    this.renderNodes();
    this.ctx.restore();
    this.renderControls();
    if (this.tooltip) {
      this.renderTooltip();
    }
    if (this.upgradeModal.isOpen) {
      this.renderUpgradeModal();
    }
    if (this.nodePopup.isOpen && this.nodePopup.node) {
      this.renderNodePopup();
    }
  }

  private renderEdges(): void {
    this.ctx.strokeStyle = '#9CA3AF';
    this.ctx.lineWidth = 1;
    for (const edge of this.edges) {
      const source = this.nodes.find(n => n.id === edge.sourceId);
      const target = this.nodes.find(n => n.id === edge.targetId);
      if (!source || !target) continue;
      if (!this.typeFilters.has(source.type.toLowerCase()) || !this.typeFilters.has(target.type.toLowerCase())) {
        continue;
      }
      const sx = source.x ?? 0;
      const sy = source.y ?? 0;
      const tx = target.x ?? 0;
      const ty = target.y ?? 0;
      this.ctx.beginPath();
      this.ctx.moveTo(sx, sy);
      this.ctx.lineTo(tx, ty);
      this.ctx.stroke();
      const angle = Math.atan2(ty - sy, tx - sx);
      const arrowLength = 8;
      const targetSize = this.getNodeSize(target);
      const arrowX = tx - Math.cos(angle) * targetSize;
      const arrowY = ty - Math.sin(angle) * targetSize;
      this.ctx.beginPath();
      this.ctx.moveTo(arrowX, arrowY);
      this.ctx.lineTo(
        arrowX - arrowLength * Math.cos(angle - Math.PI / 6),
        arrowY - arrowLength * Math.sin(angle - Math.PI / 6)
      );
      this.ctx.moveTo(arrowX, arrowY);
      this.ctx.lineTo(
        arrowX - arrowLength * Math.cos(angle + Math.PI / 6),
        arrowY - arrowLength * Math.sin(angle + Math.PI / 6)
      );
      this.ctx.stroke();
    }
  }

  private renderNodes(): void {
    for (const node of this.nodes) {
      if (!this.typeFilters.has(node.type.toLowerCase())) continue;
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const size = this.getNodeSize(node);
      const color = this.getNodeColor(node.type);
      const isHighlighted = this.highlightedNodes.has(node.id);
      const isHovered = this.hoveredNode?.id === node.id;
      const isSelected = this.selectedNode?.id === node.id;
      if (isHighlighted || isHovered || isSelected) {
        this.ctx.shadowColor = color;
        this.ctx.shadowBlur = 15;
      } else {
        this.ctx.shadowBlur = 0;
      }
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.arc(x, y, size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.strokeStyle = isSelected ? '#000' : isHovered ? '#333' : 'transparent';
      this.ctx.lineWidth = isSelected || isHovered ? 2 : 0;
      this.ctx.stroke();
      this.ctx.shadowBlur = 0;
      this.ctx.fillStyle = '#333';
      this.ctx.font = '12px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'top';
      const label = node.name.length > 15 ? node.name.substring(0, 12) + '...' : node.name;
      this.ctx.fillText(label, x, y + size + 4);

      // Show title and summary if available and node is selected or hovered
      if ((this.selectedNode?.id === node.id || this.hoveredNode?.id === node.id) && node.summary) {
        this.ctx.font = '11px sans-serif';
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        const summaryText = node.summary.length > 30 ? node.summary.substring(0, 27) + '...' : node.summary;
        this.ctx.fillText(summaryText, x, y + size + 20);
      }
    }
  }

  private renderControls(): void {
    const buttonSize = 32;
    const padding = 10;
    const startX = this.width - buttonSize - padding;
    const startY = padding;
    const buttons = [
      { label: '+', action: () => this.zoomIn() },
      { label: '-', action: () => this.zoomOut() },
      { label: '⟲', action: () => this.resetView() },
      { label: '⛶', action: () => this.toggleFullscreen() },
    ];
    this.ctx.fillStyle = '#fff';
    this.ctx.strokeStyle = '#ccc';
    this.ctx.lineWidth = 1;
    for (let i = 0; i < buttons.length; i++) {
      const x = startX;
      const y = startY + i * (buttonSize + 8);
      this.ctx.fillRect(x, y, buttonSize, buttonSize);
      this.ctx.strokeRect(x, y, buttonSize, buttonSize);
      this.ctx.fillStyle = '#333';
      this.ctx.font = '16px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(buttons[i].label, x + buttonSize / 2, y + buttonSize / 2);
      this.ctx.fillStyle = '#fff';
    }
  }

  private renderTooltip(): void {
    if (!this.tooltip) return;
    const { x, y } = this.tooltip;
    const padding = 8;
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(x, y, 150, 60);
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '12px sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText('关系类型: test', x + padding, y + padding);
  }

  private renderUpgradeModal(): void {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(0, 0, this.width, this.height);
    const modalWidth = 300;
    const modalHeight = 180;
    const modalX = (this.width - modalWidth) / 2;
    const modalY = (this.height - modalHeight) / 2;
    this.ctx.fillStyle = '#fff';
    this.ctx.fillRect(modalX, modalY, modalWidth, modalHeight);
    this.ctx.strokeStyle = '#ccc';
    this.ctx.strokeRect(modalX, modalY, modalWidth, modalHeight);
    this.ctx.fillStyle = '#333';
    this.ctx.font = 'bold 16px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('升级到 Pro 版本', modalX + modalWidth / 2, modalY + 40);
    this.ctx.font = '12px sans-serif';
    this.ctx.fillText('此功能仅在 Pro 版本中可用', modalX + modalWidth / 2, modalY + 70);
    this.ctx.fillStyle = '#0071e3';
    this.ctx.fillRect(modalX + 100, modalY + 95, 100, 30);
    this.ctx.fillStyle = '#fff';
    this.ctx.fillText('立即升级', modalX + 150, modalY + 112);
    this.ctx.fillStyle = '#9CA3AF';
    this.ctx.fillRect(modalX + 100, modalY + 130, 100, 30);
    this.ctx.fillStyle = '#fff';
    this.ctx.fillText('关闭', modalX + 150, modalY + 147);
  }

  private renderNodePopup(): void {
    if (!this.nodePopup.node) return;
    const node = this.nodePopup.node;
    const popupWidth = 250;
    const popupHeight = 180;
    const popupX = (this.width - popupWidth) / 2;
    const popupY = (this.height - popupHeight) / 2;
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.ctx.fillStyle = '#fff';
    this.ctx.fillRect(popupX, popupY, popupWidth, popupHeight);
    this.ctx.strokeStyle = '#ccc';
    this.ctx.strokeRect(popupX, popupY, popupWidth, popupHeight);
    this.ctx.fillStyle = '#333';
    this.ctx.font = 'bold 14px sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(node.name, popupX + 15, popupY + 15);
    this.ctx.font = '12px sans-serif';
    this.ctx.fillText(`类型: ${node.type}`, popupX + 15, popupY + 40);
    this.ctx.fillText(`关系数: ${node.relationCount}`, popupX + 15, popupY + 60);
    if (node.summary) {
      const summaryText = node.summary.length > 50 ? node.summary.substring(0, 47) + '...' : node.summary;
      this.ctx.fillText(summaryText, popupX + 15, popupY + 80);
    }
    if (node.filePath && this.onJumpToFile) {
      this.ctx.fillStyle = '#0071e3';
      this.ctx.fillRect(popupX + 75, popupY + 110, 100, 25);
      this.ctx.fillStyle = '#fff';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('打开文档', popupX + 125, popupY + 122);
    }
    this.ctx.fillStyle = '#9CA3AF';
    this.ctx.fillRect(popupX + 75, popupY + 140, 100, 25);
    this.ctx.fillStyle = '#fff';
    this.ctx.fillText('关闭', popupX + 125, popupY + 152);
  }

  public destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    this.simulation?.stop();
    this.simulation = null;
    
    const gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl');
    if (gl) {
      const loseContextExt = (gl as any).getExtension('WEBGL_lose_context');
      if (loseContextExt) {
        loseContextExt.loseContext();
      }
    }
    
    this.canvas.remove();
    
    if (this.searchContainer) {
      this.searchContainer.remove();
      this.searchContainer = null;
    }
    
    if (this.searchInput) {
      this.searchInput = null;
    }
    
    window.removeEventListener('resize', this.handleResize);
    document.removeEventListener('keydown', this.handleKeyDown);
    
    this.nodes = [];
    this.edges = [];
    this.typeFilters.clear();
    this.highlightedNodes.clear();
    
    this.tooltip = null;
    this.upgradeModal = { isOpen: false, feature: '' };
    this.nodePopup = { isOpen: false, node: null };
    
    this.onJumpToFile = null;
    this.plugin = null;
    this.container = null as any;
    this.canvas = null as any;
    this.ctx = null as any;
  }
}

interface SimulationNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx: number | null;
  fy: number | null;
}

interface SimulationLink {
  source: SimulationNode;
  target: SimulationNode;
  length: number;
  strength: number;
}

interface SimulationOptions {
  chargeStrength: number;
  linkDistance: number;
  linkStrength: number;
  centerStrength: number;
  width: number;
  height: number;
}

class Simulation {
  private nodes: SimulationNode[];
  private links: SimulationLink[];
  private options: SimulationOptions;
  private alpha: number = 1;
  private alphaMin: number = 0.001;
  private alphaDecay: number = 0.02;
  private velocityDecay: number = 0.4;
  private isRunning: boolean = false;
  private tickCallback: (() => void) | null = null;
  private animationFrameId: number | null = null;

  constructor(
    graphNodes: GraphNode[],
    graphEdges: GraphEdge[],
    options: SimulationOptions
  ) {
    this.options = options;
    this.nodes = graphNodes.map(n => ({
      id: n.id,
      x: n.x ?? options.width / 2 + (Math.random() - 0.5) * 100,
      y: n.y ?? options.height / 2 + (Math.random() - 0.5) * 100,
      vx: 0,
      vy: 0,
      fx: n.fx ?? null,
      fy: n.fy ?? null,
    }));
    const nodeMap = new Map(this.nodes.map(n => [n.id, n]));
    this.links = graphEdges
      .filter(e => nodeMap.has(e.sourceId) && nodeMap.has(e.targetId))
      .map(e => ({
        source: nodeMap.get(e.sourceId)!,
        target: nodeMap.get(e.targetId)!,
        length: options.linkDistance,
        strength: options.linkStrength,
      }));
  }

  public onTick(callback: () => void): void {
    this.tickCallback = callback;
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.alpha = 1;
    this.tick();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private tick = (): void => {
    if (!this.isRunning) return;
    this.alpha *= (1 - this.alphaDecay);
    if (this.alpha < this.alphaMin) {
      this.alpha = this.alphaMin;
    }
    this.applyForces();
    this.updatePositions();
    this.tickCallback?.();
    if (this.alpha > this.alphaMin) {
      this.animationFrameId = window.requestAnimationFrame(this.tick);
    } else {
      this.isRunning = false;
    }
  };

  private applyForces(): void {
    this.applyCenterForce();
    this.applyLinkForces();
    this.applyChargeForces();
  }

  private applyCenterForce(): void {
    const cx = this.options.width / 2;
    const cy = this.options.height / 2;
    const strength = this.options.centerStrength * this.alpha;
    for (const node of this.nodes) {
      if (node.fx !== null && node.fy !== null) continue;
      node.vx += (cx - node.x) * strength;
      node.vy += (cy - node.y) * strength;
    }
  }

  private applyLinkForces(): void {
    for (const link of this.links) {
      const dx = link.target.x - link.source.x;
      const dy = link.target.y - link.source.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const diff = (link.length - dist) / dist;
      const strength = link.strength * this.alpha;
      if (link.source.fx === null) {
        link.source.vx += dx * diff * strength;
        link.source.vy += dy * diff * strength;
      }
      if (link.target.fy === null) {
        link.target.vx -= dx * diff * strength;
        link.target.vy -= dy * diff * strength;
      }
    }
  }

  private applyChargeForces(): void {
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const nodeA = this.nodes[i];
        const nodeB = this.nodes[j];
        let dx = nodeB.x - nodeA.x;
        let dy = nodeB.y - nodeA.y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = this.options.chargeStrength * this.alpha / (dist * dist);
        dx = dx / dist * force;
        dy = dy / dist * force;
        if (nodeA.fx === null) nodeA.vx += dx;
        if (nodeA.fy === null) nodeA.vy += dy;
        if (nodeB.fx === null) nodeB.vx -= dx;
        if (nodeB.fy === null) nodeB.vy -= dy;
      }
    }
  }

  private updatePositions(): void {
    for (const node of this.nodes) {
      if (node.fx !== null) {
        node.x = node.fx;
        node.vx = 0;
      } else {
        node.x += node.vx;
        node.vx *= (1 - this.velocityDecay);
      }
      if (node.fy !== null) {
        node.y = node.fy;
        node.vy = 0;
      } else {
        node.y += node.vy;
        node.vy *= (1 - this.velocityDecay);
      }
      if (node.x < 0) node.x = 0;
      if (node.x > this.options.width) node.x = this.options.width;
      if (node.y < 0) node.y = 0;
      if (node.y > this.options.height) node.y = this.options.height;
    }
  }
}

export function createGraphView(container: HTMLElement, isPro: boolean = false, plugin?: any): GraphView {
  return new GraphView(container, isPro, plugin);
}

import Sigma from 'sigma';
import Graph from 'graphology';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import type { Entity, Relation } from '../models/index.js';
import { ENTITY_TYPES, LanguageCode } from '../i18n/language-config.js';
import { parseHtml, el } from '../utils/dom-helper.js';

export interface SigmaGraphViewOptions {
  container: HTMLElement;
  width?: number;
  height?: number;
  isPro?: boolean;
  maxNodes?: number;
  onJumpToFile?: (filePath: string) => void;
  onNodeClick?: (node: Entity) => void;
  onLoadComplete?: () => void;
}

export interface NodePopupData {
  isOpen: boolean;
  node: {
    id: string;
    label: string;
    type: string;
    summary: string;
    filePath?: string;
  } | null;
}

export interface UpgradeModalData {
  isOpen: boolean;
}

export class SigmaGraphView {
  private container: HTMLElement;
  private graph: Graph;
  private sigma: Sigma | null = null;
  private isPro: boolean;
  private maxNodes: number;
  private onJumpToFile?: (filePath: string) => void;
  private onNodeClick?: (node: Entity) => void;
  private onLoadComplete?: () => void;
  private nodePopup: NodePopupData = { isOpen: false, node: null };
  private upgradeModal: UpgradeModalData = { isOpen: false };
  private animationFrameId: number | null = null;
  private layoutIterations: number = 0;
  private isLayoutStable: boolean = false;
  private hasInitialLayout: boolean = false;
  private entityIdMap: Map<string, string> = new Map();

  private language: LanguageCode = 'zh-CN';
  private visibleEntityTypes: Set<string> = new Set();

  setLanguage(lang: LanguageCode): void {
    this.language = lang;
    this.updateEntityTypeColors();
  }

  private getEntityTypeColors(): Record<string, string> {
    const types = ENTITY_TYPES[this.language] || ENTITY_TYPES['zh-CN'];
    const colors: Record<string, string> = {};
    types.forEach(t => {
      colors[t.type] = t.color;
    });
    colors['default'] = '#6366f1';
    return colors;
  }

  private updateEntityTypeColors(): void {
    if (!this.sigma || !this.graph) return;
    const colors = this.getEntityTypeColors();
    this.graph.forEachNode((node) => {
      const entityType = this.graph!.getNodeAttribute(node, 'entityType') || 'default';
      const color = colors[entityType] || colors['default'];
      this.graph!.setNodeAttribute(node, 'color', color);
      this.graph!.setNodeAttribute(node, 'originalColor', color);
    });
    this.sigma.refresh();
  }

  filterByEntityTypes(types: string[]): void {
    this.visibleEntityTypes = new Set(types);
    this.applyFilters();
  }

  clearFilters(): void {
    this.visibleEntityTypes.clear();
    this.applyFilters();
  }

  private applyFilters(): void {
    if (!this.sigma || !this.graph) return;

    const allNodesVisible = this.visibleEntityTypes.size === 0;

    this.graph.forEachNode((node) => {
      if (allNodesVisible) {
        this.graph!.setNodeAttribute(node, 'hidden', false);
        return;
      }
      const entityType = this.graph!.getNodeAttribute(node, 'entityType');
      const isVisible = this.visibleEntityTypes.has(entityType);
      this.graph!.setNodeAttribute(node, 'hidden', !isVisible);
    });

    this.graph.forEachEdge((edge) => {
      const source = this.graph!.source(edge);
      const target = this.graph!.target(edge);
      const sourceHidden = this.graph!.getNodeAttribute(source, 'hidden');
      const targetHidden = this.graph!.getNodeAttribute(target, 'hidden');
      this.graph!.setEdgeAttribute(edge, 'hidden', sourceHidden || targetHidden);
    });

    this.sigma.refresh();
  }

  constructor(options: SigmaGraphViewOptions) {
    this.container = options.container;
    this.isPro = options.isPro || false;
    this.maxNodes = options.maxNodes || 500;
    this.onJumpToFile = options.onJumpToFile;
    this.onNodeClick = options.onNodeClick;
    this.onLoadComplete = options.onLoadComplete;
    this.graph = new Graph();

    this.initialize();
  }

  private initialize(): void {
    // 根据当前主题设置初始标签颜色和边颜色
    const isDarkMode = document.body.classList.contains('theme-dark');
    const initialLabelColor = isDarkMode ? '#ffffff' : '#1e293b';
    const initialEdgeColor = isDarkMode ? '#94a3b8' : '#374151'; // 暗黑模式浅灰，正常模式深灰（更明显）
    
    this.sigma = new Sigma(this.graph, this.container, {
      defaultNodeColor: '#6366f1',
      defaultNodeType: 'circle',
      defaultEdgeColor: initialEdgeColor,
      defaultEdgeType: 'arrow',
      labelFont: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      labelSize: 12,
      labelWeight: 'normal',
      labelColor: { color: initialLabelColor },
      edgeLabelFont: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      edgeLabelSize: 12,
      edgeLabelWeight: 'normal',
      edgeLabelColor: { color: initialLabelColor },
      hideEdgesOnMove: false,
      hideLabelsOnMove: true,
      zIndex: true,
      minCameraRatio: 0.01,
      maxCameraRatio: 10,
      allowInvalidContainer: true,
      enableNodeDrag: true,
      nodeHoverPrecision: 0,
      defaultNodeHoverColor: 'transparent',
      renderers: [
        {
          type: 'canvas',
          options: {
            container: this.container,
            antialias: true,
            pixelRatio: window.devicePixelRatio,
          },
        },
      ],
    } as any);

    this.setupEventListeners();
    this.setupThemeObserver();
  }
  
  // 监听主题切换事件
  private setupThemeObserver(): void {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          this.updateThemeColors();
        }
      });
    });
    
    observer.observe(document.body as any, {
      attributes: true,
      attributeFilter: ['class']
    });
  }
  
  // 更新主题颜色
  private updateThemeColors(): void {
    if (!this.sigma || !this.graph) return;
    
    const isDarkMode = document.body.classList.contains('theme-dark');
    const labelColor = isDarkMode ? '#ffffff' : '#1e293b';
    
    // 更新所有节点的标签颜色
    this.graph.forEachNode((node) => {
      this.graph!.setNodeAttribute(node, 'labelColor', labelColor);
    });
    
    // 更新边的标签颜色
    this.graph.forEachEdge((edge) => {
      this.graph!.setEdgeAttribute(edge, 'labelColor', labelColor);
    });
    
    this.sigma.refresh();
  }

  private draggedNode: string | null = null;

  private setupEventListeners(): void {
    if (!this.sigma) return;

    let clickDebounce: number | null = null;
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let draggedNodeId: string | null = null;

    // 节点按下事件（开始拖拽）
    this.sigma.on('downNode', (event) => {
      draggedNodeId = event.node;
      dragStartX = event.event.x;
      dragStartY = event.event.y;
      isDragging = false;
      
      // 暂停布局迭代，允许自由拖拽
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
    });

    // 监听鼠标移动（检测拖拽）
    this.sigma.on('moveBody', (event) => {
      if (draggedNodeId) {
        const dx = event.event.x - dragStartX;
        const dy = event.event.y - dragStartY;
        
        // 如果移动距离超过阈值，认为是拖拽
        if (!isDragging && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
          isDragging = true;
          this.draggedNode = draggedNodeId;
        }
        
        if (isDragging && this.draggedNode) {
          // 获取当前节点位置
          const currentX = this.graph.getNodeAttribute(this.draggedNode, 'x');
          const currentY = this.graph.getNodeAttribute(this.draggedNode, 'y');
          
          // 计算移动增量（屏幕坐标）
          const deltaX = event.event.x - dragStartX;
          const deltaY = event.event.y - dragStartY;
          
          // 更新拖拽节点位置（直接使用增量）
          const newX = currentX + deltaX * 0.1;
          const newY = currentY + deltaY * 0.1;
          
          // 更新拖拽节点位置
          this.graph.setNodeAttribute(this.draggedNode, 'x', newX);
          this.graph.setNodeAttribute(this.draggedNode, 'y', newY);
          
          // 应用物理效果
          this.applyPhysicsEffects(this.draggedNode, newX, newY);
          
          this.sigma.refresh();
          
          // 更新起始位置
          dragStartX = event.event.x;
          dragStartY = event.event.y;
        }
      }
    });

    // 节点释放事件（停止拖拽）
    this.sigma.on('upNode', (event) => {
      if (draggedNodeId === event.node && isDragging) {
        // 恢复所有节点的原始颜色
        this.graph.forEachNode((node) => {
          const originalColor = this.graph.getNodeAttribute(node, 'originalColor');
          if (originalColor) {
            this.graph.setNodeAttribute(node, 'color', originalColor);
          }
        });
        // 恢复布局迭代
        if (!this.isLayoutStable) {
          this.continueLayout();
        }
      }
      
      this.draggedNode = null;
      draggedNodeId = null;
      isDragging = false;
    });
    
    this.sigma.on('clickNode', (event) => {
      // 如果是拖拽操作，不触发点击事件
      if (isDragging) return;
      
      // 添加防抖处理
      if (clickDebounce) {
        window.clearTimeout(clickDebounce);
      }
      
      clickDebounce = window.setTimeout(() => {
        const node = event.node;
        const nodeData = this.graph.getNodeAttributes(node);
        
        this.nodePopup = {
          isOpen: true,
          node: {
            id: node,
            label: nodeData.label || '',
            type: nodeData.entityType || '',
            summary: nodeData.summary || '',
            filePath: nodeData.filePath || undefined,
          },
        };

        if (this.onNodeClick) {
          const entity: Entity = {
            id: node,
            docId: nodeData.docId || '',
            name: nodeData.label || '',
            type: nodeData.entityType || '',
            tags: nodeData.tags || [],
            summary: nodeData.summary || '',
            timestamp: nodeData.timestamp || 0,
            filePath: nodeData.filePath || '',
            isMainEntity: nodeData.isMainEntity || false,
            createdAt: nodeData.createdAt || 0,
            updatedAt: nodeData.updatedAt || 0,
          };
          this.onNodeClick(entity);
        }

        this.renderPopup();
      }, 50); // 50ms 防抖
    });

    this.sigma.on('clickStage', () => {
      if (this.nodePopup.isOpen) {
        this.closeNodePopup();
      }
    });

    this.container.addEventListener('resize', () => {
      if (this.sigma) {
        this.sigma.refresh();
      }
    });

    this.setupZoomControls();
  }

  private setupZoomControls(): void {
    if (!this.sigma) return;

    const sigmaAny = this.sigma as any;

    sigmaAny.on('wheelStage', (event: any) => {
      event.preventDefault();
      const mousePosition = sigmaAny.viewportToGraph(event.event);
      const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
      sigmaAny.camera.animatedZoom(mousePosition, zoomFactor);
    });

    this.container.addEventListener('keydown', (event) => {
      if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        sigmaAny.camera.animatedZoom(sigmaAny.camera.center, 1.2);
      } else if (event.key === '-') {
        event.preventDefault();
        sigmaAny.camera.animatedZoom(sigmaAny.camera.center, 0.8);
      } else if (event.key === '0') {
        event.preventDefault();
        this.resetZoom();
      }
    });

    this.container.addEventListener('dblclick', (event) => {
      const mousePosition = sigmaAny.viewportToGraph({ x: event.clientX, y: event.clientY });
      sigmaAny.camera.animatedZoom(mousePosition, 1.5);
    });
  }

  zoomIn(): void {
    if (this.sigma) {
      const sigmaAny = this.sigma as any;
      sigmaAny.camera.animatedZoom(sigmaAny.camera.center, 1.2);
    }
  }

  zoomOut(): void {
    if (this.sigma) {
      const sigmaAny = this.sigma as any;
      sigmaAny.camera.animatedZoom(sigmaAny.camera.center, 0.8);
    }
  }

  resetZoom(): void {
    if (this.sigma) {
      const sigmaAny = this.sigma as any;
      sigmaAny.camera.animate({
        x: 0,
        y: 0,
        ratio: 1,
      });
    }
  }

  private startForceAtlas2(warmup: boolean = false): void {
    if (this.graph.nodes().length < 2) return;

    const iterations = warmup ? 200 : 20; // 增加迭代次数，让布局更稳定
    
    (forceAtlas2.assign as any)(this.graph, {
      iterations,
      settings: {
        barnesHutOptimize: true,
        barnesHutTheta: 0.5, // 提高精度
        gravity: 0.01, // 极小重力，让节点最大限度分散
        scalingRatio: 800, // 大幅增大缩放比例，显著增加节点间距
        strongGravityMode: false,
        edgeWeightInfluence: 1.0, // 最大边权重影响，让相关节点保持连接
        linLogMode: true, // 使用线性对数模式，优化节点分布
        outboundAttractionDistribution: true, // 启用向外吸引力分布
        adaptiveScaling: true, // 启用自适应缩放
      },
    });

    if (this.sigma) {
      this.sigma.refresh();
    }

    if (warmup) {
      this.hasInitialLayout = true;
      this.layoutIterations = 0;
      this.isLayoutStable = false;
      this.continueLayout();
    }
  }

  // 应用物理效果：弹簧拉力（跟随）+ 碰撞效果
  private applyPhysicsEffects(draggedNode: string, draggedX: number, draggedY: number): void {
    // 获取与拖拽节点直接相连的节点（邻居节点）
    const neighbors = new Set<string>();
    this.graph.forEachEdge((edgeKey) => {
      const source = this.graph.source(edgeKey);
      const target = this.graph.target(edgeKey);
      if (source === draggedNode) {
        neighbors.add(target);
      }
      if (target === draggedNode) {
        neighbors.add(source);
      }
    });

    // 设置颜色高亮效果
    this.graph.forEachNode((node) => {
      const originalColor = this.graph.getNodeAttribute(node, 'originalColor');
      if (node === draggedNode) {
        this.graph.setNodeAttribute(node, 'color', '#fbbf24'); // 黄色高亮
      } else if (neighbors.has(node)) {
        const color = originalColor || this.graph.getNodeAttribute(node, 'color');
        this.graph.setNodeAttribute(node, 'color', this.adjustColorBrightness(color as string, 20));
      }
    });

    // 直接移动邻居节点跟随拖拽节点（最强效果）
    const neighborFollowStrength = 0.45; // 大幅增强邻居跟随强度
    neighbors.forEach((neighbor) => {
      // 获取邻居节点当前位置
      const currentX = this.graph.getNodeAttribute(neighbor, 'x') || 0;
      const currentY = this.graph.getNodeAttribute(neighbor, 'y') || 0;
      
      // 计算目标位置（跟随拖拽节点）
      const dx = draggedX - currentX;
      const dy = draggedY - currentY;
      
      // 直接应用跟随力
      const newX = currentX + dx * neighborFollowStrength;
      const newY = currentY + dy * neighborFollowStrength;
      
      this.graph.setNodeAttribute(neighbor, 'x', newX);
      this.graph.setNodeAttribute(neighbor, 'y', newY);
    });

    // 获取更新后的所有节点位置（用于碰撞检测）
    const nodePositions = new Map<string, { x: number; y: number }>();
    this.graph.forEachNode((node) => {
      const x = this.graph.getNodeAttribute(node, 'x') || 0;
      const y = this.graph.getNodeAttribute(node, 'y') || 0;
      nodePositions.set(node, { x, y });
    });

    const allNodes = Array.from(nodePositions.keys());

    // 节点间的排斥力（碰撞效果）- 节点互相推开
    const collisionRadius = 180; // 碰撞半径
    const repulsionStrength = 10000; // 排斥力强度
    const forces: Map<string, { dx: number; dy: number }> = new Map();
    
    // 初始化力
    allNodes.forEach((node) => {
      forces.set(node, { dx: 0, dy: 0 });
    });
    
    // 计算所有节点间的排斥力
    for (let i = 0; i < allNodes.length; i++) {
      for (let j = i + 1; j < allNodes.length; j++) {
        const node1 = allNodes[i];
        const node2 = allNodes[j];
        
        const pos1 = nodePositions.get(node1)!;
        const pos2 = nodePositions.get(node2)!;
        
        const dx = pos2.x - pos1.x;
        const dy = pos2.y - pos1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // 如果距离小于碰撞半径，施加排斥力
        if (distance < collisionRadius && distance > 0) {
          const force = repulsionStrength / (distance * distance);
          const nx = (dx / distance) * force;
          const ny = (dy / distance) * force;
          
          const force1 = forces.get(node1)!;
          force1.dx -= nx;
          force1.dy -= ny;
          
          const force2 = forces.get(node2)!;
          force2.dx += nx;
          force2.dy += ny;
        }
      }
    }

    // 应用排斥力
    const damping = 0.95;
    const forceScale = 12;
    
    allNodes.forEach((node) => {
      if (node === draggedNode) return;
      
      const pos = nodePositions.get(node)!;
      const force = forces.get(node)!;
      
      const newX = pos.x + force.dx * damping * forceScale;
      const newY = pos.y + force.dy * damping * forceScale;
      
      this.graph.setNodeAttribute(node, 'x', newX);
      this.graph.setNodeAttribute(node, 'y', newY);
    });
  }

  // 辅助方法：调整颜色亮度
  private adjustColorBrightness(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    ).toString(16).slice(1);
  }

  private continueLayout(): void {
    if (this.isLayoutStable || this.layoutIterations >= 200) {
      if (this.onLoadComplete) {
        this.onLoadComplete();
      }
      return;
    }

    this.layoutIterations++;
    
    if (this.layoutIterations % 10 === 0) {
      (forceAtlas2.assign as any)(this.graph, {
        iterations: 3,
        settings: {
          barnesHutOptimize: true,
          barnesHutTheta: 0.5,
          gravity: 0.01, // 与初始布局一致，保持节点分散
          scalingRatio: 800, // 与初始布局一致，保持节点间距
          strongGravityMode: false,
          edgeWeightInfluence: 1.0,
          linLogMode: true,
          outboundAttractionDistribution: true,
          adaptiveScaling: true,
        },
      });

      if (this.sigma) {
        this.sigma.refresh();
      }
    }

    if (this.layoutIterations >= 100) {
      this.isLayoutStable = true;
    }

    this.animationFrameId = window.requestAnimationFrame(() => this.continueLayout());
  }

  public setData(entities: Entity[], relations: Relation[]): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.graph.clear();
    this.layoutIterations = 0;
    this.isLayoutStable = false;
    this.hasInitialLayout = false;

    const limitedEntities = entities.slice(0, this.maxNodes);
    const entityIdMap = new Map<string, string>();

    const isDarkMode = document.body.classList.contains('theme-dark');
    const colors = this.getEntityTypeColors();
    const labelColor = isDarkMode ? '#ffffff' : '#1e293b';

    limitedEntities.forEach((entity) => {
      const nodeId = `entity_${entity.id}`;
      entityIdMap.set(entity.id, nodeId);

      const color = colors[entity.type] || colors.default;
      
      // 计算节点的边数量（出度+入度）
      const outDegree = relations.filter(r => r.sourceId === entity.id).length;
      const inDegree = relations.filter(r => r.targetId === entity.id).length;
      const degree = outDegree + inDegree;
      
      // 根据边数量设置节点大小，边越多节点越大
      const baseSize = 12;
      const sizeIncrease = degree * 3;
      const size = Math.max(baseSize, Math.min(35, baseSize + sizeIncrease));

      this.graph.addNode(nodeId, {
        label: entity.name,
        labelColor: labelColor, // 添加标签颜色
        labelSize: 12, // 设置标签大小
        labelMaxSize: 14,
        x: (Math.random() - 0.5) * 400,
        y: (Math.random() - 0.5) * 400,
        size,
        color,
        originalColor: color, // 保存原始颜色用于高亮恢复
        entityType: entity.type,
        degree, // 存储度数用于后续使用
        summary: entity.summary,
        docId: entity.docId,
        filePath: entity.filePath,
        tags: entity.tags,
        timestamp: entity.timestamp,
        isMainEntity: entity.isMainEntity,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
      });
    });

    const validRelations = relations.filter(
      (relation) => entityIdMap.has(relation.sourceId) && entityIdMap.has(relation.targetId)
    );

    
    // 打印所有实体及其ID
    limitedEntities.forEach(e => {
    });
    
    // 检查关系的源和目标是否存在
    relations.forEach(r => {
      if (!entityIdMap.has(r.sourceId) || !entityIdMap.has(r.targetId)) {
        console.debug(`[Sigma Graph] Relation ${r.sourceId} -> ${r.targetId} has missing entity`);
      }
    });

    validRelations.forEach((relation) => {
      const sourceId = entityIdMap.get(relation.sourceId);
      const targetId = entityIdMap.get(relation.targetId);

      if (sourceId && targetId && sourceId !== targetId) {
        try {
          this.graph.addDirectedEdge(sourceId, targetId, {
            label: relation.relationType,
            color: '#334155', // 深灰色，确保在任何背景上都清晰可见
            weight: relation.weight || 3, // 增加权重，使边更粗
            size: 3, // 明确设置边的宽度为3像素
            relationType: relation.relationType,
            type: 'arrow', // 明确设置边类型为箭头
          });
        } catch {
          // Edge already exists
        }
      }
    });

    if (this.sigma) {
      this.sigma.refresh();
    }

    if (this.graph.nodes().length > 1) {
      window.setTimeout(() => this.startForceAtlas2(true), 50);
    } else if (this.onLoadComplete) {
      this.onLoadComplete();
    }
  }

  public search(keyword: string): void {
    if (!this.sigma || !this.graph) return;

    if (!keyword.trim()) {
      // 清除过滤，显示所有节点和边
      this.graph.forEachNode((node) => {
        this.graph!.setNodeAttribute(node, 'hidden', false);
      });
      this.graph.forEachEdge((edge) => {
        this.graph!.setEdgeAttribute(edge, 'hidden', false);
      });
      this.sigma.refresh();
      return;
    }

    const lowerKeyword = keyword.toLowerCase();
    const matchedNodes = new Set<string>();

    // 找出匹配的节点
    this.graph.forEachNode((node) => {
      const attributes = this.graph!.getNodeAttributes(node);
      const label = (attributes.label || '').toLowerCase();
      const entityType = (attributes.entityType || '').toLowerCase();
      
      if (label.includes(lowerKeyword) || entityType.includes(lowerKeyword)) {
        matchedNodes.add(node);
        this.graph!.setNodeAttribute(node, 'hidden', false);
      } else {
        this.graph!.setNodeAttribute(node, 'hidden', true);
      }
    });

    // 过滤边：只有当两个端点都匹配时才显示
    this.graph.forEachEdge((edge) => {
      const source = this.graph!.source(edge);
      const target = this.graph!.target(edge);
      
      if (matchedNodes.has(source) && matchedNodes.has(target)) {
        this.graph!.setEdgeAttribute(edge, 'hidden', false);
      } else {
        this.graph!.setEdgeAttribute(edge, 'hidden', true);
      }
    });

    this.sigma.refresh();
  }

  public clearSearch(): void {
    if (!this.sigma) return;
    
    // 重置所有节点的 hidden 属性
    this.graph.forEachNode((node) => {
      this.graph!.setNodeAttribute(node, 'hidden', false);
    });
    
    // 重置所有边的 hidden 属性
    this.graph.forEachEdge((edge) => {
      this.graph!.setEdgeAttribute(edge, 'hidden', false);
    });
    
    this.sigma.refresh();
  }

  public zoomToFit(): void {
    if (!this.sigma) return;
    const camera = this.sigma.getCamera();
    const bounds = this.sigma.getBBox();
    if (bounds) {
      const width = this.container.offsetWidth;
      const height = this.container.offsetHeight;
      const xExtent = bounds.x as [number, number];
      const yExtent = bounds.y as [number, number];
      camera.animate({
        x: (xExtent[0] + xExtent[1]) / 2,
        y: (yExtent[0] + yExtent[1]) / 2,
        ratio: Math.min(
          width / (xExtent[1] - xExtent[0]),
          height / (yExtent[1] - yExtent[0])
        ) * 0.9,
      }, { duration: 500 });
    }
  }

  public getNodeCount(): number {
    return this.graph.nodes().length;
  }

  public getEdgeCount(): number {
    return this.graph.edges().length;
  }

  public isLayoutComplete(): boolean {
    return this.isLayoutStable;
  }

  private renderPopup(): void {
    if (!this.nodePopup.isOpen || !this.nodePopup.node) return;

    const existingPopup = this.container.querySelector('.sigma-node-popup');
    if (existingPopup) {
      existingPopup.remove();
    }

    const popup = el('div', { cls: 'sigma-node-popup' });

    const popupHeader = el('div', { cls: 'popup-header' });
    const h3 = el('h3', { text: this.nodePopup.node.label });
    const typeSpan = el('span', { cls: 'popup-type', text: this.nodePopup.node.type });
    popupHeader.appendChild(h3);
    popupHeader.appendChild(typeSpan);
    popup.appendChild(popupHeader);

    const popupContent = el('div', { cls: 'popup-content' });
    const p = el('p', { text: this.nodePopup.node.summary || '暂无描述' });
    popupContent.appendChild(p);
    popup.appendChild(popupContent);

    const popupActions = el('div', { cls: 'popup-actions' });

    if (this.nodePopup.node.filePath) {
      const openBtn = el('button', { cls: 'btn-primary', text: '打开文档' });
      openBtn.addEventListener('click', () => {
        document.dispatchEvent(new CustomEvent('sigmaJumpToFile', { detail: this.nodePopup.node.filePath || '' }));
      });
      popupActions.appendChild(openBtn);
    }

    const closeBtn = el('button', { cls: 'btn-secondary', text: '关闭' });
    closeBtn.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('sigmaClosePopup'));
    });
    popupActions.appendChild(closeBtn);
    popup.appendChild(popupActions);

    this.container.appendChild(popup);

    document.addEventListener('sigmaClosePopup', this.handleClosePopup);
    document.addEventListener('sigmaJumpToFile', this.handleJumpToFile);
  }

  private handleClosePopup = () => {
    this.closeNodePopup();
  };

  private handleJumpToFile = (event: Event) => {
    const customEvent = event as CustomEvent<string>;
    if (this.onJumpToFile && customEvent.detail) {
      this.onJumpToFile(customEvent.detail);
    }
    this.closeNodePopup();
  };

  public closeNodePopup(): void {
    this.nodePopup.isOpen = false;
    this.nodePopup.node = null;

    const popup = this.container.querySelector('.sigma-node-popup');
    if (popup) {
      popup.remove();
    }

    document.removeEventListener('sigmaClosePopup', this.handleClosePopup);
    document.removeEventListener('sigmaJumpToFile', this.handleJumpToFile);
  }

  public openUpgradeModal(): void {
    this.upgradeModal.isOpen = true;
    this.renderUpgradeModal();
  }

  private renderUpgradeModal(): void {
    if (!this.upgradeModal.isOpen) return;

    const existingModal = this.container.querySelector('.sigma-upgrade-modal');
    if (existingModal) {
      existingModal.remove();
    }

    const modal = el('div', { cls: 'sigma-upgrade-modal' });
    const modalHtml = `
      <div class="kg-sigma-upgrade-overlay"></div>
      <div class="kg-sigma-upgrade-content">
        <h3>⭐ 升级到 Pro 版</h3>
        <p>解锁完整的图谱功能，包括：</p>
        <ul>
          <li>点击节点直接打开文档</li>
          <li>高级搜索和过滤</li>
          <li>自定义图谱样式</li>
        </ul>
        <button class="btn-primary" id="sigmaUpgradeCloseBtn">
          知道了
        </button>
      </div>
    `;
    modal.appendChild(parseHtml(modalHtml));

    const closeOverlay = modal.querySelector('.kg-sigma-upgrade-overlay');
    const closeBtn = modal.querySelector('#sigmaUpgradeCloseBtn');
    const closeHandler = () => {
      document.dispatchEvent(new CustomEvent('sigmaCloseUpgrade'));
    };
    closeOverlay?.addEventListener('click', closeHandler);
    closeBtn?.addEventListener('click', closeHandler);

    this.container.appendChild(modal);

    document.addEventListener('sigmaCloseUpgrade', this.handleCloseUpgrade);
  }

  private handleCloseUpgrade = () => {
    this.closeUpgradeModal();
  };

  public closeUpgradeModal(): void {
    this.upgradeModal.isOpen = false;

    const modal = this.container.querySelector('.sigma-upgrade-modal');
    if (modal) {
      modal.remove();
    }

    document.removeEventListener('sigmaCloseUpgrade', this.handleCloseUpgrade);
  }

  private escapeHtml(text: string): string {
    const div = el('div');
    div.textContent = text;
    return div.innerHTML;
  }

  public destroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    if (this.sigma) {
      this.sigma.kill();
      this.sigma = null;
    }
    this.graph.clear();
    this.closeNodePopup();
    this.closeUpgradeModal();
  }
}
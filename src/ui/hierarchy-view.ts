import { Entity } from '../models/entity.js';
import { Relation } from '../models/relation.js';
import { ENTITY_TYPES, LanguageCode } from '../i18n/language-config.js';
import { parseSvg, setStyles, el } from '../utils/dom-helper.js';

export interface HierarchyNode {
  entity: Entity;
  children: HierarchyNode[];
  level: number;
}

export interface HierarchyViewProps {
  entities: Entity[];
  relations: Relation[];
  onNodeClick: (entity: Entity) => void;
  language?: LanguageCode;
}

export class HierarchyView {
  private container: any;
  private props: HierarchyViewProps;
  private rootNodes: HierarchyNode[] = [];
  private expandedNodes: Set<string> = new Set();

  constructor(container: any, props: HierarchyViewProps) {
    this.container = container;
    this.props = props;
    this.buildHierarchy();
    this.render();
  }

  private buildHierarchy(): void {
    const { entities, relations } = this.props;
    
    const entityMap = new Map<string, Entity>();
    entities.forEach(entity => {
      entityMap.set(entity.id, entity);
    });

    const parentMap = new Map<string, Set<string>>();
    const childMap = new Map<string, Set<string>>();

    relations.forEach(relation => {
      const parentTypes = ['属于', '子类', 'BelongsTo', 'SubclassOf'];
      if (parentTypes.includes(relation.relationType)) {
        const parentId = relation.targetId;
        const childId = relation.sourceId;
        
        if (!parentMap.has(childId)) {
          parentMap.set(childId, new Set());
        }
        parentMap.get(childId)!.add(parentId);

        if (!childMap.has(parentId)) {
          childMap.set(parentId, new Set());
        }
        childMap.get(parentId)!.add(childId);
      }
    });

    const rootIds = new Set<string>();
    entities.forEach(entity => {
      if (!parentMap.has(entity.id)) {
        rootIds.add(entity.id);
      }
    });

    const buildNode = (entityId: string, level: number): HierarchyNode | null => {
      const entity = entityMap.get(entityId);
      if (!entity) return null;

      const childIds = childMap.get(entityId) || new Set();
      const children: HierarchyNode[] = [];

      childIds.forEach(childId => {
        const childNode = buildNode(childId, level + 1);
        if (childNode) {
          children.push(childNode);
        }
      });

      return {
        entity,
        children,
        level,
      };
    };

    this.rootNodes = [];
    rootIds.forEach(rootId => {
      const node = buildNode(rootId, 0);
      if (node) {
        this.rootNodes.push(node);
      }
    });

    if (this.rootNodes.length === 0 && entities.length > 0) {
      entities.forEach(entity => {
        this.rootNodes.push({
          entity,
          children: [],
          level: 0,
        });
      });
    }

    this.rootNodes.sort((a, b) => a.entity.name.localeCompare(b.entity.name));
  }

  private getEntityColor(type: string): string {
    const lang = this.props.language || 'zh-CN';
    const types = ENTITY_TYPES[lang] || ENTITY_TYPES['zh-CN'];
    const found = types.find(t => t.type === type);
    return found?.color || '#6366f1';
  }

  private render(): void {
    this.container.replaceChildren();
    this.container.classList.add('hierarchy-container');

    const stat1 = el('span', { text: `实体总数: ${this.props.entities.length}` });
    const stat2 = el('span', { text: `层级关系: ${this.props.relations.filter(r => 
      ['属于', '子类', 'BelongsTo', 'SubclassOf'].includes(r.relationType)
    ).length}` });
    const stat3 = el('span', { text: `根节点: ${this.rootNodes.length}` });
    const stats = el('div', { cls: 'hierarchy-stats' });
    stats.appendChild(stat1);
    stats.appendChild(stat2);
    stats.appendChild(stat3);
    this.container.appendChild(stats);

    if (this.rootNodes.length === 0) {
      const emptyState = el('div', { cls: 'hierarchy-empty', text: '暂无层级数据' });
      this.container.appendChild(emptyState);
      return;
    }

    const tree = el('div', { cls: 'hierarchy-tree' });

    this.rootNodes.forEach(node => {
      tree.appendChild(this.renderNode(node));
    });

    this.container.appendChild(tree);
  }

  private renderNode(node: HierarchyNode): any {
    const hasChildren = node.children.length > 0;
    const isExpanded = this.expandedNodes.has(node.entity.id);

    const wrapper = el('div', { cls: 'hierarchy-node-wrapper' });

    const nodeElement = el('div', { cls: 'hierarchy-node' });

    const indent = el('div', { cls: 'hierarchy-indent' });
    nodeElement.appendChild(indent);

    if (hasChildren) {
      const expandBtn = el('div', { cls: `hierarchy-expand-btn ${isExpanded ? 'expanded' : ''}` });
      expandBtn.appendChild(parseSvg('<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>'));
      expandBtn.addEventListener('click', (e: Event) => {
        e.stopPropagation();
        this.toggleExpand(node.entity.id);
      });
      nodeElement.appendChild(expandBtn);
    } else {
      const spacer = el('div', { cls: 'hierarchy-spacer' });
      nodeElement.appendChild(spacer);
    }

    const dot = el('div', { cls: 'hierarchy-dot' });
    setStyles(dot, { background: this.getEntityColor(node.entity.type) });
    nodeElement.appendChild(dot);

    const label = el('div', { cls: 'hierarchy-label', text: node.entity.name });
    nodeElement.appendChild(label);

    const type = el('div', { cls: 'hierarchy-type', text: node.entity.type });
    nodeElement.appendChild(type);

    nodeElement.addEventListener('click', () => {
      this.props.onNodeClick(node.entity);
    });

    wrapper.appendChild(nodeElement);

    if (hasChildren) {
      const childrenContainer = el('div', { cls: `hierarchy-children ${isExpanded ? 'expanded' : ''}` });

      node.children.forEach(child => {
        childrenContainer.appendChild(this.renderNode(child));
      });

      wrapper.appendChild(childrenContainer);
    }

    return wrapper;
  }

  private toggleExpand(entityId: string): void {
    if (this.expandedNodes.has(entityId)) {
      this.expandedNodes.delete(entityId);
    } else {
      this.expandedNodes.add(entityId);
    }
    this.render();
  }

  public updateData(entities: Entity[], relations: Relation[]): void {
    this.props.entities = entities;
    this.props.relations = relations;
    this.buildHierarchy();
    this.render();
  }

  public setLanguage(lang: LanguageCode): void {
    this.props.language = lang;
    this.render();
  }

  public destroy(): void {
    this.container.replaceChildren();
    this.container.classList.remove('hierarchy-container');
    const style = document.getElementById('hierarchy-styles');
    if (style) {
      style.remove();
    }
  }
}

export function createHierarchyView(container: any, props: HierarchyViewProps): HierarchyView {
  return new HierarchyView(container, props);
}

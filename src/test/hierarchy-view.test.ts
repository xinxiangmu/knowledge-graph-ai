import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HierarchyView } from '../ui/hierarchy-view';
import { Entity } from '../models/entity';
import { Relation } from '../models/relation';

describe('HierarchyView', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '500px';
    container.style.height = '500px';
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('应该创建HierarchyView实例', () => {
    const entities: Entity[] = [];
    const relations: Relation[] = [];
    const onEntityClick = vi.fn();

    const view = new HierarchyView(container, { entities, relations, onEntityClick });
    expect(view).toBeDefined();
  });

  it('应该构建层级结构', () => {
    const entities: Entity[] = [
      { id: 'root', docId: 'doc-1', name: '根节点', type: '概念', tags: [], summary: '', timestamp: Date.now(), filePath: '', isMainEntity: true, createdAt: Date.now(), updatedAt: Date.now() },
      { id: 'child1', docId: 'doc-1', name: '子节点1', type: '概念', tags: [], summary: '', timestamp: Date.now(), filePath: '', isMainEntity: false, createdAt: Date.now(), updatedAt: Date.now() },
      { id: 'child2', docId: 'doc-1', name: '子节点2', type: '概念', tags: [], summary: '', timestamp: Date.now(), filePath: '', isMainEntity: false, createdAt: Date.now(), updatedAt: Date.now() },
    ];
    const relations: Relation[] = [
      { id: 'rel-1', sourceId: 'child1', targetId: 'root', relationType: '属于', docId: 'doc-1', weight: 1.0, createdAt: Date.now(), updatedAt: Date.now() },
      { id: 'rel-2', sourceId: 'child2', targetId: 'root', relationType: '属于', docId: 'doc-1', weight: 1.0, createdAt: Date.now(), updatedAt: Date.now() },
    ];
    const onEntityClick = vi.fn();

    const view = new HierarchyView(container, { entities, relations, onEntityClick });
    expect(view).toBeDefined();
  });

  it('应该处理空数据', () => {
    const entities: Entity[] = [];
    const relations: Relation[] = [];
    const onEntityClick = vi.fn();

    const view = new HierarchyView(container, { entities, relations, onEntityClick });
    expect(view).toBeDefined();
  });

  it('应该处理无层级关系的数据', () => {
    const entities: Entity[] = [
      { id: 'e1', docId: 'doc-1', name: '实体1', type: '概念', tags: [], summary: '', timestamp: Date.now(), filePath: '', isMainEntity: true, createdAt: Date.now(), updatedAt: Date.now() },
      { id: 'e2', docId: 'doc-1', name: '实体2', type: '概念', tags: [], summary: '', timestamp: Date.now(), filePath: '', isMainEntity: false, createdAt: Date.now(), updatedAt: Date.now() },
    ];
    const relations: Relation[] = [
      { id: 'rel-1', sourceId: 'e1', targetId: 'e2', relationType: '关联', docId: 'doc-1', weight: 1.0, createdAt: Date.now(), updatedAt: Date.now() },
    ];
    const onEntityClick = vi.fn();

    const view = new HierarchyView(container, { entities, relations, onEntityClick });
    expect(view).toBeDefined();
  });

  it('应该更新数据', () => {
    const entities: Entity[] = [
      { id: 'e1', docId: 'doc-1', name: '实体1', type: '概念', tags: [], summary: '', timestamp: Date.now(), filePath: '', isMainEntity: true, createdAt: Date.now(), updatedAt: Date.now() },
    ];
    const relations: Relation[] = [];
    const onEntityClick = vi.fn();

    const view = new HierarchyView(container, { entities, relations, onEntityClick });
    
    const newEntities: Entity[] = [
      ...entities,
      { id: 'e2', docId: 'doc-1', name: '实体2', type: '概念', tags: [], summary: '', timestamp: Date.now(), filePath: '', isMainEntity: false, createdAt: Date.now(), updatedAt: Date.now() },
    ];
    
    expect(() => view.updateData(newEntities, relations)).not.toThrow();
  });

  it('应该清理资源', () => {
    const entities: Entity[] = [];
    const relations: Relation[] = [];
    const onEntityClick = vi.fn();

    const view = new HierarchyView(container, { entities, relations, onEntityClick });
    expect(() => view.destroy()).not.toThrow();
  });
});
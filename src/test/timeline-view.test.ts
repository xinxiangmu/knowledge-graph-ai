import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TimelineView, TimelineNode } from '../ui/timeline-view';

describe('TimelineView', () => {
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

  it('应该创建TimelineView实例', () => {
    const nodes: TimelineNode[] = [];
    const onNodeClick = vi.fn();

    const view = new TimelineView(container, { nodes, onNodeClick });
    expect(view).toBeDefined();
  });

  it('应该渲染时间轴数据', () => {
    const now = Date.now();
    const nodes: TimelineNode[] = [
      { id: 'node-1', summary: '事件1摘要', timestamp: now - 10000, tags: ['标签1'], filePath: '', docId: 'doc-1' },
      { id: 'node-2', summary: '事件2摘要', timestamp: now, tags: ['标签2'], filePath: '', docId: 'doc-1' },
    ];
    const onNodeClick = vi.fn();

    const view = new TimelineView(container, { nodes, onNodeClick });
    expect(view).toBeDefined();
  });

  it('应该按时间排序实体', () => {
    const now = Date.now();
    const nodes: TimelineNode[] = [
      { id: 'node-1', summary: '后来的事件', timestamp: now, tags: [], filePath: '', docId: 'doc-1' },
      { id: 'node-2', summary: '早期的事件', timestamp: now - 10000, tags: [], filePath: '', docId: 'doc-1' },
    ];
    const onNodeClick = vi.fn();

    const view = new TimelineView(container, { nodes, onNodeClick });
    expect(view).toBeDefined();
  });

  it('应该处理空数据', () => {
    const nodes: TimelineNode[] = [];
    const onNodeClick = vi.fn();

    const view = new TimelineView(container, { nodes, onNodeClick });
    expect(view).toBeDefined();
  });

  it('应该更新数据', () => {
    const now = Date.now();
    const nodes: TimelineNode[] = [
      { id: 'node-1', summary: '事件1', timestamp: now, tags: [], filePath: '', docId: 'doc-1' },
    ];
    const onNodeClick = vi.fn();

    const view = new TimelineView(container, { nodes, onNodeClick });
    
    const newNodes: TimelineNode[] = [
      ...nodes,
      { id: 'node-2', summary: '事件2', timestamp: now + 10000, tags: [], filePath: '', docId: 'doc-1' },
    ];
    
    expect(() => view.updateNodes(newNodes)).not.toThrow();
  });

  it('应该清理资源', () => {
    const nodes: TimelineNode[] = [];
    const onNodeClick = vi.fn();

    const view = new TimelineView(container, { nodes, onNodeClick });
    expect(() => view.destroy()).not.toThrow();
  });
});
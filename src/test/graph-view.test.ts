import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GraphView, getEntityTypeColors, getAllEntityTypes } from '../ui/graph-view';

describe('Graph View Utilities', () => {
  describe('实体类型颜色', () => {
    it('应该获取中文实体类型颜色', () => {
      const colors = getEntityTypeColors('zh-CN');
      expect(colors['人物']).toBeDefined();
      expect(colors['组织']).toBeDefined();
      expect(colors['地点']).toBeDefined();
      expect(colors['概念']).toBeDefined();
      expect(colors['事件']).toBeDefined();
      expect(colors['default']).toBe('#6366f1');
    });

    it('应该获取英文实体类型颜色', () => {
      const colors = getEntityTypeColors('en-US');
      expect(colors['Person']).toBeDefined();
      expect(colors['Organization']).toBeDefined();
      expect(colors['Location']).toBeDefined();
      expect(colors['Concept']).toBeDefined();
      expect(colors['Event']).toBeDefined();
      expect(colors['default']).toBe('#6366f1');
    });

    it('应该返回默认颜色当类型不存在', () => {
      const colors = getEntityTypeColors('zh-CN');
      expect(colors['未知类型']).toBe(colors['default']);
    });
  });

  describe('实体类型列表', () => {
    it('应该获取所有中文实体类型', () => {
      const types = getAllEntityTypes('zh-CN');
      expect(types.length).toBeGreaterThan(10);
      expect(types).toContain('人物');
      expect(types).toContain('组织');
      expect(types).toContain('地点');
    });

    it('应该获取所有英文实体类型', () => {
      const types = getAllEntityTypes('en-US');
      expect(types.length).toBeGreaterThan(10);
      expect(types).toContain('Person');
      expect(types).toContain('Organization');
      expect(types).toContain('Location');
    });
  });
});

describe('GraphView Component', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '500px';
    container.style.height = '500px';
    document.body.appendChild(container);
    
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      scale: vi.fn(),
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      closePath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      font: '',
      textAlign: '',
      textBaseline: '',
      measureText: vi.fn().mockReturnValue({ width: 100 }),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      globalAlpha: 1,
      shadowColor: '',
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn(),
      getExtension: vi.fn().mockReturnValue(null),
    } as unknown as CanvasRenderingContext2D);
  });

  afterEach(() => {
    document.body.removeChild(container);
    vi.restoreAllMocks();
  });

  it('应该创建GraphView实例', () => {
    const graphView = new GraphView(container, false);
    expect(graphView).toBeDefined();
    expect(graphView.isProVersion()).toBe(false);
  });

  it('应该设置Pro版本', () => {
    const graphView = new GraphView(container, false);
    graphView.setPro(true);
    expect(graphView.isProVersion()).toBe(true);
  });

  it('应该设置语言', () => {
    const graphView = new GraphView(container, false);
    expect(() => graphView.setLanguage('zh-CN')).not.toThrow();
    expect(() => graphView.setLanguage('en-US')).not.toThrow();
  });

  it('应该设置数据', () => {
    const graphView = new GraphView(container, false);
    const entities = [
      {
        id: 'entity-1',
        docId: 'doc-1',
        name: '测试实体',
        type: '概念',
        tags: ['测试'],
        summary: '测试摘要',
        timestamp: Date.now(),
        filePath: '',
        isMainEntity: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];
    const relations: any[] = [];
    
    expect(() => graphView.setData(entities, relations)).not.toThrow();
  });

  it('应该支持缩放操作', () => {
    const graphView = new GraphView(container, false);
    expect(() => graphView.zoomIn()).not.toThrow();
    expect(() => graphView.zoomOut()).not.toThrow();
    expect(() => graphView.resetView()).not.toThrow();
  });

  it('应该支持类型筛选', () => {
    const graphView = new GraphView(container, false);
    expect(() => graphView.setTypeFilter('概念', true)).not.toThrow();
    expect(() => graphView.setTypeFilter('概念', false)).not.toThrow();
  });

  it('应该支持搜索功能', () => {
    const graphView = new GraphView(container, true);
    expect(() => graphView.search('测试')).not.toThrow();
  });

  it('应该清理资源', () => {
    const graphView = new GraphView(container, false);
    expect(() => graphView.destroy()).not.toThrow();
  });
});
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AIModelParser } from '../services/ai-parser.service';
import { GraphStorageServiceImpl } from '../services/graph-storage.service';
import { ExternalAIServiceImpl } from '../services/external-ai.service';
import { requestUrl } from 'obsidian';
import { TEST_CONFIG } from './test-config';

vi.mock('obsidian', () => ({
  requestUrl: vi.fn(),
}));

const DB_NAME = 'knowledge-graph-db';

describe('集成测试', () => {
  let parser: AIModelParser;
  let storage: GraphStorageServiceImpl;
  let aiService: ExternalAIServiceImpl;

  beforeEach(async () => {
    const mockRequestUrl = vi.mocked(requestUrl);
    mockRequestUrl.mockResolvedValue({
      status: 200,
      text: JSON.stringify({
        choices: [{
          message: {
            content: JSON.stringify({
              summary: '测试摘要',
              timestamp: Date.now(),
              tags: ['人工智能', '测试'],
              entities: [
                { name: '测试实体1', type: '概念', summary: '第一个测试实体' },
                { name: '测试实体2', type: '技术', summary: '第二个测试实体' }
              ],
              relations: [
                { sourceName: '测试实体1', targetName: '测试实体2', relationType: '关联' }
              ]
            })
          }
        }]
      })
    });

    const databases = indexedDB.databases();
    const dbNames = await databases;
    
    for (const db of dbNames) {
      if (db.name === DB_NAME) {
        indexedDB.deleteDatabase(db.name);
      }
    }

    parser = new AIModelParser();
    storage = new GraphStorageServiceImpl();
    await storage.initialize();
    aiService = ExternalAIServiceImpl.getInstance();
  });

  afterEach(async () => {
    await storage.close();
    
    const databases = indexedDB.databases();
    const dbNames = await databases;
    
    for (const db of dbNames) {
      if (db.name === DB_NAME) {
        indexedDB.deleteDatabase(db.name);
      }
    }
    
    aiService.clearConfiguration();
    vi.clearAllMocks();
  });

  describe('端到端数据流', () => {
    it('应该完成从解析到存储的完整流程', async () => {
      const structuredText = `## 摘要
这是一篇关于人工智能的测试文档，介绍了机器学习和深度学习的基本概念。

## 标签
- 人工智能
- 机器学习
- 深度学习

## 实体列表
| 实体ID | 实体名称 | 实体类型 | 实体简介 |
|--------|----------|----------|----------|
| ent001 | 人工智能 | 技术 | 机器学习和深度学习的总称 |
| ent002 | 机器学习 | 技术 | AI的一个分支 |
| ent003 | 深度学习 | 技术 | 机器学习的一个子领域 |

## 关系列表
| 源实体ID | 目标实体ID | 关系类型 |
|----------|----------|----------|
| ent001 | ent002 | 包含 |
| ent002 | ent003 | 包含 |`;

      const parseResult = await parser.parse({ text: structuredText });

      expect(parseResult.summary).toBeDefined();
      expect(parseResult.tags).toHaveLength(3);
      expect(parseResult.entities).toHaveLength(3);
      expect(parseResult.relations).toHaveLength(2);

      const docId = 'test-doc-id';
      const now = Date.now();

      const document = {
        id: docId,
        docId,
        filePath: 'test.md',
        fileName: 'test.md',
        title: '测试文档',
        summary: parseResult.summary,
        tags: parseResult.tags,
        category: 'general',
        categories: { arts: 0, social: 0, natural: 0, applied: 100, history: 0, general: 0 },
        timestamp: now,
        entityCount: parseResult.entities.length,
        relationCount: parseResult.relations.length,
        viewCount: 0,
        lastViewedAt: null,
        createdAt: now,
        updatedAt: now,
      };

      await storage.createDocument(document);

      const entitiesWithDocId = parseResult.entities.map((entity, index) => ({
        ...entity,
        id: `${docId}-entity-${index}`,
        docId,
        filePath: 'test.md',
        isMainEntity: index === 0,
        createdAt: now,
        updatedAt: now,
      }));

      await storage.batchInsertEntities(entitiesWithDocId);

      const relationsWithDocId = parseResult.relations.map((relation, index) => {
        const sourceEntity = entitiesWithDocId.find(e => e.name === relation.sourceName);
        const targetEntity = entitiesWithDocId.find(e => e.name === relation.targetName);
        return {
          id: `${docId}-relation-${index}`,
          sourceId: sourceEntity?.id || '',
          targetId: targetEntity?.id || '',
          relationType: relation.relationType,
          docId,
          weight: 1.0,
          createdAt: now,
          updatedAt: now,
        };
      }).filter(r => r.sourceId && r.targetId);

      await storage.batchInsertRelations(relationsWithDocId);

      const storedDoc = await storage.getDocument(docId);
      expect(storedDoc).not.toBeNull();
      expect(storedDoc?.entityCount).toBe(3);
      expect(storedDoc?.relationCount).toBe(2);

      const storedEntities = await storage.queryEntitiesByDocId(docId);
      expect(storedEntities).toHaveLength(3);
      expect(storedEntities.map(e => e.name)).toContain('人工智能');
      expect(storedEntities.map(e => e.name)).toContain('机器学习');
      expect(storedEntities.map(e => e.name)).toContain('深度学习');

      const storedRelations = await storage.queryRelationsByDocId(docId);
      expect(storedRelations).toHaveLength(2);

      const retrievedDoc = await storage.getDocument(docId);
      expect(retrievedDoc?.title).toBe('测试文档');
      expect(retrievedDoc?.summary).toContain('人工智能');
    });

    it('应该支持搜索和查询', async () => {
      const now = Date.now();

      const doc1 = {
        id: 'search-doc-1',
        docId: 'search-1',
        filePath: '',
        fileName: '',
        title: '人工智能入门',
        summary: '介绍AI基础知识',
        tags: ['AI', '机器学习'],
        category: 'general',
        categories: { arts: 0, social: 0, natural: 0, applied: 100, history: 0, general: 0 },
        timestamp: now,
        entityCount: 2,
        relationCount: 1,
        viewCount: 0,
        lastViewedAt: null,
        createdAt: now,
        updatedAt: now,
      };

      const doc2 = {
        id: 'search-doc-2',
        docId: 'search-2',
        filePath: '',
        fileName: '',
        title: '深度学习进阶',
        summary: '深入神经网络',
        tags: ['深度学习', '神经网络'],
        category: 'general',
        categories: { arts: 0, social: 0, natural: 0, applied: 100, history: 0, general: 0 },
        timestamp: now - 1000,
        entityCount: 3,
        relationCount: 2,
        viewCount: 0,
        lastViewedAt: null,
        createdAt: now,
        updatedAt: now,
      };

      await storage.createDocument(doc1);
      await storage.createDocument(doc2);

      const searchResults = await storage.queryDocumentsByTag('AI');
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].title).toBe('人工智能入门');

      const recentDocs = await storage.getRecentDocuments(1);
      expect(recentDocs).toHaveLength(1);
      expect(recentDocs[0].title).toBe('人工智能入门');

      const docCount = await storage.getDocumentCount();
      expect(docCount).toBe(2);
    });

    it('应该正确处理实体关系的完整性', async () => {
      const now = Date.now();

      const entity1 = {
        id: 'rel-entity-1',
        docId: 'rel-doc',
        name: '张三',
        type: '人物',
        tags: ['人物'],
        summary: '测试人物',
        timestamp: now,
        filePath: '',
        isMainEntity: true,
        createdAt: now,
        updatedAt: now,
      };

      const entity2 = {
        id: 'rel-entity-2',
        docId: 'rel-doc',
        name: '李四',
        type: '人物',
        tags: ['人物'],
        summary: '测试人物2',
        timestamp: now,
        filePath: '',
        isMainEntity: false,
        createdAt: now,
        updatedAt: now,
      };

      await storage.createEntity(entity1);
      await storage.createEntity(entity2);

      const relation = {
        id: 'test-relation',
        sourceId: 'rel-entity-1',
        targetId: 'rel-entity-2',
        relationType: '朋友',
        docId: 'rel-doc',
        weight: 1.0,
        createdAt: now,
        updatedAt: now,
      };

      await storage.createRelation(relation);

      const relationsForEntity1 = await storage.queryRelationsByEntity('rel-entity-1');
      expect(relationsForEntity1).toHaveLength(1);
      expect(relationsForEntity1[0].targetId).toBe('rel-entity-2');
      expect(relationsForEntity1[0].relationType).toBe('朋友');

      const relationsForEntity2 = await storage.queryRelationsByEntity('rel-entity-2');
      expect(relationsForEntity2).toHaveLength(1);
      expect(relationsForEntity2[0].sourceId).toBe('rel-entity-1');
    });
  });

  describe('SiliconFlow AI服务集成', () => {
    it('应该正确配置SiliconFlow服务', async () => {
      aiService.configure({
        provider: 'siliconflow',
        apiKey: TEST_CONFIG.siliconflow.apiKey,
        model: TEST_CONFIG.siliconflow.model,
        baseUrl: TEST_CONFIG.siliconflow.apiBase + '/chat/completions',
      });

      expect(aiService.isConfigured()).toBe(true);
      expect(aiService.getProvider()).toBe('siliconflow');
      expect(aiService.getModel()).toBe('deepseek-ai/DeepSeek-R1-0528-Qwen3-8B');

      const adapter = aiService.getAdapter();
      expect(adapter).not.toBeNull();
    });

    it('应该通过SiliconFlow服务发送聊天请求', async () => {
      const mockRequestUrl = vi.mocked(requestUrl);

      aiService.configure({
        provider: 'siliconflow',
        apiKey: TEST_CONFIG.siliconflow.apiKey,
        model: TEST_CONFIG.siliconflow.model,
        baseUrl: TEST_CONFIG.siliconflow.apiBase + '/chat/completions',
      });

      const adapter = aiService.getAdapter();
      expect(adapter).not.toBeNull();

      if (adapter) {
        const response = await adapter.chat([{ role: 'user', content: 'Hello' }]);
        expect(response).toBeDefined();
        expect(mockRequestUrl).toHaveBeenCalled();
      }
    });
  });

  describe('错误处理', () => {
    it('应该处理存储操作失败', async () => {
      await storage.close();

      await expect(storage.createDocument({} as any)).rejects.toThrow();
    });

    it('应该处理解析空文本', async () => {
      await expect(parser.parse({ text: '' })).rejects.toThrow('输入文本不能为空');
    });
  });
});
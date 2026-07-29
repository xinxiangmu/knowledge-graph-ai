import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GraphStorageServiceImpl, createGraphStorageService, closeGraphStorageService } from '../services/graph-storage.service';
import { Entity } from '../models/entity';
import { Relation } from '../models/relation';
import { Document } from '../models/document';

const DB_NAME = 'knowledge-graph-db';

describe('GraphStorageService', () => {
  let service: GraphStorageServiceImpl;

  beforeEach(async () => {
    const databases = indexedDB.databases();
    const dbNames = await databases;
    
    for (const db of dbNames) {
      if (db.name === DB_NAME) {
        indexedDB.deleteDatabase(db.name);
      }
    }
    
    service = new GraphStorageServiceImpl();
    await service.initialize();
  });

  afterEach(async () => {
    await service.close();
    
    const databases = indexedDB.databases();
    const dbNames = await databases;
    
    for (const db of dbNames) {
      if (db.name === DB_NAME) {
        indexedDB.deleteDatabase(db.name);
      }
    }
  });

  describe('实体操作', () => {
    it('应该创建实体', async () => {
      const entity: Entity = {
        id: 'test-entity-1',
        docId: 'test-doc-1',
        name: '测试实体',
        type: '概念',
        tags: ['测试', '实体'],
        summary: '测试实体摘要',
        timestamp: Date.now(),
        filePath: 'test.md',
        isMainEntity: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      const created = await service.createEntity(entity);
      
      expect(created.id).toBe('test-entity-1');
      expect(created.name).toBe('测试实体');
      expect(created.type).toBe('概念');
    });

    it('应该获取实体', async () => {
      const entity: Entity = {
        id: 'test-entity-get',
        docId: 'test-doc-1',
        name: '获取测试',
        type: '概念',
        tags: [],
        summary: '',
        timestamp: Date.now(),
        filePath: '',
        isMainEntity: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      await service.createEntity(entity);
      const retrieved = await service.getEntity('test-entity-get');
      
      expect(retrieved).not.toBeNull();
      expect(retrieved?.name).toBe('获取测试');
    });

    it('应该更新实体', async () => {
      const entity: Entity = {
        id: 'test-entity-update',
        docId: 'test-doc-1',
        name: '原始名称',
        type: '概念',
        tags: [],
        summary: '',
        timestamp: Date.now(),
        filePath: '',
        isMainEntity: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      await service.createEntity(entity);
      const updated = await service.updateEntity('test-entity-update', { name: '更新名称', type: '技术' });
      
      expect(updated.name).toBe('更新名称');
      expect(updated.type).toBe('技术');
    });

    it('应该删除实体', async () => {
      const entity: Entity = {
        id: 'test-entity-delete',
        docId: 'test-doc-1',
        name: '删除测试',
        type: '概念',
        tags: [],
        summary: '',
        timestamp: Date.now(),
        filePath: '',
        isMainEntity: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      await service.createEntity(entity);
      const deleted = await service.deleteEntity('test-entity-delete');
      const retrieved = await service.getEntity('test-entity-delete');
      
      expect(deleted).toBe(true);
      expect(retrieved).toBeUndefined();
    });

    it('应该按文档ID查询实体', async () => {
      const entity1: Entity = {
        id: 'entity-doc-1',
        docId: 'doc-1',
        name: '文档1实体1',
        type: '概念',
        tags: [],
        summary: '',
        timestamp: Date.now(),
        filePath: '',
        isMainEntity: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      const entity2: Entity = {
        id: 'entity-doc-2',
        docId: 'doc-1',
        name: '文档1实体2',
        type: '概念',
        tags: [],
        summary: '',
        timestamp: Date.now(),
        filePath: '',
        isMainEntity: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      const entity3: Entity = {
        id: 'entity-doc-3',
        docId: 'doc-2',
        name: '文档2实体',
        type: '概念',
        tags: [],
        summary: '',
        timestamp: Date.now(),
        filePath: '',
        isMainEntity: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      await service.createEntity(entity1);
      await service.createEntity(entity2);
      await service.createEntity(entity3);
      
      const entities = await service.queryEntitiesByDocId('doc-1');
      
      expect(entities).toHaveLength(2);
      expect(entities.map(e => e.name)).toContain('文档1实体1');
      expect(entities.map(e => e.name)).toContain('文档1实体2');
    });

    it('应该按类型查询实体', async () => {
      const entity1: Entity = {
        id: 'entity-type-1',
        docId: 'doc-1',
        name: '人物1',
        type: '人物',
        tags: [],
        summary: '',
        timestamp: Date.now(),
        filePath: '',
        isMainEntity: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      const entity2: Entity = {
        id: 'entity-type-2',
        docId: 'doc-1',
        name: '地点1',
        type: '地点',
        tags: [],
        summary: '',
        timestamp: Date.now(),
        filePath: '',
        isMainEntity: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      await service.createEntity(entity1);
      await service.createEntity(entity2);
      
      const persons = await service.queryEntitiesByType('人物');
      
      expect(persons).toHaveLength(1);
      expect(persons[0].name).toBe('人物1');
    });

    it('应该搜索实体', async () => {
      const entity1: Entity = {
        id: 'entity-search-1',
        docId: 'doc-1',
        name: '人工智能',
        type: '技术',
        tags: [],
        summary: 'AI技术',
        timestamp: Date.now(),
        filePath: '',
        isMainEntity: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      const entity2: Entity = {
        id: 'entity-search-2',
        docId: 'doc-1',
        name: '机器学习',
        type: '技术',
        tags: [],
        summary: 'ML技术',
        timestamp: Date.now(),
        filePath: '',
        isMainEntity: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      await service.createEntity(entity1);
      await service.createEntity(entity2);
      
      const results = await service.searchEntities('智能');
      
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('人工智能');
    });

    it('应该批量插入实体', async () => {
      const entities: Entity[] = [
        {
          id: 'batch-1',
          docId: 'doc-1',
          name: '批量实体1',
          type: '概念',
          tags: [],
          summary: '',
          timestamp: Date.now(),
          filePath: '',
          isMainEntity: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: 'batch-2',
          docId: 'doc-1',
          name: '批量实体2',
          type: '概念',
          tags: [],
          summary: '',
          timestamp: Date.now(),
          filePath: '',
          isMainEntity: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];
      
      const results = await service.batchInsertEntities(entities);
      
      expect(results).toHaveLength(2);
      const allEntities = await service.getAllEntities();
      expect(allEntities).toHaveLength(2);
    });
  });

  describe('关系操作', () => {
    it('应该创建关系', async () => {
      const relation: Relation = {
        id: 'test-relation-1',
        sourceId: 'entity-1',
        targetId: 'entity-2',
        relationType: '关联',
        docId: 'doc-1',
        weight: 1.0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      const created = await service.createRelation(relation);
      
      expect(created.id).toBe('test-relation-1');
      expect(created.sourceId).toBe('entity-1');
      expect(created.targetId).toBe('entity-2');
      expect(created.relationType).toBe('关联');
    });

    it('应该获取关系', async () => {
      const relation: Relation = {
        id: 'test-relation-get',
        sourceId: 'e1',
        targetId: 'e2',
        relationType: '测试',
        docId: 'doc-1',
        weight: 1.0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      await service.createRelation(relation);
      const retrieved = await service.getRelation('test-relation-get');
      
      expect(retrieved).not.toBeNull();
      expect(retrieved?.relationType).toBe('测试');
    });

    it('应该更新关系', async () => {
      const relation: Relation = {
        id: 'test-relation-update',
        sourceId: 'e1',
        targetId: 'e2',
        relationType: '原始类型',
        docId: 'doc-1',
        weight: 1.0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      await service.createRelation(relation);
      const updated = await service.updateRelation('test-relation-update', { relationType: '更新类型', weight: 2.0 });
      
      expect(updated.relationType).toBe('更新类型');
      expect(updated.weight).toBe(2.0);
    });

    it('应该删除关系', async () => {
      const relation: Relation = {
        id: 'test-relation-delete',
        sourceId: 'e1',
        targetId: 'e2',
        relationType: '删除',
        docId: 'doc-1',
        weight: 1.0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      await service.createRelation(relation);
      const deleted = await service.deleteRelation('test-relation-delete');
      const retrieved = await service.getRelation('test-relation-delete');
      
      expect(deleted).toBe(true);
      expect(retrieved).toBeUndefined();
    });

    it('应该按实体ID查询关系', async () => {
      const relation1: Relation = {
        id: 'rel-entity-1',
        sourceId: 'e1',
        targetId: 'e2',
        relationType: '关联',
        docId: 'doc-1',
        weight: 1.0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      const relation2: Relation = {
        id: 'rel-entity-2',
        sourceId: 'e2',
        targetId: 'e3',
        relationType: '关联',
        docId: 'doc-1',
        weight: 1.0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      const relation3: Relation = {
        id: 'rel-entity-3',
        sourceId: 'e4',
        targetId: 'e5',
        relationType: '关联',
        docId: 'doc-1',
        weight: 1.0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      await service.createRelation(relation1);
      await service.createRelation(relation2);
      await service.createRelation(relation3);
      
      const relations = await service.queryRelationsByEntity('e2');
      
      expect(relations).toHaveLength(2);
    });

    it('应该按文档ID查询关系', async () => {
      const relation1: Relation = {
        id: 'rel-doc-1',
        sourceId: 'e1',
        targetId: 'e2',
        relationType: '关联',
        docId: 'doc-1',
        weight: 1.0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      const relation2: Relation = {
        id: 'rel-doc-2',
        sourceId: 'e3',
        targetId: 'e4',
        relationType: '关联',
        docId: 'doc-2',
        weight: 1.0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      await service.createRelation(relation1);
      await service.createRelation(relation2);
      
      const relations = await service.queryRelationsByDocId('doc-1');
      
      expect(relations).toHaveLength(1);
      expect(relations[0].id).toBe('rel-doc-1');
    });

    it('应该批量插入关系', async () => {
      const relations: Relation[] = [
        {
          id: 'batch-rel-1',
          sourceId: 'e1',
          targetId: 'e2',
          relationType: '关联',
          docId: 'doc-1',
          weight: 1.0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: 'batch-rel-2',
          sourceId: 'e2',
          targetId: 'e3',
          relationType: '关联',
          docId: 'doc-1',
          weight: 1.0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];
      
      const results = await service.batchInsertRelations(relations);
      
      expect(results).toHaveLength(2);
      const allRelations = await service.getAllRelations();
      expect(allRelations).toHaveLength(2);
    });
  });

  describe('文档操作', () => {
    it('应该创建文档', async () => {
      const doc: Document = {
        id: 'test-doc-1',
        docId: 'test-doc-id-1',
        filePath: 'test/file.md',
        fileName: 'test.md',
        title: '测试文档',
        summary: '测试文档摘要',
        tags: ['测试', '文档'],
        category: 'general',
        categories: { arts: 0, social: 0, natural: 0, applied: 0, history: 0, general: 100 },
        timestamp: Date.now(),
        entityCount: 5,
        relationCount: 3,
        viewCount: 0,
        lastViewedAt: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      const created = await service.createDocument(doc);
      
      expect(created.id).toBe('test-doc-1');
      expect(created.title).toBe('测试文档');
      expect(created.entityCount).toBe(5);
    });

    it('应该获取文档', async () => {
      const doc: Document = {
        id: 'test-doc-get',
        docId: 'doc-get-id',
        filePath: '',
        fileName: '',
        title: '获取测试',
        summary: '',
        tags: [],
        category: 'general',
        categories: { arts: 0, social: 0, natural: 0, applied: 0, history: 0, general: 100 },
        timestamp: Date.now(),
        entityCount: 0,
        relationCount: 0,
        viewCount: 0,
        lastViewedAt: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      await service.createDocument(doc);
      const retrieved = await service.getDocument('test-doc-get');
      
      expect(retrieved).not.toBeNull();
      expect(retrieved?.title).toBe('获取测试');
    });

    it('应该更新文档', async () => {
      const doc: Document = {
        id: 'test-doc-update',
        docId: 'doc-update-id',
        filePath: '',
        fileName: '',
        title: '原始标题',
        summary: '',
        tags: [],
        category: 'general',
        categories: { arts: 0, social: 0, natural: 0, applied: 0, history: 0, general: 100 },
        timestamp: Date.now(),
        entityCount: 0,
        relationCount: 0,
        viewCount: 0,
        lastViewedAt: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      await service.createDocument(doc);
      const updated = await service.updateDocument('test-doc-update', { title: '更新标题', viewCount: 5 });
      
      expect(updated.title).toBe('更新标题');
      expect(updated.viewCount).toBe(5);
    });

    it('应该删除文档', async () => {
      const doc: Document = {
        id: 'test-doc-delete',
        docId: 'doc-delete-id',
        filePath: '',
        fileName: '',
        title: '删除测试',
        summary: '',
        tags: [],
        category: 'general',
        categories: { arts: 0, social: 0, natural: 0, applied: 0, history: 0, general: 100 },
        timestamp: Date.now(),
        entityCount: 0,
        relationCount: 0,
        viewCount: 0,
        lastViewedAt: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      await service.createDocument(doc);
      const deleted = await service.deleteDocument('test-doc-delete');
      const retrieved = await service.getDocument('test-doc-delete');
      
      expect(deleted).toBe(true);
      expect(retrieved).toBeUndefined();
    });

    it('应该获取文档数量', async () => {
      const doc1: Document = {
        id: 'count-doc-1',
        docId: 'count-1',
        filePath: '',
        fileName: '',
        title: '',
        summary: '',
        tags: [],
        category: 'general',
        categories: { arts: 0, social: 0, natural: 0, applied: 0, history: 0, general: 100 },
        timestamp: Date.now(),
        entityCount: 0,
        relationCount: 0,
        viewCount: 0,
        lastViewedAt: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      const doc2: Document = {
        id: 'count-doc-2',
        docId: 'count-2',
        filePath: '',
        fileName: '',
        title: '',
        summary: '',
        tags: [],
        category: 'general',
        categories: { arts: 0, social: 0, natural: 0, applied: 0, history: 0, general: 100 },
        timestamp: Date.now(),
        entityCount: 0,
        relationCount: 0,
        viewCount: 0,
        lastViewedAt: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      await service.createDocument(doc1);
      await service.createDocument(doc2);
      
      const count = await service.getDocumentCount();
      
      expect(count).toBe(2);
    });

    it('应该获取最近文档', async () => {
      const now = Date.now();
      
      const doc1: Document = {
        id: 'recent-doc-1',
        docId: 'recent-1',
        filePath: '',
        fileName: '',
        title: '最新文档',
        summary: '',
        tags: [],
        category: 'general',
        categories: { arts: 0, social: 0, natural: 0, applied: 0, history: 0, general: 100 },
        timestamp: now,
        entityCount: 0,
        relationCount: 0,
        viewCount: 0,
        lastViewedAt: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      const doc2: Document = {
        id: 'recent-doc-2',
        docId: 'recent-2',
        filePath: '',
        fileName: '',
        title: '旧文档',
        summary: '',
        tags: [],
        category: 'general',
        categories: { arts: 0, social: 0, natural: 0, applied: 0, history: 0, general: 100 },
        timestamp: now - 10000,
        entityCount: 0,
        relationCount: 0,
        viewCount: 0,
        lastViewedAt: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      await service.createDocument(doc2);
      await service.createDocument(doc1);
      
      const recent = await service.getRecentDocuments(1);
      
      expect(recent).toHaveLength(1);
      expect(recent[0].title).toBe('最新文档');
    });

    it('应该按标签查询文档', async () => {
      const doc1: Document = {
        id: 'tag-doc-1',
        docId: 'tag-1',
        filePath: '',
        fileName: '',
        title: '标签测试1',
        summary: '',
        tags: ['人工智能', '机器学习'],
        category: 'general',
        categories: { arts: 0, social: 0, natural: 0, applied: 0, history: 0, general: 100 },
        timestamp: Date.now(),
        entityCount: 0,
        relationCount: 0,
        viewCount: 0,
        lastViewedAt: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      const doc2: Document = {
        id: 'tag-doc-2',
        docId: 'tag-2',
        filePath: '',
        fileName: '',
        title: '标签测试2',
        summary: '',
        tags: ['深度学习'],
        category: 'general',
        categories: { arts: 0, social: 0, natural: 0, applied: 0, history: 0, general: 100 },
        timestamp: Date.now(),
        entityCount: 0,
        relationCount: 0,
        viewCount: 0,
        lastViewedAt: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      await service.createDocument(doc1);
      await service.createDocument(doc2);
      
      const docs = await service.queryDocumentsByTag('人工智能');
      
      expect(docs).toHaveLength(1);
      expect(docs[0].title).toBe('标签测试1');
    });

    it('应该批量插入文档', async () => {
      const docs: Document[] = [
        {
          id: 'batch-doc-1',
          docId: 'batch-1',
          filePath: '',
          fileName: '',
          title: '批量文档1',
          summary: '',
          tags: [],
          category: 'general',
          categories: { arts: 0, social: 0, natural: 0, applied: 0, history: 0, general: 100 },
          timestamp: Date.now(),
          entityCount: 0,
          relationCount: 0,
          viewCount: 0,
          lastViewedAt: null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: 'batch-doc-2',
          docId: 'batch-2',
          filePath: '',
          fileName: '',
          title: '批量文档2',
          summary: '',
          tags: [],
          category: 'general',
          categories: { arts: 0, social: 0, natural: 0, applied: 0, history: 0, general: 100 },
          timestamp: Date.now(),
          entityCount: 0,
          relationCount: 0,
          viewCount: 0,
          lastViewedAt: null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];
      
      const results = await service.batchInsertDocuments(docs);
      
      expect(results).toHaveLength(2);
      const count = await service.getDocumentCount();
      expect(count).toBe(2);
    });
  });

  describe('初始化和关闭', () => {
    it('应该正确初始化', async () => {
      const newService = new GraphStorageServiceImpl();
      await newService.initialize();
      expect(newService['db']).not.toBeNull();
      await newService.close();
    });

    it('应该正确关闭', async () => {
      await service.close();
      expect(service['db']).toBeNull();
    });

    it('应该在未初始化时抛出错误', async () => {
      const newService = new GraphStorageServiceImpl();
      await expect(newService.createEntity({} as Entity)).rejects.toThrow('Database not initialized');
    });
  });
});
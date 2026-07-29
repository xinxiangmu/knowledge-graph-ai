// Graph storage service using IndexedDB
// This is a simple, reliable storage solution that works in all browser environments including Electron

import { Entity } from '../models/entity.js';
import { Relation } from '../models/relation.js';
import { Document } from '../models/document.js';

export interface GraphStorageOptions {
  persist?: string;
}

export interface GraphStorageService {
  initialize(): Promise<void>;
  close(): Promise<void>;
  createEntity(entity: Entity): Promise<Entity>;
  getEntity(id: string): Promise<Entity | null>;
  updateEntity(id: string, updates: Partial<Entity>): Promise<Entity>;
  deleteEntity(id: string): Promise<boolean>;
  queryEntitiesByDocId(docId: string): Promise<Entity[]>;
  queryEntitiesByType(type: string): Promise<Entity[]>;
  queryEntitiesByTags(tags: string[]): Promise<Entity[]>;
  searchEntities(keyword: string): Promise<Entity[]>;
  getAllEntities(): Promise<Entity[]>;
  createRelation(relation: Relation): Promise<Relation>;
  getRelation(id: string): Promise<Relation | null>;
  updateRelation(id: string, updates: Partial<Relation>): Promise<Relation>;
  deleteRelation(id: string): Promise<boolean>;
  queryRelationsByEntity(entityId: string): Promise<Relation[]>;
  queryRelationsByDocId(docId: string): Promise<Relation[]>;
  queryRelationsByType(relationType: string): Promise<Relation[]>;
  getAllRelations(): Promise<Relation[]>;
  createDocument(doc: Document): Promise<Document>;
  getDocument(id: string): Promise<Document | null>;
  updateDocument(id: string, updates: Partial<Document>): Promise<Document>;
  deleteDocument(id: string): Promise<boolean>;
  getDocumentCount(): Promise<number>;
  queryDocumentsByTag(tag: string): Promise<Document[]>;
  queryDocumentsByTimestampRange(start: number, end: number): Promise<Document[]>;
  getRecentDocuments(limit: number): Promise<Document[]>;
  queryKeywordsByDocId(docId: string): Promise<string[]>;
  batchInsertEntities(entities: Entity[], onProgress?: (progress: number) => void): Promise<Entity[]>;
  batchInsertRelations(relations: Relation[], onProgress?: (progress: number) => void): Promise<Relation[]>;
  batchInsertDocuments(documents: Document[], onProgress?: (progress: number) => void): Promise<Document[]>;
}

const DB_NAME = 'knowledge-graph-db';
const DB_VERSION = 1;
const ENTITY_STORE = 'entities';
const RELATION_STORE = 'relations';
const DOCUMENT_STORE = 'documents';
const KEYWORD_STORE = 'keywords';
const BATCH_SIZE = 100;

export class GraphStorageServiceImpl implements GraphStorageService {
  private db: IDBDatabase | null = null;
  private persistName: string | null = null;

  constructor(options?: GraphStorageOptions) {
    this.persistName = options?.persist || 'knowledge-graph';
  }

  async initialize(): Promise<void> {
    if (this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[GraphStorage] Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create entities store
        if (!db.objectStoreNames.contains(ENTITY_STORE)) {
          const entityStore = db.createObjectStore(ENTITY_STORE, { keyPath: 'id' });
          entityStore.createIndex('docId', 'docId', { unique: false });
          entityStore.createIndex('type', 'type', { unique: false });
          entityStore.createIndex('name', 'name', { unique: false });
          entityStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Create relations store
        if (!db.objectStoreNames.contains(RELATION_STORE)) {
          const relationStore = db.createObjectStore(RELATION_STORE, { keyPath: 'id' });
          relationStore.createIndex('sourceId', 'sourceId', { unique: false });
          relationStore.createIndex('targetId', 'targetId', { unique: false });
          relationStore.createIndex('docId', 'docId', { unique: false });
          relationStore.createIndex('relationType', 'relationType', { unique: false });
        }

        // Create documents store
        if (!db.objectStoreNames.contains(DOCUMENT_STORE)) {
          const docStore = db.createObjectStore(DOCUMENT_STORE, { keyPath: 'id' });
          docStore.createIndex('timestamp', 'timestamp', { unique: false });
          docStore.createIndex('filePath', 'filePath', { unique: false });
        }

        // Create keywords store
        if (!db.objectStoreNames.contains(KEYWORD_STORE)) {
          db.createObjectStore(KEYWORD_STORE, { keyPath: 'word' });
        }

      };
    });
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  private ensureInitialized(): void {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
  }

  private async addToStore(storeName: string, data: any): Promise<any> {
    this.ensureInitialized();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);
      request.onsuccess = () => resolve(data);
      request.onerror = () => reject(request.error);
    });
  }

  private async getFromStore(storeName: string, id: string): Promise<any> {
    this.ensureInitialized();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async deleteFromStore(storeName: string, id: string): Promise<boolean> {
    this.ensureInitialized();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  private async getAllFromStore(storeName: string): Promise<any[]> {
    this.ensureInitialized();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  private async queryByIndex(storeName: string, indexName: string, value: any): Promise<any[]> {
    this.ensureInitialized();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Entity operations
  async createEntity(entity: Entity): Promise<Entity> {
    const existing = await this.getEntity(entity.id);
    if (existing) {
      return this.updateEntity(entity.id, entity);
    }
    return this.addToStore(ENTITY_STORE, entity) as Promise<Entity>;
  }

  async getEntity(id: string): Promise<Entity | null> {
    return (await this.getFromStore(ENTITY_STORE, id)) as Entity | null;
  }

  async updateEntity(id: string, updates: Partial<Entity>): Promise<Entity> {
    const existing = await this.getEntity(id);
    if (!existing) {
      throw new Error(`Entity with id ${id} not found`);
    }
    const updated: Entity = {
      ...existing,
      ...updates,
      id,
      updatedAt: Date.now(),
    };
    return this.addToStore(ENTITY_STORE, updated) as Promise<Entity>;
  }

  async deleteEntity(id: string): Promise<boolean> {
    return this.deleteFromStore(ENTITY_STORE, id);
  }

  async queryEntitiesByDocId(docId: string): Promise<Entity[]> {
    return this.queryByIndex(ENTITY_STORE, 'docId', docId) as Promise<Entity[]>;
  }

  async queryEntitiesByType(type: string): Promise<Entity[]> {
    return this.queryByIndex(ENTITY_STORE, 'type', type) as Promise<Entity[]>;
  }

  async queryEntitiesByTags(tags: string[]): Promise<Entity[]> {
    const allEntities = await this.getAllFromStore(ENTITY_STORE) as Entity[];
    return allEntities.filter(entity =>
      tags.some(tag => entity.tags && entity.tags.includes(tag))
    );
  }

  async searchEntities(keyword: string): Promise<Entity[]> {
    const allEntities = await this.getAllFromStore(ENTITY_STORE) as Entity[];
    const lowerKeyword = keyword.toLowerCase();
    return allEntities.filter(entity =>
      (entity.name && entity.name.toLowerCase().includes(lowerKeyword)) ||
      (entity.summary && entity.summary.toLowerCase().includes(lowerKeyword)) ||
      (entity.type && entity.type.toLowerCase().includes(lowerKeyword))
    );
  }

  // Relation operations
  async createRelation(relation: Relation): Promise<Relation> {
    const existing = await this.getRelation(relation.id);
    if (existing) {
      return this.updateRelation(relation.id, relation);
    }
    return this.addToStore(RELATION_STORE, relation) as Promise<Relation>;
  }

  async getRelation(id: string): Promise<Relation | null> {
    return (await this.getFromStore(RELATION_STORE, id)) as Relation | null;
  }

  async updateRelation(id: string, updates: Partial<Relation>): Promise<Relation> {
    const existing = await this.getRelation(id);
    if (!existing) {
      throw new Error(`Relation with id ${id} not found`);
    }
    const updated: Relation = {
      ...existing,
      ...updates,
      id,
      updatedAt: Date.now(),
    };
    return this.addToStore(RELATION_STORE, updated) as Promise<Relation>;
  }

  async deleteRelation(id: string): Promise<boolean> {
    return this.deleteFromStore(RELATION_STORE, id);
  }

  async queryRelationsByEntity(entityId: string): Promise<Relation[]> {
    const bySource = await this.queryByIndex(RELATION_STORE, 'sourceId', entityId) as Relation[];
    const byTarget = await this.queryByIndex(RELATION_STORE, 'targetId', entityId) as Relation[];
    // Combine and deduplicate
    const all = [...bySource, ...byTarget];
    const seen = new Set<string>();
    return all.filter(r => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
  }

  async queryRelationsByDocId(docId: string): Promise<Relation[]> {
    return this.queryByIndex(RELATION_STORE, 'docId', docId) as Promise<Relation[]>;
  }

  async queryRelationsByType(relationType: string): Promise<Relation[]> {
    return this.queryByIndex(RELATION_STORE, 'relationType', relationType) as Promise<Relation[]>;
  }

  // 获取所有实体
  async getAllEntities(): Promise<Entity[]> {
    return this.getAllFromStore(ENTITY_STORE) as Promise<Entity[]>;
  }

  // 获取所有关系
  async getAllRelations(): Promise<Relation[]> {
    return this.getAllFromStore(RELATION_STORE) as Promise<Relation[]>;
  }

  // Document operations
  async createDocument(doc: Document): Promise<Document> {
    const existing = await this.getDocument(doc.id);
    if (existing) {
      return this.updateDocument(doc.id, doc);
    }
    return this.addToStore(DOCUMENT_STORE, doc) as Promise<Document>;
  }

  async getDocument(id: string): Promise<Document | null> {
    return (await this.getFromStore(DOCUMENT_STORE, id)) as Document | null;
  }

  async updateDocument(id: string, updates: Partial<Document>): Promise<Document> {
    const existing = await this.getDocument(id);
    if (!existing) {
      throw new Error(`Document with id ${id} not found`);
    }
    const updated: Document = {
      ...existing,
      ...updates,
      id,
      updatedAt: Date.now(),
    };
    return this.addToStore(DOCUMENT_STORE, updated) as Promise<Document>;
  }

  async deleteDocument(id: string): Promise<boolean> {
    const entities = await this.queryEntitiesByDocId(id);
    const relations = await this.queryRelationsByDocId(id);

    for (const entity of entities) {
      await this.deleteEntity(entity.id);
    }

    for (const relation of relations) {
      await this.deleteRelation(relation.id);
    }

    return this.deleteFromStore(DOCUMENT_STORE, id);
  }

  async getDocumentCount(): Promise<number> {
    const docs = await this.getAllFromStore(DOCUMENT_STORE);
    return docs.length;
  }

  async queryDocumentsByTag(tag: string): Promise<Document[]> {
    const allDocs = await this.getAllFromStore(DOCUMENT_STORE) as Document[];
    return allDocs.filter(doc =>
      doc.tags && doc.tags.includes(tag)
    );
  }

  async queryDocumentsByTimestampRange(start: number, end: number): Promise<Document[]> {
    const allDocs = await this.getAllFromStore(DOCUMENT_STORE) as Document[];
    return allDocs.filter(doc =>
      doc.timestamp >= start && doc.timestamp <= end
    );
  }

  async getRecentDocuments(limit: number): Promise<Document[]> {
    const allDocs = await this.getAllFromStore(DOCUMENT_STORE) as Document[];
    return allDocs
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, limit);
  }

  async queryKeywordsByDocId(docId: string): Promise<string[]> {
    const allKeywords = await this.getAllFromStore(KEYWORD_STORE);
    return allKeywords
      .filter((kw: any) => kw.docId === docId)
      .map((kw: any) => kw.word);
  }

  // Batch operations
  async batchInsertEntities(entities: Entity[], onProgress?: (progress: number) => void): Promise<Entity[]> {
    const results: Entity[] = [];
    const total = entities.length;

    for (let i = 0; i < total; i += BATCH_SIZE) {
      const batch = entities.slice(i, i + BATCH_SIZE);
      for (const entity of batch) {
        await this.createEntity(entity);
        results.push(entity);
      }
      if (onProgress) {
        onProgress(Math.round(((i + batch.length) / total) * 100));
      }
    }

    return results;
  }

  async batchInsertRelations(relations: Relation[], onProgress?: (progress: number) => void): Promise<Relation[]> {
    const results: Relation[] = [];
    const total = relations.length;

    for (let i = 0; i < total; i += BATCH_SIZE) {
      const batch = relations.slice(i, i + BATCH_SIZE);
      for (const relation of batch) {
        await this.createRelation(relation);
        results.push(relation);
      }
      if (onProgress) {
        onProgress(Math.round(((i + batch.length) / total) * 100));
      }
    }

    return results;
  }

  async batchInsertDocuments(documents: Document[], onProgress?: (progress: number) => void): Promise<Document[]> {
    const results: Document[] = [];
    const total = documents.length;

    for (let i = 0; i < total; i += BATCH_SIZE) {
      const batch = documents.slice(i, i + BATCH_SIZE);
      for (const doc of batch) {
        await this.createDocument(doc);
        results.push(doc);
      }
      if (onProgress) {
        onProgress(Math.round(((i + batch.length) / total) * 100));
      }
    }

    return results;
  }
}

let globalService: GraphStorageServiceImpl | null = null;

export async function createGraphStorageService(options?: GraphStorageOptions): Promise<GraphStorageServiceImpl> {
  const service = new GraphStorageServiceImpl(options);
  await service.initialize();
  globalService = service;
  return service;
}

export function getGraphStorageService(): GraphStorageServiceImpl | null {
  return globalService;
}

export async function closeGraphStorageService(): Promise<void> {
  if (globalService) {
    await globalService.close();
    globalService = null;
  }
}

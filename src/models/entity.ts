export interface Entity {
  id: string;
  docId: string;
  name: string;
  type: string;
  tags: string[];
  summary: string;
  timestamp: number;
  filePath: string;
  isMainEntity: boolean;
  createdAt: number;
  updatedAt: number;
}

export class EntityModel {
  private entities: Map<string, Entity> = new Map();

  create(data: Partial<Entity> & { docId: string; name: string }): Entity {
    if (!data.docId || !data.name) {
      throw new Error('缺少必需字段');
    }

    const now = Date.now();
    const entity: Entity = {
      id: data.id || crypto.randomUUID(),
      docId: data.docId,
      name: data.name,
      type: data.type || '',
      tags: data.tags || [],
      summary: data.summary || '',
      timestamp: data.timestamp || now,
      filePath: data.filePath || '',
      isMainEntity: data.isMainEntity ?? false,
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now,
    };

    this.entities.set(entity.id, entity);
    return entity;
  }

  getById(id: string): Entity | null {
    return this.entities.get(id) || null;
  }

  getAll(): Entity[] {
    return Array.from(this.entities.values());
  }

  update(id: string, data: Partial<Entity>): Entity | null {
    const existing = this.entities.get(id);
    if (!existing) {
      return null;
    }

    const now = Date.now();
    const updated: Entity = {
      ...existing,
      ...data,
      id: existing.id,
      updatedAt: Math.max(now, existing.updatedAt + 1),
    };

    this.entities.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.entities.delete(id);
  }

  getByDocId(docId: string): Entity[] {
    return this.getAll().filter((e) => e.docId === docId);
  }

  getByType(type: string): Entity[] {
    return this.getAll().filter((e) => e.type === type);
  }

  getByTag(tag: string): Entity[] {
    return this.getAll().filter((e) => e.tags.includes(tag));
  }

  search(keyword: string): Entity[] {
    return this.getAll().filter(
      (e) =>
        e.name.includes(keyword) ||
        e.summary.includes(keyword) ||
        e.type.includes(keyword) ||
        e.tags.some((t) => t.includes(keyword))
    );
  }
}
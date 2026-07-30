export interface Relation {
  id: string;
  sourceId: string;
  targetId: string;
  relationType: string;
  docId: string;
  weight: number;
  createdAt: number;
  updatedAt: number;
}

export class RelationModel {
  private relations: Map<string, Relation> = new Map();

  create(data: Partial<Relation> & { sourceId: string; targetId: string }): Relation {
    if (!data.sourceId || !data.targetId) {
      throw new Error('缺少必需字段');
    }

    const now = Date.now();
    const relation: Relation = {
      id: data.id || crypto.randomUUID(),
      sourceId: data.sourceId,
      targetId: data.targetId,
      relationType: data.relationType || '',
      docId: data.docId || '',
      weight: data.weight ?? 1.0,
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now,
    };

    this.relations.set(relation.id, relation);
    return relation;
  }

  getById(id: string): Relation | null {
    return this.relations.get(id) || null;
  }

  getAll(): Relation[] {
    return Array.from(this.relations.values());
  }

  update(id: string, data: Partial<Relation>): Relation | null {
    const existing = this.relations.get(id);
    if (!existing) {
      return null;
    }

    const now = Date.now();
    const updated: Relation = {
      ...existing,
      ...data,
      id: existing.id,
      updatedAt: Math.max(now, existing.updatedAt + 1),
    };

    this.relations.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.relations.delete(id);
  }

  getByEntityId(entityId: string): Relation[] {
    return this.getAll().filter((r) => r.sourceId === entityId || r.targetId === entityId);
  }

  getByDocId(docId: string): Relation[] {
    return this.getAll().filter((r) => r.docId === docId);
  }

  getByRelationType(relationType: string): Relation[] {
    return this.getAll().filter((r) => r.relationType === relationType);
  }

  getByWeight(minWeight: number): Relation[] {
    return this.getAll().filter((r) => r.weight >= minWeight);
  }

  getConnections(entityId: string): Array<{ sourceId: string; targetId: string; relation: Relation }> {
    return this.getByEntityId(entityId).map((r) => ({
      sourceId: r.sourceId,
      targetId: r.targetId,
      relation: r,
    }));
  }
}
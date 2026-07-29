export interface Document {
  id: string;
  docId: string;
  filePath: string; // 生成的分析结果文件路径
  sourceFilePath?: string; // 原始文档路径（如果是从历史文档分析而来）
  fileName: string;
  title: string;
  summary: string;
  tags: string[];
  category: string; // 文档分类：arts, social, natural, applied, history, general
  categories: Record<string, number>; // 分类分数：{arts: 80, social: 60, ...}
  timestamp: number;
  entityCount: number;
  relationCount: number;
  viewCount: number; // 文档被打开查看的次数
  lastViewedAt: number | null; // 最后一次查看时间
  createdAt: number;
  updatedAt: number;
}

export class DocumentModel {
  private documents: Map<string, Document> = new Map();
  private docIdIndex: Map<string, string> = new Map();
  private filePathIndex: Map<string, string> = new Map();

  create(data: Partial<Document> & { docId: string }): Document {
    if (!data.docId) {
      throw new Error('缺少必需字段');
    }

    const now = Date.now();
    const document: Document = {
      id: data.id || crypto.randomUUID(),
      docId: data.docId,
      filePath: data.filePath || '',
      fileName: data.fileName || '',
      title: data.title || '',
      summary: data.summary || '',
      tags: data.tags || [],
      category: data.category || 'general', // 默认分类
      categories: data.categories || { arts: 0, social: 0, natural: 0, applied: 0, history: 0, general: 100 },
      timestamp: data.timestamp || now,
      entityCount: data.entityCount ?? 0,
      relationCount: data.relationCount ?? 0,
      viewCount: data.viewCount ?? 0,
      lastViewedAt: data.lastViewedAt || null,
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now,
    };

    this.documents.set(document.id, document);
    this.docIdIndex.set(document.docId, document.id);
    if (document.filePath) {
      this.filePathIndex.set(document.filePath, document.id);
    }
    return document;
  }

  getById(id: string): Document | null {
    return this.documents.get(id) || null;
  }

  getAll(): Document[] {
    return Array.from(this.documents.values());
  }

  update(id: string, data: Partial<Document>): Document | null {
    const existing = this.documents.get(id);
    if (!existing) {
      return null;
    }

    const now = Date.now();
    const updated: Document = {
      ...existing,
      ...data,
      id: existing.id,
      docId: data.docId || existing.docId,
      updatedAt: Math.max(now, existing.updatedAt + 1),
    };

    this.documents.set(id, updated);
    this.docIdIndex.set(updated.docId, updated.id);

    if (updated.filePath !== existing.filePath) {
      if (existing.filePath) {
        this.filePathIndex.delete(existing.filePath);
      }
      if (updated.filePath) {
        this.filePathIndex.set(updated.filePath, updated.id);
      }
    }

    return updated;
  }

  delete(id: string): boolean {
    const existing = this.documents.get(id);
    if (!existing) {
      return false;
    }

    this.docIdIndex.delete(existing.docId);
    if (existing.filePath) {
      this.filePathIndex.delete(existing.filePath);
    }
    return this.documents.delete(id);
  }

  getByDocId(docId: string): Document | null {
    const id = this.docIdIndex.get(docId);
    return id ? this.documents.get(id) || null : null;
  }

  getByFilePath(filePath: string): Document | null {
    const id = this.filePathIndex.get(filePath);
    return id ? this.documents.get(id) || null : null;
  }

  getByTag(tag: string): Document[] {
    return this.getAll().filter((d) => d.tags.includes(tag));
  }

  search(keyword: string): Document[] {
    return this.getAll().filter(
      (d) =>
        d.title.includes(keyword) ||
        d.summary.includes(keyword) ||
        d.fileName.includes(keyword) ||
        d.tags.some((t) => t.includes(keyword))
    );
  }

  getRecentDocuments(limit: number = 10): Document[] {
    return this.getAll()
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }
}
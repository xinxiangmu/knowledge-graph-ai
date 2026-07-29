import { Entity } from '../models/entity.js';
import { Relation } from '../models/relation.js';
import { Document } from '../models/document.js';
import { AIModelParser, ParseInput, ParseResult } from './ai-parser.service.js';
import { GraphStorageService } from './graph-storage.service.js';
import { fuzzyMatchEntityName } from '../utils/string-similarity.js';

export interface ProcessingResult {
  processedCount: number;
  failedCount: number;
  totalEntities: number;
  totalRelations: number;
  errors: string[];
}

export interface HistoryProcessorService {
  createTempDirectory(): Promise<string>;
  cleanupTempDirectory(): Promise<void>;
  processHistoricalDocuments(
    onProgress: (current: number, total: number, filename: string) => void
  ): Promise<ProcessingResult>;
  getProcessedFiles(): Set<string>;
  isFileProcessed(filePath: string): boolean;
  clearProcessedFiles(): void;
}

interface ProcessedFileRecord {
  filePath: string;
  docId: string;
  processedAt: number;
}

const BATCH_SIZE = 10;
const TEMP_DIR_PREFIX = '.kg-history-';

export class HistoryProcessorServiceImpl implements HistoryProcessorService {
  private vaultPath: string;
  private aiParser: AIModelParser;
  private graphStorage: GraphStorageService;
  private tempDir: string | null = null;
  private processedFiles: Map<string, ProcessedFileRecord> = new Map();
  private processedFilesPath: string | null = null;

  constructor(vaultPath: string, aiParser: AIModelParser, graphStorage: GraphStorageService) {
    this.vaultPath = vaultPath;
    this.aiParser = aiParser;
    this.graphStorage = graphStorage;
  }

  async createTempDirectory(): Promise<string> {
    if (this.tempDir) {
      return this.tempDir;
    }

    const fs = await import('fs/promises');
    const path = await import('path');

    const tempBase = this.vaultPath;
    const timestamp = Date.now();
    this.tempDir = path.join(tempBase, `${TEMP_DIR_PREFIX}${timestamp}`);

    await fs.mkdir(this.tempDir, { recursive: true });

    this.processedFilesPath = path.join(this.tempDir, 'processed-files.json');
    try {
      const data = await fs.readFile(this.processedFilesPath, 'utf-8');
      const records: ProcessedFileRecord[] = JSON.parse(data);
      for (const record of records) {
        this.processedFiles.set(record.filePath, record);
      }
    } catch {
      this.processedFiles.clear();
    }

    return this.tempDir;
  }

  async cleanupTempDirectory(): Promise<void> {
    if (!this.tempDir) {
      return;
    }

    const fs = await import('fs/promises');
    const path = await import('path');

    try {
      const entries = await fs.readdir(this.tempDir);
      for (const entry of entries) {
        if (entry !== 'processed-files.json') {
          const entryPath = path.join(this.tempDir, entry);
          const stat = await fs.stat(entryPath);
          if (stat.isDirectory()) {
            await fs.rm(entryPath, { recursive: true });
          } else {
            await fs.unlink(entryPath);
          }
        }
      }
    } catch {
    }

    this.tempDir = null;
  }

  async processHistoricalDocuments(
    onProgress: (current: number, total: number, filename: string) => void
  ): Promise<ProcessingResult> {
    await this.createTempDirectory();

    const mdFiles = await this.findAllMdFiles();

    const unprocessedFiles = mdFiles.filter(file => !this.processedFiles.has(file));

    const result: ProcessingResult = {
      processedCount: 0,
      failedCount: 0,
      totalEntities: 0,
      totalRelations: 0,
      errors: [],
    };

    const total = unprocessedFiles.length;

    for (let i = 0; i < unprocessedFiles.length; i += BATCH_SIZE) {
      const batch = unprocessedFiles.slice(i, i + BATCH_SIZE);

      for (const filePath of batch) {
        try {
          onProgress(i + result.processedCount + 1, total, filePath);

          const parseResult = await this.processFile(filePath);

          await this.insertIntoGraph(filePath, parseResult);

          this.markFileAsProcessed(filePath, parseResult);

          result.processedCount++;
          result.totalEntities += parseResult.entities.length;
          result.totalRelations += parseResult.relations.length;
        } catch (error) {
          result.failedCount++;
          const errorMsg = error instanceof Error ? error.message : String(error);
          result.errors.push(`处理文件 ${filePath} 失败: ${errorMsg}`);
        }
      }
    }

    await this.saveProcessedFilesRecord();

    return result;
  }

  private async findAllMdFiles(): Promise<string[]> {
    const fs = await import('fs/promises');
    const path = await import('path');

    const mdFiles: string[] = [];

    const scanDirectory = async (dirPath: string): Promise<void> => {
      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);

          if (entry.isDirectory()) {
            if (entry.name.startsWith('.') || entry.name === 'node_modules') {
              continue;
            }
            await scanDirectory(fullPath);
          } else if (entry.isFile() && entry.name.endsWith('.md')) {
            mdFiles.push(fullPath);
          }
        }
      } catch {
      }
    };

    await scanDirectory(this.vaultPath);

    return mdFiles;
  }

  private async processFile(filePath: string): Promise<ParseResult> {
    const fs = await import('fs/promises');

    const content = await fs.readFile(filePath, 'utf-8');

    const { frontmatter, body } = this.parseFrontmatter(content);

    const frontmatterTags = this.extractFrontmatterTags(frontmatter);

    const bodyContent = body.trim();

    if (!bodyContent) {
      return {
        summary: String(frontmatter.title) || '无内容',
        timestamp: frontmatter.timestamp as number || Date.now(),
        tags: frontmatterTags,
        entities: [],
        relations: [],
      };
    }

    const parseInput: ParseInput = {
      text: bodyContent,
      format: 'auto',
    };

    const aiResult = await this.aiParser.parse(parseInput);

    const mergedTags = this.mergeTags(frontmatterTags, aiResult.tags);

    return {
      ...aiResult,
      tags: mergedTags,
      timestamp: (frontmatter.timestamp as number) || aiResult.timestamp,
    };
  }

  private parseFrontmatter(content: string): { frontmatter: Record<string, unknown>; body: string } {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    if (!match) {
      return { frontmatter: {}, body: content };
    }

    const frontmatterStr = match[1];
    const body = match[2];

    const frontmatter: Record<string, unknown> = {};

    const lines = frontmatterStr.split('\n');
    let currentKey: string | null = null;
    let currentValue: unknown = null;

    for (const line of lines) {
      const keyValueMatch = line.match(/^(\w+):\s*(.*)$/);

      if (keyValueMatch) {
        if (currentKey !== null) {
          frontmatter[currentKey] = currentValue;
        }

        currentKey = keyValueMatch[1];
        const value = keyValueMatch[2].trim();

        if (value.startsWith('[') && value.endsWith(']')) {
          currentValue = value
            .slice(1, -1)
            .split(',')
            .map(item => item.trim().replace(/^["']|["']$/g, ''))
            .filter(Boolean);
        } else {
          currentValue = value.replace(/^["']|["']$/g, '');
        }
      } else if (line.match(/^\s+-\s+/)) {
        const itemValue = line.replace(/^\s+-\s+/, '').trim().replace(/^["']|["']$/g, '');
        if (Array.isArray(currentValue)) {
          currentValue.push(itemValue);
        }
      }
    }

    if (currentKey !== null) {
      frontmatter[currentKey] = currentValue;
    }

    return { frontmatter, body };
  }

  private extractFrontmatterTags(frontmatter: Record<string, unknown>): string[] {
    const tags = frontmatter.tags;

    if (Array.isArray(tags)) {
      return tags.filter(tag => typeof tag === 'string') as string[];
    }

    if (typeof tags === 'string') {
      return tags.split(',').map(t => t.trim()).filter(Boolean);
    }

    return [];
  }

  private mergeTags(frontmatterTags: string[], aiTags: string[]): string[] {
    const merged = new Set<string>();

    for (const tag of frontmatterTags) {
      merged.add(tag);
    }

    for (const tag of aiTags) {
      if (tag !== '未分类') {
        merged.add(tag);
      }
    }

    return Array.from(merged);
  }

  private async insertIntoGraph(filePath: string, parseResult: ParseResult): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');

    const fileName = path.basename(filePath);
    const docId = crypto.randomUUID();


    const document: Document = {
      id: docId,
      docId,
      filePath,
      sourceFilePath: undefined,
      fileName,
      title: parseResult.summary.substring(0, 100),
      summary: parseResult.summary,
      tags: parseResult.tags,
      category: 'general',
      categories: { arts: 0, social: 0, natural: 0, applied: 0, history: 0, general: 100 },
      timestamp: parseResult.timestamp,
      entityCount: parseResult.entities.length,
      relationCount: parseResult.relations.length,
      viewCount: 0,
      lastViewedAt: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    try {
      await this.graphStorage.createDocument(document);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[History Processor] 创建文档失败: ${filePath}, 错误: ${errorMsg}`);
      throw error;
    }

    const entityIdMap = new Map<string, string>();
    const entityNames: string[] = [];

    for (let i = 0; i < parseResult.entities.length; i++) {
      const parsedEntity = parseResult.entities[i];
      const entity: Entity = {
        id: crypto.randomUUID(),
        docId,
        name: parsedEntity.name,
        type: parsedEntity.type,
        tags: parseResult.tags,
        summary: parsedEntity.summary,
        timestamp: parseResult.timestamp,
        filePath,
        isMainEntity: i === 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      try {
        await this.graphStorage.createEntity(entity);
        entityIdMap.set(parsedEntity.name, entity.id);
        entityNames.push(parsedEntity.name);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[History Processor] 创建实体失败: ${parsedEntity.name}, 错误: ${errorMsg}`);
      }
    }


    // 使用模糊匹配创建关系
    let successRelationCount = 0;
    let failedRelationCount = 0;

    for (const relation of parseResult.relations) {
      // 先尝试精确匹配
      let sourceId = entityIdMap.get(relation.sourceName);
      let targetId = entityIdMap.get(relation.targetName);

      // 如果精确匹配失败，使用模糊匹配
      if (!sourceId) {
        const sourceMatch = fuzzyMatchEntityName(relation.sourceName, entityNames, 0.8);
        if (sourceMatch.matched && sourceMatch.bestMatch) {
          sourceId = entityIdMap.get(sourceMatch.bestMatch);
        }
      }

      if (!targetId) {
        const targetMatch = fuzzyMatchEntityName(relation.targetName, entityNames, 0.8);
        if (targetMatch.matched && targetMatch.bestMatch) {
          targetId = entityIdMap.get(targetMatch.bestMatch);
        }
      }

      if (sourceId && targetId) {
        const newRelation: Relation = {
          id: crypto.randomUUID(),
          sourceId,
          targetId,
          relationType: relation.relationType,
          docId,
          weight: 1.0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        try {
          await this.graphStorage.createRelation(newRelation);
          successRelationCount++;
        } catch (error) {
          failedRelationCount++;
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error(`[History Processor] 创建关系失败:`);
          console.error(`[History Processor]   - 关系类型: ${relation.relationType}`);
          console.error(`[History Processor]   - 源实体: ${relation.sourceName} (${sourceId})`);
          console.error(`[History Processor]   - 目标实体: ${relation.targetName} (${targetId})`);
          console.error(`[History Processor]   - 文档: ${filePath}`);
          console.error(`[History Processor]   - 错误: ${errorMsg}`);
        }
      } else {
        failedRelationCount++;
        console.warn(`[History Processor] 无法匹配关系实体:`);
        console.warn(`[History Processor]   - 关系类型: ${relation.relationType}`);
        console.warn(`[History Processor]   - 源实体: ${relation.sourceName} ${sourceId ? '(已匹配)' : '(未匹配)'}`);
        console.warn(`[History Processor]   - 目标实体: ${relation.targetName} ${targetId ? '(已匹配)' : '(未匹配)'}`);
        console.warn(`[History Processor]   - 可用实体: ${entityNames.join(', ')}`);
      }
    }

    console.debug(`[History Processor] Relations: ${successRelationCount} succeeded, ${failedRelationCount} failed for ${filePath}`);
  }

  private markFileAsProcessed(filePath: string, parseResult: ParseResult): void {
    const docId = parseResult.entities[0]?.name || crypto.randomUUID();

    this.processedFiles.set(filePath, {
      filePath,
      docId,
      processedAt: Date.now(),
    });
  }

  private async saveProcessedFilesRecord(): Promise<void> {
    if (!this.processedFilesPath) {
      return;
    }

    const fs = await import('fs/promises');

    const records = Array.from(this.processedFiles.values());

    await fs.writeFile(this.processedFilesPath, JSON.stringify(records, null, 2), 'utf-8');
  }

  getProcessedFiles(): Set<string> {
    return new Set(this.processedFiles.keys());
  }

  isFileProcessed(filePath: string): boolean {
    return this.processedFiles.has(filePath);
  }

  clearProcessedFiles(): void {
    this.processedFiles.clear();
    this.processedFilesPath = null;
  }
}

let globalHistoryProcessor: HistoryProcessorService | null = null;

export async function createHistoryProcessorService(
  vaultPath: string,
  aiParser: AIModelParser,
  graphStorage: GraphStorageService
): Promise<HistoryProcessorService> {
  const processor = new HistoryProcessorServiceImpl(vaultPath, aiParser, graphStorage);
  await processor.createTempDirectory();
  globalHistoryProcessor = processor;
  return processor;
}

export function getHistoryProcessorService(): HistoryProcessorService | null {
  return globalHistoryProcessor;
}

export async function closeHistoryProcessorService(): Promise<void> {
  if (globalHistoryProcessor) {
    await globalHistoryProcessor.cleanupTempDirectory();
    globalHistoryProcessor = null;
  }
}

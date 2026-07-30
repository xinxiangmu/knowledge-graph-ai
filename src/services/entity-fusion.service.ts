import { Entity } from '../models/entity.js';
import { Relation } from '../models/relation.js';
import { GraphStorageService } from './graph-storage.service.js';
import { isSameEntity } from '../utils/string-similarity.js';

export interface EntityFusionInput {
  entities: Entity[];
  mainEntityNames: string[];
}

export interface EntityFusionResult {
  mergedEntities: Entity[];
  updatedRelations: Relation[];
  fusionCount: number;
}

export interface FusionProgress {
  current: number;
  total: number;
  percentage: number;
  currentEntityName: string;
  message: string;
}

export interface FusionPreview {
  mainEntity: Entity;
  toBeMergedEntities: Entity[];
  affectedRelations: Relation[];
  willUpdateDocuments: string[];
}

export interface EntityFusionService {
  fuse(input: EntityFusionInput, onProgress?: (progress: FusionProgress) => void): Promise<EntityFusionResult>;
  setMainEntity(entityId: string, isMain: boolean): Promise<void>;
  getFusionCandidates(): Promise<Entity[][]>;
  parseMainEntityMarking(text: string): string[];
  generateFusionPreview(input: EntityFusionInput): Promise<FusionPreview | null>;
  cancelFusion(): void;
}

interface DuplicateGroup {
  mainEntity: Entity;
  duplicates: Entity[];
}

export class EntityFusionServiceImpl implements EntityFusionService {
  private storage: GraphStorageService;
  private cancelled: boolean = false;

  constructor(storage: GraphStorageService) {
    this.storage = storage;
  }

  parseMainEntityMarking(text: string): string[] {
    if (!text || !text.includes('*')) {
      return [];
    }
    
    const mainEntities: string[] = [];
    const parts = text.split('*');

    // Skip the first part as it's before the first *
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      if (!part.trim()) {
        continue;
      }
      
      // Split by |, then take entities until whitespace
      const rawEntities = part.split('|').map((e) => e.trim());
      
      for (const rawEntity of rawEntities) {
        // Take only up to first whitespace
        const entity = rawEntity.split(/\s/)[0].trim();
        if (entity.length > 0) {
          mainEntities.push(entity);
        }
      }
    }

    return mainEntities;
  }

  async fuse(input: EntityFusionInput, onProgress?: (progress: FusionProgress) => void): Promise<EntityFusionResult> {
    this.cancelled = false;

    const duplicateGroups = await this.findDuplicateGroups(input.entities, input.mainEntityNames);

    if (duplicateGroups.length === 0) {
      return {
        mergedEntities: [],
        updatedRelations: [],
        fusionCount: 0,
      };
    }

    const mergedEntities: Entity[] = [];
    const updatedRelations: Relation[] = [];
    let fusionCount = 0;
    const total = duplicateGroups.length;

    for (let i = 0; i < duplicateGroups.length; i++) {
      if (this.cancelled) {
        throw new Error('融合已取消');
      }

      const group = duplicateGroups[i];
      const currentEntityName = group.mainEntity.name;

      if (onProgress) {
        onProgress({
          current: i + 1,
          total,
          percentage: Math.round(((i + 1) / total) * 100),
          currentEntityName,
          message: `Fusing entity (${i + 1}/${total})...`,
        });
      }

      const merged = await this.mergeEntityGroup(group);
      mergedEntities.push(merged.mainEntity);

      for (const relation of merged.updatedRelations) {
        updatedRelations.push(relation);
      }

      fusionCount++;
    }

    return {
      mergedEntities,
      updatedRelations,
      fusionCount,
    };
  }

  cancelFusion(): void {
    this.cancelled = true;
  }

  async setMainEntity(entityId: string, isMain: boolean): Promise<void> {
    const entity = await this.storage.getEntity(entityId);
    if (!entity) {
      throw new Error(`实体 ${entityId} 不存在`);
    }

    await this.storage.updateEntity(entityId, { isMainEntity: isMain });

    if (isMain) {
      await this.relinkRelationsToMainEntity(entity);
    }
  }

  async getFusionCandidates(): Promise<Entity[][]> {
    const allEntities = await this.getAllEntities();
    const groups: Map<string, Entity[]> = new Map();

    for (const entity of allEntities) {
      const key = this.getEntityGroupKey(entity);
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(entity);
    }

    const candidates: Entity[][] = [];
    for (const [, entities] of groups) {
      if (entities.length > 1) {
        candidates.push(entities);
      }
    }

    return candidates;
  }

  async generateFusionPreview(input: EntityFusionInput): Promise<FusionPreview | null> {
    const duplicateGroups = await this.findDuplicateGroups(input.entities, input.mainEntityNames);

    if (duplicateGroups.length === 0) {
      return null;
    }

    const group = duplicateGroups[0];
    const affectedRelations = await this.findAffectedRelations(group.mainEntity, group.duplicates);
    const documentsToUpdate = [...new Set([
      group.mainEntity.docId,
      ...group.duplicates.map((e) => e.docId),
      ...affectedRelations.map((r) => r.docId),
    ])];

    return {
      mainEntity: group.mainEntity,
      toBeMergedEntities: group.duplicates,
      affectedRelations,
      willUpdateDocuments: documentsToUpdate,
    };
  }

  private async findDuplicateGroups(entities: Entity[], mainEntityNames: string[]): Promise<DuplicateGroup[]> {
    const groups: Map<string, Entity[]> = new Map();

    // 按标准化名称分组
    for (const entity of entities) {
      const key = this.getEntityGroupKey(entity);
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(entity);
    }

    const duplicateGroups: DuplicateGroup[] = [];

    for (const [, groupEntities] of groups) {
      if (groupEntities.length <= 1) {
        continue;
      }

      let mainEntity = groupEntities.find((e) =>
        mainEntityNames.some((name) => this.normalizeEntityName(name) === this.normalizeEntityName(e.name))
      );

      if (!mainEntity) {
        mainEntity = groupEntities.reduce((latest, e) =>
          e.timestamp > latest.timestamp ? e : latest
        );
      }

      const duplicates = groupEntities.filter((e) => e.id !== mainEntity!.id);

      duplicateGroups.push({
        mainEntity,
        duplicates,
      });
    }

    // 跨文档实体识别：使用模糊匹配找出可能重复的实体
    const crossDocGroups = await this.findCrossDocumentDuplicates(entities, duplicateGroups);
    duplicateGroups.push(...crossDocGroups);

    return duplicateGroups;
  }

  /**
   * 跨文档实体识别：使用模糊匹配找出可能重复的实体
   */
  private async findCrossDocumentDuplicates(entities: Entity[], existingGroups: DuplicateGroup[]): Promise<DuplicateGroup[]> {
    const crossDocGroups: DuplicateGroup[] = [];
    const processedIds = new Set<string>();

    // 收集已处理的实体ID
    for (const group of existingGroups) {
      processedIds.add(group.mainEntity.id);
      for (const dup of group.duplicates) {
        processedIds.add(dup.id);
      }
    }

    // 按文档分组
    const byDocId = new Map<string, Entity[]>();
    for (const entity of entities) {
      if (processedIds.has(entity.id)) continue;
      if (!byDocId.has(entity.docId)) {
        byDocId.set(entity.docId, []);
      }
      byDocId.get(entity.docId)!.push(entity);
    }

    // 跨文档比较
    const docIds = Array.from(byDocId.keys());
    for (let i = 0; i < docIds.length; i++) {
      for (let j = i + 1; j < docIds.length; j++) {
        const entities1 = byDocId.get(docIds[i]) || [];
        const entities2 = byDocId.get(docIds[j]) || [];

        for (const e1 of entities1) {
          if (processedIds.has(e1.id)) continue;

          const duplicates: Entity[] = [];
          for (const e2 of entities2) {
            if (processedIds.has(e2.id)) continue;

            // 使用模糊匹配判断是否为同一实体
            if (isSameEntity(e1.name, e2.name, e1.type, e2.type, 0.85)) {
              duplicates.push(e2);
              processedIds.add(e2.id);
            }
          }

          if (duplicates.length > 0) {
            processedIds.add(e1.id);
            crossDocGroups.push({
              mainEntity: e1,
              duplicates,
            });
          }
        }
      }
    }

    if (crossDocGroups.length > 0) {
      for (const group of crossDocGroups) {
        for (const dup of group.duplicates) {
          console.debug(`[Knowledge Graph] Cross-doc duplicate: ${group.mainEntity.name} <-> ${dup.name}`);
        }
      }
    }

    return crossDocGroups;
  }

  private getEntityGroupKey(entity: Entity): string {
    return `${this.normalizeEntityName(entity.name)}|${entity.type}`.toLowerCase();
  }

  private normalizeEntityName(name: string): string {
    return name.replace(/\s+/g, '').toLowerCase();
  }

  private async mergeEntityGroup(group: DuplicateGroup): Promise<{
    mainEntity: Entity;
    updatedRelations: Relation[];
  }> {
    const { mainEntity, duplicates } = group;


    const mergedTags = this.mergeTags(mainEntity, duplicates);
    const mergedSummary = this.getNewestSummary(mainEntity, duplicates);

    let updatedMainEntity: Entity;
    try {
      updatedMainEntity = await this.storage.updateEntity(mainEntity.id, {
        tags: mergedTags,
        summary: mergedSummary,
        isMainEntity: true,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[Entity Fusion] 更新主实体失败: ${mainEntity.id}, 错误: ${errorMsg}`);
      throw new Error(`融合失败: 更新主实体 ${mainEntity.id} 时出错 - ${errorMsg}`);
    }

    const updatedRelations: Relation[] = [];

    for (const duplicate of duplicates) {

      let relations: Relation[] = [];
      try {
        relations = await this.storage.queryRelationsByEntity(duplicate.id);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[Entity Fusion] 查询实体关系失败: ${duplicate.id}, 错误: ${errorMsg}`);
        // 继续处理其他实体，不中断整个融合过程
        continue;
      }

      for (const relation of relations) {
        const needsSourceUpdate = relation.sourceId === duplicate.id;
        const needsTargetUpdate = relation.targetId === duplicate.id;

        if (needsSourceUpdate || needsTargetUpdate) {
          try {
            const updatedRelation = await this.storage.updateRelation(relation.id, {
              sourceId: needsSourceUpdate ? mainEntity.id : relation.sourceId,
              targetId: needsTargetUpdate ? mainEntity.id : relation.targetId,
            });
            updatedRelations.push(updatedRelation);
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.error(`[Entity Fusion] 更新关系失败: ${relation.id}, 错误: ${errorMsg}`);
            // 记录失败但继续处理
          }
        }
      }

      try {
        await this.updateDocumentsForFusion(duplicate, mainEntity);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[Entity Fusion] 更新文档引用失败: ${duplicate.id}, 错误: ${errorMsg}`);
      }

      try {
        await this.storage.deleteEntity(duplicate.id);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[Entity Fusion] 删除重复实体失败: ${duplicate.id}, 错误: ${errorMsg}`);
        // 不抛出异常，继续处理其他实体
      }
    }


    return {
      mainEntity: updatedMainEntity,
      updatedRelations,
    };
  }

  private mergeTags(mainEntity: Entity, duplicates: Entity[]): string[] {
    const tagSet = new Set<string>(mainEntity.tags);

    for (const duplicate of duplicates) {
      for (const tag of duplicate.tags) {
        tagSet.add(tag);
      }
    }

    return Array.from(tagSet);
  }

  private getNewestSummary(mainEntity: Entity, duplicates: Entity[]): string {
    const allEntities = [mainEntity, ...duplicates];
    allEntities.sort((a, b) => b.timestamp - a.timestamp);
    return allEntities[0].summary;
  }

  private async findAffectedRelations(mainEntity: Entity, duplicates: Entity[]): Promise<Relation[]> {
    const affectedRelations: Relation[] = [];
    const allEntities = [mainEntity, ...duplicates];

    for (const entity of allEntities) {
      const relations = await this.storage.queryRelationsByEntity(entity.id);
      affectedRelations.push(...relations);
    }

    return this.deduplicateRelations(affectedRelations);
  }

  private deduplicateRelations(relations: Relation[]): Relation[] {
    const seen = new Set<string>();
    return relations.filter((r) => {
      const key = r.id;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private async updateDocumentsForFusion(duplicate: Entity, mainEntity: Entity): Promise<void> {
    // This would integrate with the document service to update references
    // For now, the relation updates handle the primary concern
  }

  private async relinkRelationsToMainEntity(entity: Entity): Promise<void> {
    const relations = await this.storage.queryRelationsByEntity(entity.id);

    for (const relation of relations) {
      await this.storage.updateRelation(relation.id, {
        sourceId: relation.sourceId,
        targetId: relation.targetId,
      });
    }
  }

  private async getAllEntities(): Promise<Entity[]> {
    // This is a workaround - in a real implementation you would have a getAllEntities method
    // on the storage service. For now we'll query by docId with a special marker.
    const allEntities: Entity[] = [];
    // In the actual implementation, this would call storage.getAllEntities()
    // For now we rely on the input entities being passed in
    return allEntities;
  }
}

let globalService: EntityFusionService | null = null;

export function createEntityFusionService(storage: GraphStorageService): EntityFusionService {
  if (globalService) {
    return globalService;
  }
  globalService = new EntityFusionServiceImpl(storage);
  return globalService;
}

export function getEntityFusionService(): EntityFusionService | null {
  return globalService;
}

export function resetEntityFusionService(): void {
  globalService = null;
}
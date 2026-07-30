import { Entity } from '../models/entity.js';
import { Relation } from '../models/relation.js';
import { LanguageCode, LANGUAGE_LABELS } from '../i18n/language-config.js';

export interface MDDocumentInput {
  summary: string;
  timestamp: number;
  tags: string[];
  entities: Entity[];
  relations: Relation[];
  docId: string;
  language?: LanguageCode;
}

export interface MDDocumentService {
  generate(input: MDDocumentInput): string;
  save(filePath: string, content: string): Promise<void>;
  updateDocId(filePath: string, docId: string): Promise<void>;
  getFileName(summary: string, timestamp: number): string;
}

export class MDDocumentServiceImpl implements MDDocumentService {
  generate(input: MDDocumentInput): string {
    const language = input.language || 'zh-CN';
    const labels = LANGUAGE_LABELS[language];
    
    const entityMap = new Map<string, Entity>();
    input.entities.forEach((e) => entityMap.set(e.id, e));

    let entitiesSection = '';
    for (const entity of input.entities) {
      entitiesSection += `- **${entity.name}** (${entity.type}): ${entity.summary}\n`;
    }

    let relationsSection = '';
    for (const relation of input.relations) {
      const sourceName = entityMap.get(relation.sourceId)?.name || relation.sourceId;
      const targetName = entityMap.get(relation.targetId)?.name || relation.targetId;
      relationsSection += `- ${sourceName} --${relation.relationType}--> ${targetName}\n`;
    }

    const date = new Date(input.timestamp);
    const formattedTimestamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;

    const createdAt = new Date().toISOString();

    const template = `---
docId: {{docId}}
title: {{summary}}
timestamp: {{timestamp}}
tags: [{{tags}}]
entityCount: {{entityCount}}
relationCount: {{relationCount}}
createdAt: {{createdAt}}
---

# ${labels.analysisResult}

## ${labels.summary[0]}
{{summary}}

## ${labels.time}
{{formattedTimestamp}}

## ${labels.tags[0]}
{{tags}}

## ${labels.entities[0]}
${entitiesSection}

## ${labels.relations[0]}
${relationsSection}

## ${labels.docId}
{{docId}}
`;

    let result = template;
    result = result.replace(/{{docId}}/g, input.docId);
    result = result.replace(/{{summary}}/g, input.summary);
    result = result.replace(/{{timestamp}}/g, String(input.timestamp));
    result = result.replace(/{{tags}}/g, input.tags.join(', '));
    result = result.replace(/{{entityCount}}/g, String(input.entities.length));
    result = result.replace(/{{relationCount}}/g, String(input.relations.length));
    result = result.replace(/{{createdAt}}/g, createdAt);
    result = result.replace(/{{formattedTimestamp}}/g, formattedTimestamp);

    return result;
  }

  async save(filePath: string, content: string): Promise<void> {
    const fs = await import('fs/promises');
    await fs.writeFile(filePath, content, 'utf-8');
  }

  async updateDocId(filePath: string, docId: string): Promise<void> {
    const fs = await import('fs/promises');
    const content = await fs.readFile(filePath, 'utf-8');
    const updatedContent = content.replace(/^docId: .+$/m, `docId: ${docId}`);
    await fs.writeFile(filePath, updatedContent, 'utf-8');
  }

  getFileName(summary: string, timestamp: number): string {
    const sanitizedSummary = this.sanitizeFileName(summary);
    const date = new Date(timestamp);
    const formattedTimestamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}${String(date.getSeconds()).padStart(2, '0')}`;
    return `${sanitizedSummary}_${formattedTimestamp}.md`;
  }

  private sanitizeFileName(name: string): string {
    const invalidChars = /[\/:*?"<>"|\\!@#$%^&()_+\-=[\]{};]/g;
    const sanitized = name.replace(invalidChars, '').trim();
    return sanitized || '_';
  }
}

export const mdDocumentService: MDDocumentService = new MDDocumentServiceImpl();
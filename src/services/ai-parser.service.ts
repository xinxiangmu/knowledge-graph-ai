import { LanguageCode, LANGUAGE_LABELS, getCurrentLanguage } from '../i18n/language-config';

export interface ParseInput {
  text: string;
  format?: 'markdown' | 'json' | 'auto' | 'plain';
  language?: LanguageCode;
}

export interface ParseResult {
  summary: string;
  timestamp: number;
  tags: string[];
  entities: Array<{
    name: string;
    type: string;
    summary: string;
    relatedEntities?: string[];
  }>;
  relations: Array<{
    sourceName: string;
    targetName: string;
    relationType: string;
  }>;
}

interface AIEntity {
  id: string;
  name: string;
  type: string;
  summary: string;
}

interface AIRelation {
  sourceName: string;
  targetName: string;
  relationType: string;
}

interface AIResponse {
  summary: string;
  timestamp: number;
  tags: string[];
  entities: AIEntity[];
  relations: AIRelation[];
}

type FormatType = 'markdown' | 'json' | 'auto' | 'plain';

export class AIModelParser {
  private modelName: string;
  private apiEndpoint: string;
  private apiKey: string;
  private language: LanguageCode;

  constructor(modelName: string = 'llama3.2', apiEndpoint: string = 'http://localhost:11434', apiKey: string = '', language?: LanguageCode) {
    this.modelName = modelName;
    this.apiEndpoint = apiEndpoint;
    this.apiKey = apiKey;
    this.language = language || getCurrentLanguage();
  }

  setLanguage(lang: LanguageCode): void {
    this.language = lang;
  }

  /**
   * 配置完整的API URL
   */
  configureByUrl(url: string): void {
    this.apiEndpoint = url;
  }

  /**
   * 设置模型名称
   */
  setModel(model: string): void {
    this.modelName = model;
  }

  /**
   * 配置本地模型
   */
  configure(address: string, port: number, apiPath: string = ''): void {
    this.apiEndpoint = `http://${address}:${port}${apiPath}`;
  }

  async parse(input: ParseInput, onProgress?: (msg: string) => void): Promise<ParseResult> {
    const { text, format = 'auto', language } = input;

    const currentLang = language || this.language;
    const labels = LANGUAGE_LABELS[currentLang];

    if (!text || text.trim().length === 0) {
      throw new Error(labels.emptyInput);
    }

    onProgress?.(`${labels.parsingText} 30%`);

    const structuredData = this.extractFromStructuredMarkdown(text, currentLang);
    
    if (structuredData) {
      onProgress?.(`${labels.extractingEntities} 45%`);
      const entities = this.convertToEntities(structuredData, text);
      
      onProgress?.(`${labels.buildingGraph} 90%`);
      
      return {
        summary: structuredData.summary || this.generateDefaultSummary(text),
        timestamp: structuredData.timestamp || Date.now(),
        tags: structuredData.tags || this.extractTagsFromText(text),
        entities,
        relations: structuredData.relations || [],
      };
    }

    const fallbackData = this.fallbackExtraction(text);
    const entities = this.convertToEntities(fallbackData, text);
    
    return {
      summary: fallbackData.summary || this.generateDefaultSummary(text),
      timestamp: fallbackData.timestamp || Date.now(),
      tags: fallbackData.tags || this.extractTagsFromText(text),
      entities,
      relations: fallbackData.relations || [],
    };
  }

  private extractFromStructuredMarkdown(text: string, language: LanguageCode): AIResponse | null {
    const labels = LANGUAGE_LABELS[language];
    
    // 处理多行HTML注释块 - 将注释块内的内容提取出来作为普通文本处理
    // 匹配 <!-- ... --> 模式（支持跨行）
    const processedText = text.replace(/<!--([\s\S]*?)-->/g, (match, content) => {
      // 如果注释内容包含实体或关系相关的表格，保留为普通文本
      const hasEntityOrRelation = labels.entities.some(e => content.includes(e)) ||
                                  labels.relations.some(r => content.includes(r)) ||
                                  content.includes(labels.entityId) ||
                                  content.includes(labels.sourceEntity) ||
                                  content.includes('|');
      if (hasEntityOrRelation) {
        return content;
      }
      // 否则返回空字符串（移除不包含有效数据的注释）
      return '';
    });
    
    
    const lines = processedText.split('\n');
    lines.slice(0, 10).forEach((line, i) => {
      // Pre-process headings for analysis
    });
    
    let currentSection = '';
    const data: AIResponse = {
      summary: '',
      timestamp: Date.now(),
      tags: [],
      entities: [],
      relations: [],
    };
    
    // 用于存储实体ID到实体名称的映射（用于关系解析）
    const entityIdMap = new Map<string, string>();

    for (const line of lines) {
      // 跳过空行
      const trimmedLine = line.trim();
      if (!trimmedLine) {
        continue;
      }
      
      // 检测标题（支持 #、##、### 和中文序号格式：一、二、三、）
      const headingMatch = line.match(/^#{1,3}\s+(.+)/);
      const chineseHeadingMatch = line.match(/^([一二三四五六七八九十]+)、\s*(.+)/);
      if (headingMatch) {
        currentSection = headingMatch[1].trim();
        continue;
      } else if (chineseHeadingMatch) {
        currentSection = chineseHeadingMatch[2].trim();
        continue;
      }
      
      // 跳过单行注释和表格分隔线（但不跳过已提取内容中的行）
      // 注意：不要跳过包含 | 的表格行（如 "entity_001 | entity_002 | 父子关系"）
      if (trimmedLine.startsWith('//') || (trimmedLine.startsWith('---') && !trimmedLine.includes('|'))) {
        continue;
      }

      // 根据当前段落提取数据
      // 摘要部分
      if (labels.summary.some(s => currentSection.includes(s))) {
        data.summary = (data.summary + ' ' + trimmedLine).trim();
      }
      
      // 分类部分（跳过，已经在主流程中提取）
      else if (currentSection.includes(labels.category)) {
        // 跳过，分类信息已经在 saveParseResult 中提取
      }
      
      // 标签部分
      else if (labels.tags.some(t => currentSection.includes(t))) {
        // 支持列表格式：- 标签1
        if (trimmedLine.startsWith('- ')) {
          const tag = trimmedLine.substring(2).trim();
          if (tag && tag.length > 1) {
            data.tags.push(tag);
          }
        } else {
          // 支持其他格式的标签
          const tagMatches = trimmedLine.match(/[\u4e00-\u9fa5a-zA-Z0-9_]+/g);
          if (tagMatches) {
            data.tags.push(...tagMatches.filter(t => t.trim() && t.length > 1));
          }
        }
      }
      
      // 实体部分（支持表格格式）
      else if (labels.entities.some(e => currentSection.includes(e))) {
        // 检查是否是表格行（包含 | 分隔符）
        if (trimmedLine.includes('|')) {
          // 移除首尾的 |，然后分割
          const cleanLine = trimmedLine.replace(/^\|/, '').replace(/\|$/, '');
          const parts = cleanLine.split('|').map(p => p.trim());
          // 跳过表头和表格分隔线（全是连字符的行）
          const isSeparator = parts.every(p => /^-+$/.test(p) || p === '');
          const hasEntityHeader = labels.entities.some(e => trimmedLine.includes(e)) || 
                                  trimmedLine.includes(labels.entityId) || 
                                  trimmedLine.includes(labels.entityName);
          if (parts.length >= 4 && !hasEntityHeader && !isSeparator) {
            const entityId = parts[0];
            const entityName = parts[1];
            const entityType = parts[2];
            const entitySummary = parts.slice(3).join(' ');
            
            if (entityName && entityName !== '-') {
              data.entities.push({
                name: entityName,
                type: entityType || '概念',
                summary: entitySummary,
                id: entityId,
              });
              if (entityId) {
                entityIdMap.set(entityId, entityName);
              }
            }
          }
        } else {
          // 匹配格式1：**名称** (类型): 描述
          const entityMatch1 = line.match(/\*\*([^*]+)\*\*\s*\(([^)]+)\)\s*:\s*(.*)/);
          // 匹配格式2：名称 (类型) 描述
          const entityMatch2 = line.match(/([^\s（(]+)[（(]([^）)]+)[）)](.*)/);
          // 匹配格式3：- 名称：类型
          const entityMatch3 = line.match(/[-*]\s*([^\s:]+)\s*[:：]\s*([^\s]+)/);
          // 匹配格式4：数字。 **名称** (类型): 描述
          const entityMatch4 = line.match(/^\d+\.\s*\*\*([^*]+)\*\*\s*\(([^)]+)\)\s*:\s*(.*)/);
          
          if (entityMatch1) {
            data.entities.push({
              id: crypto.randomUUID(),
              name: entityMatch1[1].trim(),
              type: entityMatch1[2].trim(),
              summary: entityMatch1[3].trim(),
            });
          } else if (entityMatch4) {
            data.entities.push({
              id: crypto.randomUUID(),
              name: entityMatch4[1].trim(),
              type: entityMatch4[2].trim(),
              summary: entityMatch4[3].trim(),
            });
          } else if (entityMatch2) {
            data.entities.push({
              id: crypto.randomUUID(),
              name: entityMatch2[1].trim(),
              type: entityMatch2[2].trim(),
              summary: entityMatch2[3].trim(),
            });
          } else if (entityMatch3) {
            data.entities.push({
              id: crypto.randomUUID(),
              name: entityMatch3[1].trim(),
              type: entityMatch3[2].trim(),
              summary: '',
            });
          }
        }
      }
      
      // 关系部分（支持表格格式）- 放在实体部分之前，避免被 '实体' 匹配
      if (labels.relations.some(r => currentSection.includes(r))) {
        // 检查是否是表格行（包含 | 分隔符）
        if (trimmedLine.includes('|')) {
          // 移除首尾的 |，然后分割
          const cleanLine = trimmedLine.replace(/^\|/, '').replace(/\|$/, '');
          const parts = cleanLine.split('|').map(p => p.trim());
          // 跳过表格分隔线（全是连字符的行）
          const isSeparator = parts.every(p => /^-+$/.test(p) || p === '');
          // 关系表格格式：源实体ID | 目标实体ID | 关系类型
          const hasRelationHeader = labels.relations.some(r => trimmedLine.includes(r)) || 
                                    trimmedLine.includes(labels.sourceEntity) || 
                                    trimmedLine.includes(labels.targetEntity);
          if (parts.length >= 3 && !hasRelationHeader && !isSeparator) {
            const sourceId = parts[0];
            const targetId = parts[1];
            const relationType = parts[2];
            
            // 通过实体ID映射获取实体名称
            const sourceName = entityIdMap.get(sourceId) || sourceId;
            const targetName = entityIdMap.get(targetId) || targetId;
            
            if (sourceName && targetName && relationType && relationType !== '-') {
              data.relations.push({
                sourceName: sourceName,
                targetName: targetName,
                relationType: relationType,
              });
            }
          }
        } else {
          // 匹配格式1：源实体 --[关系类型]--> 目标实体（支持多词实体）
          const relationMatch1 = line.match(/(.+?)\s*--\[([^\]]+)\]-->\s*(.+)/);
          // 匹配格式0：源实体 --关系--> 目标实体（无方括号，支持多词）
          const relationMatch0 = line.match(/(.+?)\s*--\s*([^->]+?)\s*-->\s*(.+)/);
          // 匹配格式2：数字。源实体 --[关系类型]--> 目标实体（支持多词）
          const relationMatch2 = line.match(/^\d+\.\s*(.+?)\s*--\[([^\]]+)\]-->\s*(.+)/);
          // 匹配格式3：源实体 关系类型 目标实体（中文简化格式）
          const relationMatch3 = line.match(/([\u4e00-\u9fa5a-zA-Z0-9_]+)\s+([^\s]+)\s+([\u4e00-\u9fa5a-zA-Z0-9_]+)/);
          // 匹配格式4：- 源实体 -> 关系 -> 目标实体
          const relationMatch4 = line.match(/[-*]\s*([\u4e00-\u9fa5a-zA-Z0-9_]+)\s*[-→]\s*([^\s]+)\s*[-→]\s*([\u4e00-\u9fa5a-zA-Z0-9_]+)/);
          // 匹配格式5：源实体 与 目标实体 的关系是 关系类型（中文特有）
          const relationMatch5 = line.match(/([\u4e00-\u9fa5a-zA-Z0-9_]+)\s+与\s+([\u4e00-\u9fa5a-zA-Z0-9_]+)\s+的关系是\s+([^\s]+)/);
          
          if (relationMatch1) {
            data.relations.push({
              sourceName: relationMatch1[1].trim(),
              relationType: relationMatch1[2].trim(),
              targetName: relationMatch1[3].trim(),
            });
          } else if (relationMatch0) {
            data.relations.push({
              sourceName: relationMatch0[1].trim(),
              relationType: relationMatch0[2].trim(),
              targetName: relationMatch0[3].trim(),
            });
          } else if (relationMatch2) {
            data.relations.push({
              sourceName: relationMatch2[1].trim(),
              relationType: relationMatch2[2].trim(),
              targetName: relationMatch2[3].trim(),
            });
          } else if (relationMatch3) {
            data.relations.push({
              sourceName: relationMatch3[1].trim(),
              relationType: relationMatch3[2].trim(),
              targetName: relationMatch3[3].trim(),
            });
          } else if (relationMatch4) {
            data.relations.push({
              sourceName: relationMatch4[1].trim(),
              relationType: relationMatch4[2].trim(),
              targetName: relationMatch4[3].trim(),
            });
          } else if (relationMatch5) {
            data.relations.push({
              sourceName: relationMatch5[1].trim(),
              relationType: relationMatch5[3].trim(),
              targetName: relationMatch5[2].trim(),
            });
          }
        }
      }
    }

    // 去重标签
    data.tags = [...new Set(data.tags)];
    
    if (data.entities.length > 0 || data.relations.length > 0 || data.tags.length > 0 || data.summary.length > 0) {
      return data;
    }

    return null;
  }

  private fallbackExtraction(text: string): AIResponse {
    const data: AIResponse = {
      summary: this.generateDefaultSummary(text),
      timestamp: Date.now(),
      tags: this.extractTagsFromText(text),
      entities: [],
      relations: [],
    };
    
    // 简单的实体提取：从文本中提取可能的实体
    const entityPatterns = [
      /[\u4e00-\u9fa5]{2,8}/g, // 中文词
      /[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g, // 英文名词短语
    ];
    
    const foundEntities = new Set<string>();
    for (const pattern of entityPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          if (match.length >= 2 && !this.isStopWord(match)) {
            foundEntities.add(match);
          }
        });
      }
    }
    
    // 转换为实体对象
    data.entities = Array.from(foundEntities).slice(0, 10).map(name => ({
      id: crypto.randomUUID(),
      name,
      type: '概念',
      summary: '',
    }));
    
    return data;
  }

  private isStopWord(word: string): boolean {
    const stopWords = ['的', '是', '在', '有', '和', '了', '我', '你', '他', '她', '它', '这', '那', '能', '会', '可以', '要', '不要', '应该', '不应该', '一个', '一些', '所有', '每个', '没有', '不是', '什么', '为什么', '怎么样', '如何', '哪里', '何时', '因为', '所以', '但是', '然而', '如果', '虽然', '还是', '或者', '以及', '等等', '例如', '包括', '通过', '根据', '关于', '对于', '至于', '由于', '鉴于', '按照', '依照', '依据', '基于', '除了', '除开', '除非', '倘若', '假如', '要是', '万一', '只要', '只有', '无论', '不管', '尽管', '即使', '假如', '倘若', '万一', '若', '倘', '设若', '如若'];
    return stopWords.includes(word);
  }

  private generateDefaultSummary(text: string): string {
    // 生成默认摘要（取前100字）
    const cleaned = text.replace(/\s+/g, ' ').trim();
    return cleaned.length > 100 ? cleaned.substring(0, 100) + '...' : cleaned;
  }

  private extractTagsFromText(text: string): string[] {
    // 简单的标签提取
    const words = text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ').split(/\s+/);
    
    const tagCandidates = new Set<string>();
    words.forEach(word => {
      if (word.length >= 2 && word.length <= 10) {
        tagCandidates.add(word);
      }
    });
    
    return Array.from(tagCandidates).slice(0, 8);
  }

  private convertToEntities(data: AIResponse, text: string): Array<{
    name: string;
    type: string;
    summary: string;
    relatedEntities?: string[];
  }> {
    // 构建实体关系映射
    const entityRelations = new Map<string, Set<string>>();
    data.entities.forEach(e => entityRelations.set(e.name, new Set()));
    
    data.relations.forEach(r => {
      const sourceRelations = entityRelations.get(r.sourceName) || new Set();
      sourceRelations.add(r.targetName);
      entityRelations.set(r.sourceName, sourceRelations);
      
      const targetRelations = entityRelations.get(r.targetName) || new Set();
      targetRelations.add(r.sourceName);
      entityRelations.set(r.targetName, targetRelations);
    });
    
    return data.entities.map(e => ({
      name: e.name,
      type: e.type,
      summary: e.summary,
      relatedEntities: Array.from(entityRelations.get(e.name) || []),
    }));
  }

  private buildPrompt(text: string, format: FormatType): string {
    let prompt = `You are a professional knowledge graph extraction assistant. Please carefully analyze the following text and extract entities and relationships.\n\n`;
    
    prompt += `## Entity Extraction Rules\n`;
    prompt += `1. Identify all important entities in the text\n`;
    prompt += `2. Entity types include: person, location, organization, concept, event, book, product, technology, etc.\n`;
    prompt += `3. Each entity must contain: name, type, summary (description)\n\n`;
    
    prompt += `## Relationship Extraction Rules\n`;
    prompt += `1. Identify semantic relationships between entities\n`;
    prompt += `2. Relationship types include: belongs to, contains, related to, causes, affects, references, created by, uses, etc.\n`;
    prompt += `3. Each relationship must contain: sourceName, targetName, relationType\n\n`;
    
    prompt += `## Output Format\n`;
    
    if (format === 'json') {
      prompt += `Return in JSON format with the following fields:\n`;
      prompt += `- summary: Text summary (within 100 words)\n`;
      prompt += `- timestamp: Current timestamp (milliseconds)\n`;
      prompt += `- tags: Tag array (3-8 keywords)\n`;
      prompt += `- entities: Entity array\n`;
      prompt += `- relations: Relation array\n`;
    } else {
      prompt += `Return in structured Markdown format:\n`;
      prompt += `## Content Summary\n<summary content>\n\n`;
      prompt += `## Keyword Tags\n- Tag 1\n- Tag 2\n\n`;
      prompt += `## Entity List\n- Entity name(type): description\n\n`;
      prompt += `## Relationship List\n- Source Entity --[relationType]--> Target Entity\n`;
    }
    
    prompt += `\n## Input Text\n${text}`;
    
    return prompt;
  }

  private async callAIAPI(prompt: string): Promise<string> {
    // AI调用逻辑（保留但不主动调用）
    
    throw new Error('AI调用已禁用，当前仅支持从结构化Markdown提取数据');
  }

  private parseAIResponse(response: string, format: FormatType): AIResponse {
    if (format === 'json') {
      try {
        return JSON.parse(response);
      } catch {
        return this.parseMarkdownResponse(response);
      }
    }
    return this.parseMarkdownResponse(response);
  }

  private parseMarkdownResponse(response: string): AIResponse {
    return this.extractFromStructuredMarkdown(response, getCurrentLanguage()) || {
      summary: '',
      timestamp: Date.now(),
      tags: [],
      entities: [],
      relations: [],
    };
  }
}
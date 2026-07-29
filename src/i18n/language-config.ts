import type { App } from 'obsidian';

export type LanguageCode = 'zh-CN' | 'en-US';

export interface EntityType {
  type: string;
  color: string;
  description: string;
}

export interface RelationType {
  type: string;
  direction: 'forward' | 'bidirectional' | 'backward';
  description: string;
}

export interface LanguageLabels {
  summary: string[];
  tags: string[];
  entities: string[];
  relations: string[];
  entityId: string;
  entityName: string;
  entityType: string;
  entityDescription: string;
  sourceEntity: string;
  targetEntity: string;
  relationType: string;
  category: string;
  analysisResult: string;
  documentId: string;
  generatedTimestamp: string;
  basicInfo: string;
  originalText: string;
  keywordTags: string;
  entityLibrary: string;
  entityRelationshipGraph: string;
  time: string;
  docId: string;
  // 进度提示
  parsingText: string;
  extractingEntities: string;
  buildingGraph: string;
  // 错误提示
  emptyInput: string;
  // 确认提示
  confirmDelete: string;
  // 视图切换
  graphView: string;
  hierarchyView: string;
  timelineView: string;
  // 筛选标签
  filterByType: string;
  searchNodes: string;
}

export const ENTITY_TYPES: Record<string, EntityType[]> = {
  'zh-CN': [
    { type: '人物', color: '#ef4444', description: '个人、角色、用户' },
    { type: '组织', color: '#3b82f6', description: '公司、机构、团体' },
    { type: '地点', color: '#ec4899', description: '城市、国家、场所' },
    { type: '概念', color: '#8b5cf6', description: '思想、理论、抽象概念' },
    { type: '事件', color: '#f59e0b', description: '历史事件、活动、会议' },
    { type: '文档', color: '#10b981', description: '文章、书籍、论文' },
    { type: '产品', color: '#06b6d4', description: '商品、软件、硬件' },
    { type: '技术', color: '#84cc16', description: '技术、方法、工具' },
    { type: '时间', color: '#6366f1', description: '日期、时间段' },
    { type: '金钱', color: '#f97316', description: '金额、货币' },
    { type: '学术', color: '#a855f7', description: '研究领域、学科' },
    { type: '行业', color: '#0ea5e9', description: '产业、行业' },
    { type: '疾病', color: '#ef4444', description: '病症、健康问题' },
    { type: '药物', color: '#22c55e', description: '药品、治疗方法' },
    { type: '食物', color: '#f97316', description: '食材、菜肴' },
  ],
  'en-US': [
    { type: 'Person', color: '#ef4444', description: 'Individual, character, user' },
    { type: 'Organization', color: '#3b82f6', description: 'Company, institution, group' },
    { type: 'Location', color: '#ec4899', description: 'City, country, place' },
    { type: 'Concept', color: '#8b5cf6', description: 'Idea, theory, abstract concept' },
    { type: 'Event', color: '#f59e0b', description: 'Historical event, activity, meeting' },
    { type: 'Document', color: '#10b981', description: 'Article, book, paper' },
    { type: 'Product', color: '#06b6d4', description: 'Product, software, hardware' },
    { type: 'Technology', color: '#84cc16', description: 'Technology, method, tool' },
    { type: 'Time', color: '#6366f1', description: 'Date, time period' },
    { type: 'Money', color: '#f97316', description: 'Amount, currency' },
    { type: 'Academic', color: '#a855f7', description: 'Research field, discipline' },
    { type: 'Industry', color: '#0ea5e9', description: 'Industry, sector' },
    { type: 'Disease', color: '#ef4444', description: 'Illness, health issue' },
    { type: 'Medicine', color: '#22c55e', description: 'Drug, treatment' },
    { type: 'Food', color: '#f97316', description: 'Ingredient, dish' },
  ],
};

export const RELATION_TYPES: Record<string, RelationType[]> = {
  'zh-CN': [
    { type: '属于', direction: 'forward', description: '层级包含关系' },
    { type: '包含', direction: 'forward', description: '整体-部分关系' },
    { type: '组成', direction: 'forward', description: '构成关系' },
    { type: '子类', direction: 'forward', description: '继承关系' },
    { type: '父类', direction: 'backward', description: '父级关系' },
    { type: '相关', direction: 'bidirectional', description: '关联关系' },
    { type: '相似', direction: 'bidirectional', description: '相似关系' },
    { type: '衍生', direction: 'forward', description: '派生关系' },
    { type: '导致', direction: 'forward', description: '因果关系' },
    { type: '影响', direction: 'forward', description: '影响关系' },
    { type: '促进', direction: 'forward', description: '正向影响' },
    { type: '阻碍', direction: 'forward', description: '负向影响' },
    { type: '先于', direction: 'forward', description: '时序先后' },
    { type: '后于', direction: 'backward', description: '时序先后' },
    { type: '同时', direction: 'bidirectional', description: '同时发生' },
    { type: '位于', direction: 'forward', description: '位置关系' },
    { type: '拥有', direction: 'forward', description: '所属关系' },
    { type: '使用', direction: 'forward', description: '使用关系' },
    { type: '创建', direction: 'forward', description: '创建关系' },
    { type: '合作', direction: 'bidirectional', description: '合作关系' },
  ],
  'en-US': [
    { type: 'BelongsTo', direction: 'forward', description: 'Hierarchical inclusion' },
    { type: 'Contains', direction: 'forward', description: 'Whole-part relationship' },
    { type: 'ComposedOf', direction: 'forward', description: 'Composition' },
    { type: 'SubclassOf', direction: 'forward', description: 'Inheritance' },
    { type: 'ParentOf', direction: 'backward', description: 'Parent relationship' },
    { type: 'RelatedTo', direction: 'bidirectional', description: 'Association' },
    { type: 'SimilarTo', direction: 'bidirectional', description: 'Similarity' },
    { type: 'DerivedFrom', direction: 'forward', description: 'Derivation' },
    { type: 'Causes', direction: 'forward', description: 'Causal relationship' },
    { type: 'Influences', direction: 'forward', description: 'Influence' },
    { type: 'Promotes', direction: 'forward', description: 'Positive influence' },
    { type: 'Blocks', direction: 'forward', description: 'Negative influence' },
    { type: 'Before', direction: 'forward', description: 'Temporal order' },
    { type: 'After', direction: 'backward', description: 'Temporal order' },
    { type: 'Concurrent', direction: 'bidirectional', description: 'Simultaneous' },
    { type: 'LocatedAt', direction: 'forward', description: 'Location' },
    { type: 'Owns', direction: 'forward', description: 'Ownership' },
    { type: 'Uses', direction: 'forward', description: 'Usage' },
    { type: 'CreatedBy', direction: 'forward', description: 'Creation' },
    { type: 'CooperatesWith', direction: 'bidirectional', description: 'Cooperation' },
  ],
};

export const LANGUAGE_LABELS: Record<LanguageCode, LanguageLabels> = {
  'zh-CN': {
    summary: ['摘要', '概述', '简介'],
    tags: ['标签', '关键词', '标记'],
    entities: ['实体', '实体列表', '实体库'],
    relations: ['关系', '关系列表', '关系图谱', '实体关系'],
    entityId: '实体ID',
    entityName: '实体名称',
    entityType: '实体类型',
    entityDescription: '实体简介',
    sourceEntity: '源实体',
    targetEntity: '目标实体',
    relationType: '关系类型',
    category: '分类',
    analysisResult: '分析结果',
    documentId: '文档ID',
    generatedTimestamp: '生成时间戳',
    basicInfo: '基本信息',
    originalText: '原始文本',
    keywordTags: '关键词标签',
    entityLibrary: '实体库',
    entityRelationshipGraph: '实体关系图谱',
    time: '时间',
    docId: 'DocID',
    parsingText: '正在解析文本...',
    extractingEntities: '正在提取实体...',
    buildingGraph: '正在构建知识图谱...',
    emptyInput: '输入文本不能为空',
    confirmDelete: '确定要删除吗？',
    graphView: '图谱视图',
    hierarchyView: '层级视图',
    timelineView: '时间轴视图',
    filterByType: '按类型筛选',
    searchNodes: '搜索节点',
  },
  'en-US': {
    summary: ['Summary', 'Content Summary', 'Overview'],
    tags: ['Tags', 'Keyword Tags', 'Keywords'],
    entities: ['Entities', 'Entity List', 'Entity Library'],
    relations: ['Relations', 'Relationship List', 'Relation Graph'],
    entityId: 'Entity ID',
    entityName: 'Entity Name',
    entityType: 'Entity Type',
    entityDescription: 'Entity Description',
    sourceEntity: 'Source Entity',
    targetEntity: 'Target Entity',
    relationType: 'Relation Type',
    category: 'Categories',
    analysisResult: 'Analysis Result',
    documentId: 'Document ID',
    generatedTimestamp: 'Generated Timestamp',
    basicInfo: 'Basic Information',
    originalText: 'Original Text',
    keywordTags: 'Keyword Tags',
    entityLibrary: 'Entity Library',
    entityRelationshipGraph: 'Entity Relationship Graph',
    time: 'Time',
    docId: 'DocID',
    parsingText: 'Parsing text...',
    extractingEntities: 'Extracting entities...',
    buildingGraph: 'Building knowledge graph...',
    emptyInput: 'Input text cannot be empty',
    confirmDelete: 'Are you sure you want to delete?',
    graphView: 'Graph View',
    hierarchyView: 'Hierarchy View',
    timelineView: 'Timeline View',
    filterByType: 'Filter by Type',
    searchNodes: 'Search Nodes',
  },
};

let languageApp: App | null = null;

export function initLanguageConfig(app: App): void {
  languageApp = app;
}

export function getCurrentLanguage(): LanguageCode {
  const lang = languageApp
    ? languageApp.loadLocalStorage('knowledge-graph-lang')
    : localStorage.getItem('knowledge-graph-lang');
  return (lang || 'zh-CN') as LanguageCode;
}

export function setCurrentLanguage(lang: LanguageCode): void {
  if (languageApp) {
    languageApp.saveLocalStorage('knowledge-graph-lang', lang);
  } else {
    localStorage.setItem('knowledge-graph-lang', lang);
  }
}
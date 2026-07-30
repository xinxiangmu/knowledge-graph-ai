import { describe, it, expect } from 'vitest';
import {
  LANGUAGE_LABELS,
  ENTITY_TYPES,
  RELATION_TYPES,
  getCurrentLanguage,
  setCurrentLanguage,
  type LanguageCode,
  type EntityType,
  type RelationType,
} from '../i18n/language-config';

describe('Language Configuration', () => {
  describe('语言标签', () => {
    it('应该包含中文标签', () => {
      expect(LANGUAGE_LABELS['zh-CN']).toBeDefined();
      expect(LANGUAGE_LABELS['zh-CN'].summary).toEqual(['摘要', '概述', '简介']);
      expect(LANGUAGE_LABELS['zh-CN'].tags).toEqual(['标签', '关键词', '标记']);
      expect(LANGUAGE_LABELS['zh-CN'].entities).toEqual(['实体', '实体列表', '实体库']);
      expect(LANGUAGE_LABELS['zh-CN'].relations).toEqual(['关系', '关系列表', '关系图谱', '实体关系']);
    });

    it('应该包含英文标签', () => {
      expect(LANGUAGE_LABELS['en-US']).toBeDefined();
      expect(LANGUAGE_LABELS['en-US'].summary).toEqual(['Summary', 'Content Summary', 'Overview']);
      expect(LANGUAGE_LABELS['en-US'].tags).toEqual(['Tags', 'Keyword Tags', 'Keywords']);
      expect(LANGUAGE_LABELS['en-US'].entities).toEqual(['Entities', 'Entity List', 'Entity Library']);
      expect(LANGUAGE_LABELS['en-US'].relations).toEqual(['Relations', 'Relationship List', 'Relation Graph']);
    });

    it('应该包含视图切换标签', () => {
      expect(LANGUAGE_LABELS['zh-CN'].graphView).toBe('图谱视图');
      expect(LANGUAGE_LABELS['zh-CN'].hierarchyView).toBe('层级视图');
      expect(LANGUAGE_LABELS['zh-CN'].timelineView).toBe('时间轴视图');
      expect(LANGUAGE_LABELS['en-US'].graphView).toBe('Graph View');
      expect(LANGUAGE_LABELS['en-US'].hierarchyView).toBe('Hierarchy View');
      expect(LANGUAGE_LABELS['en-US'].timelineView).toBe('Timeline View');
    });

    it('应该包含筛选标签', () => {
      expect(LANGUAGE_LABELS['zh-CN'].filterByType).toBe('按类型筛选');
      expect(LANGUAGE_LABELS['zh-CN'].searchNodes).toBe('搜索节点');
      expect(LANGUAGE_LABELS['en-US'].filterByType).toBe('Filter by Type');
      expect(LANGUAGE_LABELS['en-US'].searchNodes).toBe('Search Nodes');
    });
  });

  describe('实体类型库', () => {
    it('应该包含中文实体类型', () => {
      const zhTypes = ENTITY_TYPES['zh-CN'];
      expect(zhTypes).toBeDefined();
      expect(zhTypes.length).toBeGreaterThan(10);
    });

    it('应该包含英文实体类型', () => {
      const enTypes = ENTITY_TYPES['en-US'];
      expect(enTypes).toBeDefined();
      expect(enTypes.length).toBeGreaterThan(10);
    });

    it('应该包含领域特定类型', () => {
      const zhTypes = ENTITY_TYPES['zh-CN'];
      const typeNames = zhTypes.map(t => t.type);
      
      expect(typeNames).toContain('人物');
      expect(typeNames).toContain('组织');
      expect(typeNames).toContain('地点');
      expect(typeNames).toContain('概念');
      expect(typeNames).toContain('事件');
      expect(typeNames).toContain('文档');
      expect(typeNames).toContain('产品');
      expect(typeNames).toContain('技术');
      expect(typeNames).toContain('时间');
      expect(typeNames).toContain('金钱');
      expect(typeNames).toContain('学术');
      expect(typeNames).toContain('行业');
      expect(typeNames).toContain('疾病');
      expect(typeNames).toContain('药物');
      expect(typeNames).toContain('食物');
    });

    it('应该为每个实体类型分配颜色', () => {
      const zhTypes = ENTITY_TYPES['zh-CN'];
      zhTypes.forEach(type => {
        expect(type.color).toBeDefined();
        expect(type.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });

    it('应该为每个实体类型提供描述', () => {
      const zhTypes = ENTITY_TYPES['zh-CN'];
      zhTypes.forEach(type => {
        expect(type.description).toBeDefined();
        expect(type.description.length).toBeGreaterThan(0);
      });
    });

    it('中英文实体类型数量应该一致', () => {
      const zhTypes = ENTITY_TYPES['zh-CN'];
      const enTypes = ENTITY_TYPES['en-US'];
      expect(zhTypes.length).toBe(enTypes.length);
    });
  });

  describe('关系类型模板库', () => {
    it('应该包含中文关系类型', () => {
      const zhRelations = RELATION_TYPES['zh-CN'];
      expect(zhRelations).toBeDefined();
      expect(zhRelations.length).toBeGreaterThan(15);
    });

    it('应该包含英文关系类型', () => {
      const enRelations = RELATION_TYPES['en-US'];
      expect(enRelations).toBeDefined();
      expect(enRelations.length).toBeGreaterThan(15);
    });

    it('应该包含层级关系类型', () => {
      const zhRelations = RELATION_TYPES['zh-CN'];
      const relationTypes = zhRelations.map(r => r.type);
      
      expect(relationTypes).toContain('属于');
      expect(relationTypes).toContain('包含');
      expect(relationTypes).toContain('组成');
      expect(relationTypes).toContain('子类');
      expect(relationTypes).toContain('父类');
    });

    it('应该包含关联关系类型', () => {
      const zhRelations = RELATION_TYPES['zh-CN'];
      const relationTypes = zhRelations.map(r => r.type);
      
      expect(relationTypes).toContain('相关');
      expect(relationTypes).toContain('相似');
      expect(relationTypes).toContain('衍生');
    });

    it('应该包含因果关系类型', () => {
      const zhRelations = RELATION_TYPES['zh-CN'];
      const relationTypes = zhRelations.map(r => r.type);
      
      expect(relationTypes).toContain('导致');
      expect(relationTypes).toContain('影响');
      expect(relationTypes).toContain('促进');
      expect(relationTypes).toContain('阻碍');
    });

    it('应该包含时序关系类型', () => {
      const zhRelations = RELATION_TYPES['zh-CN'];
      const relationTypes = zhRelations.map(r => r.type);
      
      expect(relationTypes).toContain('先于');
      expect(relationTypes).toContain('后于');
      expect(relationTypes).toContain('同时');
    });

    it('应该为每个关系类型定义方向', () => {
      const zhRelations = RELATION_TYPES['zh-CN'];
      zhRelations.forEach(relation => {
        expect(['forward', 'backward', 'bidirectional']).toContain(relation.direction);
      });
    });

    it('应该为每个关系类型提供描述', () => {
      const zhRelations = RELATION_TYPES['zh-CN'];
      zhRelations.forEach(relation => {
        expect(relation.description).toBeDefined();
        expect(relation.description.length).toBeGreaterThan(0);
      });
    });

    it('中英文关系类型数量应该一致', () => {
      const zhRelations = RELATION_TYPES['zh-CN'];
      const enRelations = RELATION_TYPES['en-US'];
      expect(zhRelations.length).toBe(enRelations.length);
    });
  });

  describe('语言存储', () => {
    it('应该获取默认语言', () => {
      const lang = getCurrentLanguage();
      expect(['zh-CN', 'en-US']).toContain(lang);
    });

    it('应该设置和获取语言', () => {
      setCurrentLanguage('en-US');
      expect(getCurrentLanguage()).toBe('en-US');
      
      setCurrentLanguage('zh-CN');
      expect(getCurrentLanguage()).toBe('zh-CN');
    });
  });
});
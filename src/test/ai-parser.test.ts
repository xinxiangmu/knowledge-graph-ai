import { describe, it, expect } from 'vitest';
import { AIModelParser } from '../services/ai-parser.service';

describe('AIModelParser', () => {
  describe('中文结构化Markdown提取', () => {
    it('应该从表格格式提取实体', async () => {
      const parser = new AIModelParser('llama3.2', 'http://localhost:11434', '', 'zh-CN');
      const text = `## 实体列表
| 实体ID | 实体名称 | 实体类型 | 实体简介 |
| ent001 | 人工智能 | 技术 | 机器学习和深度学习的总称 |
| ent002 | OpenAI | 组织 | 美国AI公司 |`;
      
      const result = await parser.parse({ text, language: 'zh-CN' });
      
      expect(result.entities).toHaveLength(2);
      expect(result.entities[0].name).toBe('人工智能');
      expect(result.entities[0].type).toBe('技术');
      expect(result.entities[1].name).toBe('OpenAI');
      expect(result.entities[1].type).toBe('组织');
    });

    it('应该从表格格式提取关系（实体先定义）', async () => {
      const parser = new AIModelParser('llama3.2', 'http://localhost:11434', '', 'zh-CN');
      const text = `## 实体列表
| 实体ID | 实体名称 | 实体类型 | 实体简介 |
| ent001 | 人工智能 | 技术 | 机器学习和深度学习的总称 |
| ent002 | OpenAI | 组织 | 美国AI公司 |

## 关系列表
| 源实体 | 目标实体 | 关系类型 |
| ent001 | ent002 | 开发 |`;
      
      const result = await parser.parse({ text, language: 'zh-CN' });
      
      expect(result.relations).toHaveLength(1);
      expect(result.relations[0].sourceName).toBe('人工智能');
      expect(result.relations[0].targetName).toBe('OpenAI');
      expect(result.relations[0].relationType).toBe('开发');
    });

    it('应该提取列表格式的标签', async () => {
      const parser = new AIModelParser('llama3.2', 'http://localhost:11434', '', 'zh-CN');
      const text = `## 标签
- 人工智能
- 机器学习
- 深度学习`;
      
      const result = await parser.parse({ text, language: 'zh-CN' });
      
      expect(result.tags).toContain('人工智能');
      expect(result.tags).toContain('机器学习');
      expect(result.tags).toContain('深度学习');
    });

    it('应该提取摘要内容', async () => {
      const parser = new AIModelParser('llama3.2', 'http://localhost:11434', '', 'zh-CN');
      const text = `## 摘要
这是一篇关于人工智能技术发展的文章，介绍了机器学习和深度学习的基本概念。`;
      
      const result = await parser.parse({ text, language: 'zh-CN' });
      
      expect(result.summary).toContain('人工智能');
      expect(result.summary).toContain('机器学习');
    });

    it('应该从**名称**(类型):描述格式提取实体', async () => {
      const parser = new AIModelParser('llama3.2', 'http://localhost:11434', '', 'zh-CN');
      const text = `## 实体
**张三**(人物): 清华大学教授
**北京**(地点): 中国首都`;
      
      const result = await parser.parse({ text, language: 'zh-CN' });
      
      expect(result.entities).toHaveLength(2);
      expect(result.entities[0].name).toBe('张三');
      expect(result.entities[0].type).toBe('人物');
      expect(result.entities[1].name).toBe('北京');
      expect(result.entities[1].type).toBe('地点');
    });

    it('应该提取源实体--[关系类型]-->目标实体格式的关系', async () => {
      const parser = new AIModelParser('llama3.2', 'http://localhost:11434', '', 'zh-CN');
      const text = `## 关系
张三 --[工作于]--> 清华大学
北京 --[位于]--> 中国`;
      
      const result = await parser.parse({ text, language: 'zh-CN' });
      
      expect(result.relations).toHaveLength(2);
      expect(result.relations[0].sourceName).toBe('张三');
      expect(result.relations[0].relationType).toBe('工作于');
      expect(result.relations[0].targetName).toBe('清华大学');
    });

    it('应该处理中文标题格式', async () => {
      const parser = new AIModelParser('llama3.2', 'http://localhost:11434', '', 'zh-CN');
      const text = `一、摘要
这是摘要内容

二、标签
- 标签1
- 标签2`;
      
      const result = await parser.parse({ text, language: 'zh-CN' });
      
      expect(result.summary).toContain('摘要内容');
      expect(result.tags).toContain('标签1');
    });

    it('应该从注释块中提取实体数据', async () => {
      const parser = new AIModelParser('llama3.2', 'http://localhost:11434', '', 'zh-CN');
      const text = `<!--
## 实体列表
**测试实体**(概念): 测试用实体
-->`;
      
      const result = await parser.parse({ text, language: 'zh-CN' });
      
      expect(result.entities).toHaveLength(1);
      expect(result.entities[0].name).toBe('测试实体');
    });
  });

  describe('英文结构化Markdown提取', () => {
    it('应该从表格格式提取实体', async () => {
      const parser = new AIModelParser('llama3.2', 'http://localhost:11434', '', 'en-US');
      const text = `## Entity List
| Entity ID | Entity Name | Entity Type | Entity Description |
| ent001 | Artificial Intelligence | Technology | General term for machine learning and deep learning |
| ent002 | OpenAI | Organization | American AI company |`;
      
      const result = await parser.parse({ text, language: 'en-US' });
      
      expect(result.entities).toHaveLength(2);
      expect(result.entities[0].name).toBe('Artificial Intelligence');
      expect(result.entities[0].type).toBe('Technology');
      expect(result.entities[1].name).toBe('OpenAI');
      expect(result.entities[1].type).toBe('Organization');
    });

    it('应该从表格格式提取关系（实体先定义）', async () => {
      const parser = new AIModelParser('llama3.2', 'http://localhost:11434', '', 'en-US');
      const text = `## Entity List
| Entity ID | Entity Name | Entity Type | Entity Description |
| ent001 | Artificial Intelligence | Technology | General term for machine learning |
| ent002 | OpenAI | Organization | American AI company |

## Relationship List
| Source Entity | Target Entity | Relation Type |
| ent001 | ent002 | Developed by |`;
      
      const result = await parser.parse({ text, language: 'en-US' });
      
      expect(result.relations).toHaveLength(1);
      expect(result.relations[0].sourceName).toBe('Artificial Intelligence');
      expect(result.relations[0].targetName).toBe('OpenAI');
      expect(result.relations[0].relationType).toBe('Developed by');
    });

    it('应该提取列表格式的标签', async () => {
      const parser = new AIModelParser('llama3.2', 'http://localhost:11434', '', 'en-US');
      const text = `## Keyword Tags
- Artificial Intelligence
- Machine Learning
- Deep Learning`;
      
      const result = await parser.parse({ text, language: 'en-US' });
      
      expect(result.tags).toContain('Artificial Intelligence');
      expect(result.tags).toContain('Machine Learning');
      expect(result.tags).toContain('Deep Learning');
    });

    it('应该提取摘要内容', async () => {
      const parser = new AIModelParser('llama3.2', 'http://localhost:11434', '', 'en-US');
      const text = `## Content Summary
This article discusses the development of AI technology, introducing the basic concepts of machine learning and deep learning.`;
      
      const result = await parser.parse({ text, language: 'en-US' });
      
      expect(result.summary).toContain('AI technology');
      expect(result.summary).toContain('machine learning');
    });

    it('应该从**名称**(类型):描述格式提取实体', async () => {
      const parser = new AIModelParser('llama3.2', 'http://localhost:11434', '', 'en-US');
      const text = `## Entities
**John Smith**(Person): Professor at Stanford University
**New York**(Location): Largest city in the US`;
      
      const result = await parser.parse({ text, language: 'en-US' });
      
      expect(result.entities).toHaveLength(2);
      expect(result.entities[0].name).toBe('John Smith');
      expect(result.entities[0].type).toBe('Person');
      expect(result.entities[1].name).toBe('New York');
      expect(result.entities[1].type).toBe('Location');
    });

    it('应该提取源实体--[关系类型]-->目标实体格式的关系', async () => {
      const parser = new AIModelParser('llama3.2', 'http://localhost:11434', '', 'en-US');
      const text = `## Relations
John --[Works at]--> Stanford University
Paris --[Located in]--> France`;
      
      const result = await parser.parse({ text, language: 'en-US' });
      
      expect(result.relations).toHaveLength(2);
      expect(result.relations[0].sourceName).toBe('John');
      expect(result.relations[0].relationType).toBe('Works at');
      expect(result.relations[0].targetName).toBe('Stanford University');
    });

    it('应该从注释块中提取实体数据', async () => {
      const parser = new AIModelParser('llama3.2', 'http://localhost:11434', '', 'en-US');
      const text = `<!--
## Entity List
**Test Entity**(Concept): Test entity
-->`;
      
      const result = await parser.parse({ text, language: 'en-US' });
      
      expect(result.entities).toHaveLength(1);
      expect(result.entities[0].name).toBe('Test Entity');
    });
  });

  describe('语言切换功能', () => {
    it('应该支持在解析时指定语言', async () => {
      const parser = new AIModelParser('llama3.2', 'http://localhost:11434', '', 'zh-CN');
      
      const chineseText = `## 摘要
中文摘要内容`;
      const englishText = `## Content Summary
English summary content`;
      
      const chineseResult = await parser.parse({ text: chineseText, language: 'zh-CN' });
      const englishResult = await parser.parse({ text: englishText, language: 'en-US' });
      
      expect(chineseResult.summary).toContain('中文摘要');
      expect(englishResult.summary).toContain('English summary');
    });

    it('应该支持通过setLanguage方法设置语言', async () => {
      const parser = new AIModelParser('llama3.2', 'http://localhost:11434', '', 'zh-CN');
      
      parser.setLanguage('en-US');
      const text = `## Content Summary
English content`;
      
      const result = await parser.parse({ text });
      
      expect(result.summary).toContain('English content');
    });
  });

  describe('fallback提取', () => {
    it('应该从普通文本中提取中文词作为实体', async () => {
      const parser = new AIModelParser('llama3.2', 'http://localhost:11434', '', 'zh-CN');
      const text = `张三在清华大学学习人工智能技术。`;
      
      const result = await parser.parse({ text, language: 'zh-CN' });
      
      expect(result.entities.length).toBeGreaterThan(0);
    });

    it('应该从普通文本中提取英文词作为实体', async () => {
      const parser = new AIModelParser('llama3.2', 'http://localhost:11434', '', 'en-US');
      const text = `John Smith works at Stanford University.`;
      
      const result = await parser.parse({ text, language: 'en-US' });
      
      expect(result.entities.length).toBeGreaterThan(0);
    });

    it('应该过滤单字停用词', async () => {
      const parser = new AIModelParser('llama3.2', 'http://localhost:11434', '', 'zh-CN');
      const text = `的 是 在 有 和 了`;
      
      const result = await parser.parse({ text, language: 'zh-CN' });
      
      expect(result.entities).toHaveLength(0);
    });
  });

  describe('配置方法', () => {
    it('应该正确配置模型名称', () => {
      const parser = new AIModelParser();
      parser.setModel('test-model');
    });

    it('应该正确配置API URL', () => {
      const parser = new AIModelParser();
      parser.configureByUrl('http://localhost:8080/api');
    });

    it('应该正确配置本地模型', () => {
      const parser = new AIModelParser();
      parser.configure('localhost', 11434, '/api/chat');
    });
  });

  describe('边界情况', () => {
    it('应该抛出错误当输入为空', async () => {
      const parser = new AIModelParser('llama3.2', 'http://localhost:11434', '', 'zh-CN');
      
      await expect(parser.parse({ text: '' })).rejects.toThrow('输入文本不能为空');
    });

    it('应该处理只包含空格的输入', async () => {
      const parser = new AIModelParser('llama3.2', 'http://localhost:11434', '', 'zh-CN');
      
      await expect(parser.parse({ text: '   ' })).rejects.toThrow('输入文本不能为空');
    });

    it('应该处理非常长的中文文本', async () => {
      const parser = new AIModelParser('llama3.2', 'http://localhost:11434', '', 'zh-CN');
      const longText = '测试文本'.repeat(1000);
      
      const result = await parser.parse({ text: longText, language: 'zh-CN' });
      
      expect(result.summary).toBeDefined();
    });

    it('应该处理非常长的英文文本', async () => {
      const parser = new AIModelParser('llama3.2', 'http://localhost:11434', '', 'en-US');
      const longText = 'test text '.repeat(1000);
      
      const result = await parser.parse({ text: longText, language: 'en-US' });
      
      expect(result.summary).toBeDefined();
    });

    it('应该生成默认摘要当没有摘要部分时', async () => {
      const parser = new AIModelParser('llama3.2', 'http://localhost:11434', '', 'zh-CN');
      const text = `这是一段很长的文本，没有摘要部分，用于测试默认摘要生成功能。这段文本足够长，可以验证摘要截取逻辑是否正确工作。`;
      
      const result = await parser.parse({ text, language: 'zh-CN' });
      
      expect(result.summary).toBeDefined();
      expect(result.summary.length).toBeLessThanOrEqual(103);
    });
  });
});
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SiliconFlowAdapter, OpenAIAdapter, AnthropicAdapter, ExternalAIServiceImpl } from '../services/external-ai.service';
import { requestUrl } from 'obsidian';

vi.mock('obsidian', () => ({
  requestUrl: vi.fn(),
}));

describe('SiliconFlowAdapter', () => {
  const mockRequestUrl = vi.mocked(requestUrl);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该构建正确的请求URL', () => {
    const adapter = new SiliconFlowAdapter('test-key', 'test-model');
    expect(adapter['baseUrl']).toBe('https://api.siliconflow.cn/v1/chat/completions');
  });

  it('应该构建正确的请求体', () => {
    const adapter = new SiliconFlowAdapter('test-key', 'test-model');
    const request = adapter['buildChatRequest']([
      { role: 'user', content: 'Hello' }
    ]);
    
    const body = JSON.parse(request.body as string);
    
    expect(body.model).toBe('test-model');
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0].role).toBe('user');
    expect(body.messages[0].content).toBe('Hello');
    expect(body.stream).toBe(false);
  });

  it('应该设置正确的请求头', () => {
    const adapter = new SiliconFlowAdapter('test-key', 'test-model');
    const request = adapter['buildChatRequest']([
      { role: 'user', content: 'Hello' }
    ]);
    
    expect(request.headers).toHaveProperty('Content-Type', 'application/json');
    expect(request.headers).toHaveProperty('Authorization', 'Bearer test-key');
  });

  it('应该从响应中提取内容', () => {
    const adapter = new SiliconFlowAdapter('test-key', 'test-model');
    const response = {
      choices: [{
        message: { content: 'Hello from SiliconFlow!' }
      }]
    };
    
    const content = adapter['extractContent'](response);
    
    expect(content).toBe('Hello from SiliconFlow!');
  });

  it('应该处理错误响应', () => {
    const adapter = new SiliconFlowAdapter('test-key', 'test-model');
    const errorResponse = {
      error: { message: 'API key invalid' }
    };
    
    expect(() => adapter['extractContent'](errorResponse)).toThrow('SiliconFlow API错误: API key invalid');
  });

  it('应该解析JSON格式的AI响应', () => {
    const adapter = new SiliconFlowAdapter('test-key', 'test-model');
    const jsonResponse = JSON.stringify({
      summary: 'Test summary',
      timestamp: Date.now(),
      tags: ['tag1', 'tag2'],
      entities: [{ name: 'Entity1', type: 'concept', summary: 'Test entity' }],
      relations: [{ sourceName: 'Entity1', targetName: 'Entity2', relationType: 'related to' }]
    });
    
    const result = adapter['parseAIResponse'](jsonResponse);
    
    expect(result.summary).toBe('Test summary');
    expect(result.tags).toEqual(['tag1', 'tag2']);
    expect(result.entities).toHaveLength(1);
    expect(result.relations).toHaveLength(1);
  });

  it('应该解析代码块格式的JSON响应', () => {
    const adapter = new SiliconFlowAdapter('test-key', 'test-model');
    const codeBlockResponse = `\`\`\`json
    {
      "summary": "Test summary",
      "tags": ["tag1"]
    }
    \`\`\``;
    
    const result = adapter['parseAIResponse'](codeBlockResponse);
    
    expect(result.summary).toBe('Test summary');
    expect(result.tags).toEqual(['tag1']);
  });

  it('应该处理非JSON响应作为降级', () => {
    const adapter = new SiliconFlowAdapter('test-key', 'test-model');
    const plainTextResponse = 'This is plain text response, not JSON.';
    
    const result = adapter['parseAIResponse'](plainTextResponse);
    
    expect(result.summary).toBe('This is plain text response, not JSON.');
    expect(result.tags).toEqual([]);
    expect(result.entities).toEqual([]);
    expect(result.relations).toEqual([]);
  });

  it('应该发送聊天请求并返回结果', async () => {
    mockRequestUrl.mockResolvedValue({
      status: 200,
      text: JSON.stringify({
        choices: [{
          message: { content: 'Hello from SiliconFlow!' }
        }]
      })
    });

    const adapter = new SiliconFlowAdapter('test-key', 'test-model');
    const result = await adapter.chat([
      { role: 'user', content: 'Hello' }
    ]);
    
    expect(result).toBe('Hello from SiliconFlow!');
    expect(mockRequestUrl).toHaveBeenCalled();
  });

  it('应该在API错误时抛出异常', async () => {
    mockRequestUrl.mockResolvedValue({
      status: 401,
      text: 'Unauthorized',
      statusText: 'Unauthorized'
    });

    const adapter = new SiliconFlowAdapter('test-key', 'test-model');
    
    await expect(adapter.chat([{ role: 'user', content: 'Hello' }])).rejects.toThrow('API调用失败: 401 Unauthorized - Unauthorized');
  });
});

describe('OpenAIAdapter', () => {
  const mockRequestUrl = vi.mocked(requestUrl);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该使用OpenAI默认URL', () => {
    const adapter = new OpenAIAdapter('test-key', 'test-model');
    expect(adapter['baseUrl']).toBe('https://api.openai.com/v1/chat/completions');
  });

  it('应该使用自定义URL', () => {
    const adapter = new OpenAIAdapter('test-key', 'test-model', 'https://custom.openai.com/v1/chat/completions');
    expect(adapter['baseUrl']).toBe('https://custom.openai.com/v1/chat/completions');
  });

  it('应该构建正确的请求', () => {
    const adapter = new OpenAIAdapter('test-key', 'test-model');
    const request = adapter['buildChatRequest']([
      { role: 'user', content: 'Hello' }
    ]);
    
    expect(request.method).toBe('POST');
    expect(request.headers).toHaveProperty('Authorization', 'Bearer test-key');
  });
});

describe('AnthropicAdapter', () => {
  it('应该使用Anthropic默认URL', () => {
    const adapter = new AnthropicAdapter('test-key', 'test-model');
    expect(adapter['baseUrl']).toBe('https://api.anthropic.com/v1/messages');
  });

  it('应该构建正确的Anthropic请求格式', () => {
    const adapter = new AnthropicAdapter('test-key', 'test-model');
    const request = adapter['buildChatRequest']([
      { role: 'system', content: 'System prompt' },
      { role: 'user', content: 'User message' }
    ]);
    
    const body = JSON.parse(request.body as string);
    
    expect(body.system).toBe('System prompt');
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0].role).toBe('user');
    expect(request.headers).toHaveProperty('x-api-key', 'test-key');
  });
});

describe('ExternalAIService', () => {
  it('应该配置SiliconFlow适配器', () => {
    const service = ExternalAIServiceImpl.getInstance();
    service.configure({
      provider: 'siliconflow',
      apiKey: 'test-key',
      model: 'test-model'
    });
    
    expect(service.isConfigured()).toBe(true);
    expect(service.getProvider()).toBe('siliconflow');
    expect(service.getModel()).toBe('test-model');
  });

  it('应该配置OpenAI适配器', () => {
    const service = ExternalAIServiceImpl.getInstance();
    service.configure({
      provider: 'openai',
      apiKey: 'test-key',
      model: 'test-model'
    });
    
    expect(service.isConfigured()).toBe(true);
    expect(service.getProvider()).toBe('openai');
  });

  it('应该配置Anthropic适配器', () => {
    const service = ExternalAIServiceImpl.getInstance();
    service.configure({
      provider: 'anthropic',
      apiKey: 'test-key',
      model: 'test-model'
    });
    
    expect(service.isConfigured()).toBe(true);
    expect(service.getProvider()).toBe('anthropic');
  });

  it('应该获取支持的模型列表', () => {
    const service = ExternalAIServiceImpl.getInstance();
    const models = service.getSupportedModels();
    
    expect(models).toHaveProperty('siliconflow');
    expect(models.siliconflow).toContain('deepseek-ai/DeepSeek-R1-0528-Qwen3-8B');
    expect(models).toHaveProperty('openai');
    expect(models).toHaveProperty('anthropic');
    expect(models).toHaveProperty('google');
  });

  it('应该清除配置', () => {
    const service = ExternalAIServiceImpl.getInstance();
    service.configure({
      provider: 'siliconflow',
      apiKey: 'test-key',
      model: 'test-model'
    });
    
    service.clearConfiguration();
    
    expect(service.isConfigured()).toBe(false);
    expect(service.getProvider()).toBe(null);
    expect(service.getModel()).toBe(null);
  });
});
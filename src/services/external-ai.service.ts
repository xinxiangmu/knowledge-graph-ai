import { requestUrl } from 'obsidian';
import { Entity } from '../models/entity.js';
import { Relation } from '../models/relation.js';

export type AIProvider = 'openai' | 'anthropic' | 'google' | 'siliconflow';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ExternalAIConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
  baseUrl?: string;
}

export interface ExtractedEntity {
  name: string;
  type: string;
  summary: string;
}

export interface ExtractedRelation {
  sourceName: string;
  targetName: string;
  relationType: string;
}

export interface ParseResult {
  summary: string;
  timestamp: number;
  tags: string[];
  entities: Entity[];
  relations: Relation[];
}

export interface ExternalAIService {
  configure(config: ExternalAIConfig): void;
  isConfigured(): boolean;
  testConnection(): Promise<boolean>;
  getProvider(): AIProvider | null;
  getModel(): string | null;
}

export interface AIAdapter {
  chat(messages: ChatMessage[]): Promise<string>;
  parse(text: string): Promise<ParseResult>;
}

export abstract class BaseAIAdapter implements AIAdapter {
  protected apiKey: string;
  protected model: string;
  protected baseUrl: string;

  constructor(apiKey: string, model: string, baseUrl?: string) {
    this.apiKey = apiKey;
    this.model = model;
    this.baseUrl = baseUrl || this.getDefaultBaseUrl();
  }

  protected abstract getDefaultBaseUrl(): string;
  protected abstract buildChatRequest(messages: ChatMessage[]): RequestInit;
  protected abstract extractContent(response: any): string;
  protected abstract parseAIResponse(text: string): {
    summary?: string;
    timestamp?: number;
    tags?: string[];
    entities?: ExtractedEntity[];
    relations?: ExtractedRelation[];
  };

  async chat(messages: ChatMessage[]): Promise<string> {
    const requestInit = this.buildChatRequest(messages);
    const response = await requestUrl({
      url: this.baseUrl,
      method: requestInit.method as any,
      headers: requestInit.headers as Record<string, string>,
      body: typeof requestInit.body === 'string' ? requestInit.body : JSON.stringify(requestInit.body)
    });

    if (response.status >= 400) {
      const errorText = response.text || 'Unknown error';
      throw new Error(`API调用失败: ${response.status} ${(response as any).statusText || ''} - ${errorText}`);
    }

    const data = JSON.parse(response.text);
    return this.extractContent(data);
  }

  async parse(text: string): Promise<ParseResult> {
    const prompt = this.buildPrompt(text);
    const response = await this.chat([
      { role: 'user', content: prompt }
    ]);

    const extractedData = this.parseAIResponse(response);

    const docId = crypto.randomUUID();
    const now = Date.now();

    const entities: Entity[] = (extractedData.entities || []).map((entity, index) => ({
      id: crypto.randomUUID(),
      docId,
      name: entity.name,
      type: entity.type || '概念',
      tags: extractedData.tags || [],
      summary: entity.summary || '',
      timestamp: extractedData.timestamp || now,
      filePath: '',
      isMainEntity: index === 0,
      createdAt: now,
      updatedAt: now,
    }));

    const relations: Relation[] = (extractedData.relations || []).map(rel => {
      const sourceEntity = entities.find(e => e.name === rel.sourceName);
      const targetEntity = entities.find(e => e.name === rel.targetName);

      return {
        id: crypto.randomUUID(),
        sourceId: sourceEntity?.id || '',
        targetId: targetEntity?.id || '',
        relationType: rel.relationType,
        docId,
        weight: 1.0,
        createdAt: now,
        updatedAt: now,
      };
    }).filter(r => r.sourceId && r.targetId);

    return {
      summary: extractedData.summary || this.generateDefaultSummary(text),
      timestamp: extractedData.timestamp || now,
      tags: extractedData.tags || [],
      entities,
      relations,
    };
  }

  private buildPrompt(text: string): string {
    return `You are a professional knowledge graph extraction assistant. Extract information from the following text and return it in JSON format.

Must return the following fields:
- summary: Content summary (within 100 words)
- timestamp: Timestamp (Unix timestamp in milliseconds, use current time if uncertain)
- tags: Tag array (3-5 related tags)
- entities: Entity array, each entity contains name, type (person/location/event/organization/concept), summary (description)
- relations: Relation array, each relation contains sourceName, targetName, relationType

Return only JSON, no other text.

Text to parse:
${text}`;
  }

  private generateDefaultSummary(text: string): string {
    const cleaned = text.replace(/[#*`[\]]/g, '').trim();
    return cleaned.substring(0, 200) + (cleaned.length > 200 ? '...' : '');
  }
}

export class OpenAIAdapter extends BaseAIAdapter {
  protected getDefaultBaseUrl(): string {
    return 'https://api.openai.com/v1/chat/completions';
  }

  protected buildChatRequest(messages: ChatMessage[]): RequestInit {
    return {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        stream: false,
      }),
    };
  }

  protected extractContent(response: any): string {
    if (response.error) {
      throw new Error(`OpenAI API错误: ${response.error.message || JSON.stringify(response.error)}`);
    }
    return response.choices?.[0]?.message?.content || '';
  }

  protected parseAIResponse(text: string): any {
    let jsonStr = text.trim();

    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1];
    }

    jsonStr = jsonStr.replace(/^[^{[]*/, '').replace(/[^}\]]*$/, '');

    try {
      return JSON.parse(jsonStr);
    } catch {
      return {
        summary: text.substring(0, 200),
        timestamp: Date.now(),
        tags: [],
        entities: [],
        relations: [],
      };
    }
  }
}

export class AnthropicAdapter extends BaseAIAdapter {
  protected getDefaultBaseUrl(): string {
    return 'https://api.anthropic.com/v1/messages';
  }

  protected buildChatRequest(messages: ChatMessage[]): RequestInit {
    const systemMessage = messages.find(m => m.role === 'system')?.content || '';
    const userMessages = messages.filter(m => m.role !== 'system');

    return {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 4096,
        system: systemMessage,
        messages: userMessages.map(msg => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content,
        })),
      }),
    };
  }

  protected extractContent(response: any): string {
    if (response.error) {
      throw new Error(`Anthropic API错误: ${response.error.message || JSON.stringify(response.error)}`);
    }
    return response.content?.[0]?.text || '';
  }

  protected parseAIResponse(text: string): any {
    let jsonStr = text.trim();

    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1];
    }

    jsonStr = jsonStr.replace(/^[^{[]*/, '').replace(/[^}\]]*$/, '');

    try {
      return JSON.parse(jsonStr);
    } catch {
      return {
        summary: text.substring(0, 200),
        timestamp: Date.now(),
        tags: [],
        entities: [],
        relations: [],
      };
    }
  }
}

export class SiliconFlowAdapter extends BaseAIAdapter {
  protected getDefaultBaseUrl(): string {
    return 'https://api.siliconflow.cn/v1/chat/completions';
  }

  protected buildChatRequest(messages: ChatMessage[]): RequestInit {
    return {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        stream: false,
      }),
    };
  }

  protected extractContent(response: any): string {
    if (response.error) {
      throw new Error(`SiliconFlow API错误: ${response.error.message || JSON.stringify(response.error)}`);
    }
    return response.choices?.[0]?.message?.content || '';
  }

  protected parseAIResponse(text: string): any {
    let jsonStr = text.trim();

    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1];
    }

    jsonStr = jsonStr.replace(/^[^{[]*/, '').replace(/[^}\]]*$/, '');

    try {
      return JSON.parse(jsonStr);
    } catch {
      return {
        summary: text.substring(0, 200),
        timestamp: Date.now(),
        tags: [],
        entities: [],
        relations: [],
      };
    }
  }
}

export class GeminiAdapter extends BaseAIAdapter {
  protected getDefaultBaseUrl(): string {
    const base = this.baseUrl?.includes('/v1beta/models')
      ? this.baseUrl.replace('/v1beta/models', '')
      : (this.baseUrl || 'https://generativelanguage.googleapis.com');
    return `${base}/v1beta/models/${this.model}:generateContent`;
  }

  protected buildChatRequest(messages: ChatMessage[]): RequestInit {
    const userMessage = messages.find(m => m.role === 'user')?.content || '';

    return {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.apiKey,
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: userMessage }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
        },
      }),
    };
  }

  protected extractContent(response: any): string {
    if (response.error) {
      throw new Error(`Gemini API错误: ${response.error.message || JSON.stringify(response.error)}`);
    }
    return response.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  protected parseAIResponse(text: string): any {
    let jsonStr = text.trim();

    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1];
    }

    jsonStr = jsonStr.replace(/^[^{[]*/, '').replace(/[^}\]]*$/, '');

    try {
      return JSON.parse(jsonStr);
    } catch {
      return {
        summary: text.substring(0, 200),
        timestamp: Date.now(),
        tags: [],
        entities: [],
        relations: [],
      };
    }
  }
}

export class SecureStorage {
  private static instance: SecureStorage;
  private encryptedKey: string | null = null;

  private constructor() {}

  static getInstance(): SecureStorage {
    if (!SecureStorage.instance) {
      SecureStorage.instance = new SecureStorage();
    }
    return SecureStorage.instance;
  }

  setKey(apiKey: string): void {
    this.encryptedKey = this.encrypt(apiKey);
  }

  getKey(): string | null {
    if (!this.encryptedKey) return null;
    return this.decrypt(this.encryptedKey);
  }

  clearKey(): void {
    this.encryptedKey = null;
  }

  hasKey(): boolean {
    return this.encryptedKey !== null;
  }

  private encrypt(key: string): string {
    const encoded = btoa(encodeURIComponent(key));
    return encoded.split('').reverse().join('');
  }

  private decrypt(encrypted: string): string {
    const reversed = encrypted.split('').reverse().join('');
    return decodeURIComponent(atob(reversed));
  }
}

export class ExternalAIServiceImpl implements ExternalAIService {
  private static instance: ExternalAIServiceImpl;
  private adapter: AIAdapter | null = null;
  private provider: AIProvider | null = null;
  private model: string | null = null;
  private secureStorage: SecureStorage;
  private config: ExternalAIConfig | null = null;

  private constructor() {
    this.secureStorage = SecureStorage.getInstance();
  }

  static getInstance(): ExternalAIServiceImpl {
    if (!ExternalAIServiceImpl.instance) {
      ExternalAIServiceImpl.instance = new ExternalAIServiceImpl();
    }
    return ExternalAIServiceImpl.instance;
  }

  configure(config: ExternalAIConfig): void {
    this.config = config;
    this.provider = config.provider;
    this.model = config.model;

    this.secureStorage.setKey(config.apiKey);

    const apiKey = this.secureStorage.getKey();
    if (!apiKey) {
      throw new Error('API密钥配置失败');
    }

    switch (config.provider) {
      case 'openai':
        this.adapter = new OpenAIAdapter(apiKey, config.model, config.baseUrl);
        break;
      case 'anthropic':
        this.adapter = new AnthropicAdapter(apiKey, config.model, config.baseUrl);
        break;
      case 'google':
        this.adapter = new GeminiAdapter(apiKey, config.model, config.baseUrl);
        break;
      case 'siliconflow':
        this.adapter = new SiliconFlowAdapter(apiKey, config.model, config.baseUrl);
        break;
      default:
        throw new Error(`不支持的AI提供商: ${config.provider}`);
    }
  }

  isConfigured(): boolean {
    return this.adapter !== null && this.secureStorage.hasKey();
  }

  async testConnection(): Promise<boolean> {
    if (!this.adapter) {
      return false;
    }

    try {
      const testMessage: ChatMessage = {
        role: 'user',
        content: 'Hi',
      };
      await this.adapter.chat([testMessage]);
      return true;
    } catch {
      return false;
    }
  }

  getProvider(): AIProvider | null {
    return this.provider;
  }

  getModel(): string | null {
    return this.model;
  }

  getAdapter(): AIAdapter | null {
    return this.adapter;
  }

  clearConfiguration(): void {
    this.adapter = null;
    this.provider = null;
    this.model = null;
    this.config = null;
    this.secureStorage.clearKey();
  }

  getSupportedModels(): Record<AIProvider, string[]> {
    return {
      openai: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
      anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
      google: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro'],
      siliconflow: ['deepseek-ai/DeepSeek-R1-0528-Qwen3-8B'],
    };
  }
}

export const externalAIService = ExternalAIServiceImpl.getInstance();

import { Notice, Modal, App } from 'obsidian';
import type KnowledgeGraphPlugin from '../main.js';
import { Subscription, SubscriptionModel } from '../models/subscription.js';
import { getCurrentLanguage, LanguageCode } from '../i18n/language-config.js';
import { applyCssText, parseHtml, el } from '../utils/dom-helper.js';

declare global {
  interface HTMLElement {
    createDiv(options?: { cls?: string; text?: string }): HTMLElement;
    createEl(tag: string, options?: { type?: string; cls?: string; value?: string; placeholder?: string; text?: string }): HTMLElement;
    empty(): void;
    setAttribute(name: string, value: string): void;
  }
}

export interface PluginSettings {
  pluginName: string;
  aiModelType: 'local' | 'external';
  aiProvider: 'openai' | 'anthropic' | 'google' | 'siliconflow';
  aiModel: string;
  apiAddress: string;
  apiPort: number;
  apiKey: string;
  systemPrompt: string;
  entityExtractPrompt: string;
  summaryGeneratePrompt: string;
  fusionPrompt: string;
}

export const DEFAULT_SETTINGS: PluginSettings = {
  pluginName: 'Knowledge Graph AI',
  aiModelType: 'local',
  aiProvider: 'openai',
  aiModel: '',
  apiAddress: 'http://localhost:11434',
  apiPort: 11434,
  apiKey: '',
  systemPrompt: 'You are a professional document analysis assistant responsible for extracting structured information from documents.\n\n## Output Requirements\n1. Output must be in JSON format, containing: categories (classification info), summary (summary), tags (tags), entities (entities)\n2. categories must include scores (0-100) for these 6 categories: arts, social, natural, applied, history, general\n3. summary: 2-3 sentences summarizing the core content\n4. tags: Extract 5-10 keyword tags\n5. entities: Identify 5-15 key entities, each containing name, type, description\n\n## Example Output Format\n{\n  "categories": {"arts": 75, "social": 60, "natural": 30, "applied": 80, "history": 45, "general": 90},\n  "summary": "This article discusses...",\n  "tags": ["Artificial Intelligence", "Machine Learning", "Deep Learning"],\n  "entities": [\n    {"name": "Zhang San", "type": "person", "description": "Professor at X University"},\n    {"name": "OpenAI", "type": "organization", "description": "AI company"}\n  ]\n}',
  entityExtractPrompt: 'Extract entities and their relationships from the following text. Output JSON format only.',
  summaryGeneratePrompt: 'Generate a concise summary for the following text.',
  fusionPrompt: 'Fuse the following knowledge fragments and extract core information.',
};

export interface SettingsTabProps {
  plugin: KnowledgeGraphPlugin;
}

class ConfirmModal extends Modal {
  private onConfirm: () => void;
  private message: string;

  constructor(app: App, message: string, onConfirm: () => void) {
    super(app);
    this.message = message;
    this.onConfirm = onConfirm;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createDiv({ text: this.message, cls: 'kg-confirm-message' });
    const buttonContainer = contentEl.createDiv({ cls: 'kg-modal-actions' });
    const confirmBtn = buttonContainer.createEl('button', {
      text: '确定',
      cls: 'kg-btn primary',
    });
    const cancelBtn = buttonContainer.createEl('button', {
      text: '取消',
      cls: 'kg-btn',
    });
    confirmBtn.addEventListener('click', () => {
      this.onConfirm();
      this.close();
    });
    cancelBtn.addEventListener('click', () => {
      this.close();
    });
  }
}

export class SettingsTab {
  private plugin: KnowledgeGraphPlugin;
  private settings: PluginSettings;
  private subscription: Subscription | null;
  private subscriptionModel: SubscriptionModel;
  private containerEl: HTMLElement | null = null;

  constructor(props: SettingsTabProps) {
    this.plugin = props.plugin;
    this.settings = { ...DEFAULT_SETTINGS };
    this.subscriptionModel = new SubscriptionModel();
    this.subscription = this.subscriptionModel.getByAccountId(this.getAccountId());
  }

  private getAccountId(): string {
    return this.generateAccountId();
  }

  private generateAccountId(): string {
    return 'kg_' + '0'.repeat(12) + '****';
  }

  public loadSettings(): void {
    const savedSettings = localStorage.getItem('knowledge-graph-settings');
    if (savedSettings) {
      try {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) };
      } catch {
        this.settings = { ...DEFAULT_SETTINGS };
      }
    }
  }

  public saveSettings(): void {
    localStorage.setItem('knowledge-graph-settings', JSON.stringify(this.settings));
  }

  private validateApiAddress(address: string): string | null {
    if (!address) {
      return 'API地址不能为空';
    }
    try {
      new URL(address);
      return null;
    } catch {
      return 'API地址格式无效，请输入有效的URL';
    }
  }

  private validatePort(port: number): string | null {
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      return '端口号必须是1-65535之间的整数';
    }
    return null;
  }

  private validateApiKey(apiKey: string): string | null {
    if (this.isPro && !apiKey) {
      return 'API密钥不能为空（Pro功能）';
    }
    return null;
  }

  private get isPro(): boolean {
    return this.subscription?.plan === 'pro';
  }

  private get isTrialUsed(): boolean {
    return this.subscription?.trialUsed ?? false;
  }

  private formatDate(timestamp: number): string {
    if (!timestamp) return '未知';
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private getRemainingDays(endTime: number): number {
    const remaining = endTime - Date.now();
    return remaining > 0 ? Math.ceil(remaining / (1000 * 60 * 60 * 24)) : 0;
  }

  private getSubscriptionStatusText(): string {
    if (!this.subscription) {
      return 'Free';
    }
    const planMap: Record<string, string> = { free: 'Free', pro: 'Pro' };
    return planMap[this.subscription.plan] || 'Free';
  }

  private getSubscriptionStatusDetail(): { status: string; remainingDays: number; isExpiringSoon: boolean } {
    if (!this.subscription) {
      return { status: '未激活', remainingDays: 0, isExpiringSoon: false };
    }

    const remainingDays = this.getRemainingDays(this.subscription.endTime);

    if (this.subscription.status === 'expired') {
      return { status: '已过期', remainingDays: 0, isExpiringSoon: false };
    }

    if (this.subscription.status === 'cancelled') {
      return { status: '已取消', remainingDays: 0, isExpiringSoon: false };
    }

    if (this.subscription.plan === 'free') {
      return { status: '免费版', remainingDays: 0, isExpiringSoon: false };
    }

    return {
      status: remainingDays > 0 ? '激活中' : '即将过期',
      remainingDays,
      isExpiringSoon: remainingDays > 0 && remainingDays <= 3,
    };
  }

  private showUpgradePrompt(): void {
    new Notice('🔒 这是Pro功能，请升级到Pro版本以解锁此功能。');
  }

  private getCurrentLang(): LanguageCode {
    return getCurrentLanguage();
  }

  private t(key: string): string {
    const lang = this.getCurrentLang();
    
    const translations: Record<LanguageCode, Record<string, string>> = {
      'zh-CN': {
        'version': '版本',
        'prompt_config': '提示词配置',
        'system_prompt': '文档解析提示词',
        'entity_extract_prompt': '实体提取提示词',
        'summary_generate_prompt': '摘要生成提示词',
        'fusion_prompt': '知识融合提示词',
        'model_selection': '模型选择',
        'local_model': '本地模型',
        'external_model': '外部模型',
        'start_parse': '开始解析',
        'analyze_all_docs': '历史文档分析',
        'parse_desc': '上传文档或直接输入文本，AI将自动提取结构化知识',
        'upload_formats': '支持格式：.md, .txt, .json',
        'upload_formats_desc': '点击区域上传或拖拽文件',
        'enter_text': '或直接输入文本',
        'or_upload_files': '或上传文件',
        'reading_files': '读取文件...',
        'reading_file': '读取文件',
        'preparing_prompt': '准备提示词...',
        'calling_model': '调用模型...',
        'formatting_output': '格式化输出...',
        'saving': '保存...',
        'complete': '完成',
        'parse_complete': '解析完成',
        'analyzing_all_docs': '分析所有文档...',
        'analyzing_doc': '分析文档',
        'of': ' / ',
        'doc': '个文档',
        'analyze_complete': '分析完成',
        'analyze_error': '分析失败',
        'privacy_policy': '🔒 隐私政策',
        'terms_of_service': '📄 服务条款',
        'send_feedback': '💌 发送反馈',
        'feedback_title': '💌 发送反馈',
        'feedback_desc': '感谢你的反馈！我们会认真听取每一条建议。',
        'feedback_type': '反馈类型',
        'feedback_content': '反馈内容',
        'contact_email': '联系邮箱（选填）',
        'cancel': '取消',
        'send': '发送反馈',
        'please_enter_content': '请填写反馈内容',
        'close': '关闭',
        'version_info': '版本信息',
        'account_id': '账户ID',
        'subscription_status': '订阅状态',
        'activation_time': '激活时间',
        'expiration_time': '到期时间',
        'remaining_days': '剩余天数',
        'device_count': '设备数',
        'trial_status': '试用状态',
        'already_used': '已使用',
        'not_used': '未使用',
        'settings_management': '设置管理',
        'reset_default': '恢复默认值',
        'confirm_reset': '确定要恢复所有设置为默认值吗？',
        'basic_settings': '基础设置',
        'plugin_name': '插件名称',
        'ai_model_type': 'AI模型类型',
        'ai_provider': 'AI提供商',
        'ai_model': 'AI模型',
        'api_address': 'API地址',
        'api_port': 'API端口',
        'external_ai_config': '外部AI配置',
        'api_key': 'API密钥',
        'prompt_warning': '提示：提示词仅可微调，请勿大幅修改格式要求（如JSON结构、输出字段等），否则可能导致解析失败。',
      },
      'en-US': {
        'version': 'Version',
        'prompt_config': 'Prompt Configuration',
        'system_prompt': 'Document Parsing Prompt',
        'entity_extract_prompt': 'Entity Extraction Prompt',
        'summary_generate_prompt': 'Summary Generation Prompt',
        'fusion_prompt': 'Knowledge Fusion Prompt',
        'model_selection': 'Model Selection',
        'local_model': 'Local Model',
        'external_model': 'External Model',
        'start_parse': 'Start Parsing',
        'analyze_all_docs': 'Analyze All Documents',
        'parse_desc': 'Upload documents or input text directly, AI will automatically extract structured knowledge',
        'upload_formats': 'Supported formats: .md, .txt, .json',
        'upload_formats_desc': 'Click or drag files to upload',
        'enter_text': 'Or enter text directly',
        'or_upload_files': 'Or upload files',
        'reading_files': 'Reading files...',
        'reading_file': 'Reading file',
        'preparing_prompt': 'Preparing prompt...',
        'calling_model': 'Calling model...',
        'formatting_output': 'Formatting output...',
        'saving': 'Saving...',
        'complete': 'Complete',
        'parse_complete': 'Parsing complete',
        'analyzing_all_docs': 'Analyzing all documents...',
        'analyzing_doc': 'Analyzing document',
        'of': ' / ',
        'doc': ' documents',
        'analyze_complete': 'Analysis complete',
        'analyze_error': 'Analysis failed',
        'privacy_policy': '🔒 Privacy Policy',
        'terms_of_service': '📄 Terms of Service',
        'send_feedback': '💌 Send Feedback',
        'feedback_title': '💌 Send Feedback',
        'feedback_desc': 'Thank you for your feedback! We carefully consider every suggestion.',
        'feedback_type': 'Feedback Type',
        'feedback_content': 'Feedback Content',
        'contact_email': 'Contact Email (optional)',
        'cancel': 'Cancel',
        'send': 'Send Feedback',
        'please_enter_content': 'Please enter feedback content',
        'close': 'Close',
        'version_info': 'Version Info',
        'account_id': 'Account ID',
        'subscription_status': 'Subscription Status',
        'activation_time': 'Activation Time',
        'expiration_time': 'Expiration Time',
        'remaining_days': 'Remaining Days',
        'device_count': 'Device Count',
        'trial_status': 'Trial Status',
        'already_used': 'Used',
        'not_used': 'Not Used',
        'settings_management': 'Settings Management',
        'reset_default': 'Reset to Default',
        'confirm_reset': 'Are you sure you want to reset all settings to default?',
        'basic_settings': 'Basic Settings',
        'plugin_name': 'Plugin Name',
        'ai_model_type': 'AI Model Type',
        'ai_provider': 'AI Provider',
        'ai_model': 'AI Model',
        'api_address': 'API Address',
        'api_port': 'API Port',
        'external_ai_config': 'External AI Configuration',
        'api_key': 'API Key',
        'prompt_warning': 'Warning: Prompts should only be fine-tuned. Do not modify format requirements (such as JSON structure, output fields, etc.), otherwise parsing may fail.',
      },
    };

    return translations[lang]?.[key] || key;
  }

  private createTextInput(
    parent: HTMLElement,
    label: string,
    value: string,
    onChange: (value: string) => void,
    placeholder?: string,
    isProOnly: boolean = false
  ): void {
    const div = parent.createDiv({ cls: 'setting-item' });

    const infoDiv = div.createDiv({ cls: 'setting-item-info' });
    const nameDiv = infoDiv.createDiv({ cls: 'setting-item-name', text: label });
    if (isProOnly && !this.isPro) {
      nameDiv.createEl('span', { text: ' 🔒', cls: 'pro-indicator' });
    }

    const controlDiv = div.createDiv({ cls: 'setting-item-control' });
    const input = controlDiv.createEl('input', {
      type: 'text',
      cls: 'setting-input',
      value: value,
      placeholder: placeholder,
    });

    if (isProOnly && !this.isPro) {
      input.setAttribute('disabled', 'disabled');
      input.addEventListener('click', () => this.showUpgradePrompt());
    } else {
      input.addEventListener('change', (e: Event) => {
        const target = e.target as HTMLInputElement;
        onChange(target.value);
      });
    }
  }

  private createSelect(
    parent: HTMLElement,
    label: string,
    value: string,
    options: { label: string; value: string }[],
    onChange: (value: string) => void,
    isProOnly: boolean = false
  ): void {
    const div = parent.createDiv({ cls: 'setting-item' });

    const infoDiv = div.createDiv({ cls: 'setting-item-info' });
    const nameDiv = infoDiv.createDiv({ cls: 'setting-item-name', text: label });
    if (isProOnly && !this.isPro) {
      nameDiv.createEl('span', { text: ' 🔒', cls: 'pro-indicator' });
    }

    const controlDiv = div.createDiv({ cls: 'setting-item-control' });
    const select = controlDiv.createEl('select', { cls: 'setting-select' });

    options.forEach((opt) => {
      const optionEl = select.createEl('option', {
        value: opt.value,
        text: opt.label,
      });
      if (opt.value === value) {
        optionEl.setAttribute('selected', 'selected');
      }
    });

    if (isProOnly && !this.isPro) {
      select.setAttribute('disabled', 'disabled');
      select.addEventListener('click', () => this.showUpgradePrompt());
    } else {
      select.addEventListener('change', (e: Event) => {
        const target = e.target as HTMLSelectElement;
        onChange(target.value);
      });
    }
  }

  private createNumberInput(
    parent: HTMLElement,
    label: string,
    value: number,
    onChange: (value: number) => void,
    min?: number,
    max?: number,
    isProOnly: boolean = false
  ): void {
    const div = parent.createDiv({ cls: 'setting-item' });

    const infoDiv = div.createDiv({ cls: 'setting-item-info' });
    const nameDiv = infoDiv.createDiv({ cls: 'setting-item-name', text: label });
    if (isProOnly && !this.isPro) {
      nameDiv.createEl('span', { text: ' 🔒', cls: 'pro-indicator' });
    }

    const controlDiv = div.createDiv({ cls: 'setting-item-control' });
    const input = controlDiv.createEl('input', {
      type: 'number',
      cls: 'setting-input',
      value: String(value),
    });

    if (min !== undefined) input.setAttribute('min', String(min));
    if (max !== undefined) input.setAttribute('max', String(max));

    if (isProOnly && !this.isPro) {
      input.setAttribute('disabled', 'disabled');
      input.addEventListener('click', () => this.showUpgradePrompt());
    } else {
      input.addEventListener('change', (e: Event) => {
        const target = e.target as HTMLInputElement;
        const newValue = parseInt(target.value, 10);
        if (!isNaN(newValue)) {
          onChange(newValue);
        }
      });
    }
  }

  private createPasswordInput(
    parent: HTMLElement,
    label: string,
    value: string,
    onChange: (value: string) => void,
    isProOnly: boolean = false
  ): void {
    const div = parent.createDiv({ cls: 'setting-item' });

    const infoDiv = div.createDiv({ cls: 'setting-item-info' });
    const nameDiv = infoDiv.createDiv({ cls: 'setting-item-name', text: label });
    if (isProOnly && !this.isPro) {
      nameDiv.createEl('span', { text: ' 🔒', cls: 'pro-indicator' });
    }

    const controlDiv = div.createDiv({ cls: 'setting-item-control' });
    const input = controlDiv.createEl('input', {
      type: 'password',
      cls: 'setting-input',
      value: value,
    });

    if (isProOnly && !this.isPro) {
      input.setAttribute('disabled', 'disabled');
      input.addEventListener('click', () => this.showUpgradePrompt());
    } else {
      input.addEventListener('change', (e: Event) => {
        const target = e.target as HTMLInputElement;
        onChange(target.value);
      });
    }
  }

  private createTextarea(
    parent: HTMLElement,
    label: string,
    value: string,
    onChange: (value: string) => void,
    isProOnly: boolean = false
  ): void {
    const div = parent.createDiv({ cls: 'setting-item' });

    const infoDiv = div.createDiv({ cls: 'setting-item-info' });
    const nameDiv = infoDiv.createDiv({ cls: 'setting-item-name', text: label });
    if (isProOnly && !this.isPro) {
      nameDiv.createEl('span', { text: ' 🔒', cls: 'pro-indicator' });
    }

    const controlDiv = div.createDiv({ cls: 'setting-item-control' });
    const textarea = controlDiv.createEl('textarea', {
      cls: 'setting-textarea',
      value: value,
    });

    if (isProOnly && !this.isPro) {
      textarea.setAttribute('disabled', 'disabled');
      textarea.addEventListener('click', () => this.showUpgradePrompt());
    } else {
      textarea.addEventListener('change', (e: Event) => {
        const target = e.target as HTMLTextAreaElement;
        onChange(target.value);
      });
    }
  }

  private createVersionInfo(parent: HTMLElement): void {
    const div = parent.createDiv({ cls: 'version-info' });

    div.createDiv({ cls: 'version-item' }).createDiv({
      text: `当前版本: 1.0.0`,
      cls: 'version-text',
    });

    div.createDiv({ cls: 'version-item' }).createDiv({
      text: `账户ID: ${this.subscription?.accountId || this.generateAccountId()}`,
      cls: 'version-text',
    });

    const statusDetail = this.getSubscriptionStatusDetail();
    const statusText = `${this.getSubscriptionStatusText()} - ${statusDetail.status}`;
    const statusDiv = div.createDiv({ cls: 'version-item' });
    
    if (statusDetail.isExpiringSoon) {
      statusDiv.createDiv({
        text: `⚠️ 订阅状态: ${statusText} (剩余${statusDetail.remainingDays}天，即将到期！)`,
        cls: 'version-text expiring-soon',
      });
    } else {
      statusDiv.createDiv({
        text: `订阅状态: ${statusText}`,
        cls: 'version-text',
      });
    }

    if (this.subscription) {
      div.createDiv({ cls: 'version-item' }).createDiv({
        text: `激活时间: ${this.formatDate(this.subscription.startTime)}`,
        cls: 'version-text',
      });

      div.createDiv({ cls: 'version-item' }).createDiv({
        text: `到期时间: ${this.formatDate(this.subscription.endTime)}`,
        cls: 'version-text',
      });

      if (statusDetail.remainingDays > 0) {
        div.createDiv({ cls: 'version-item' }).createDiv({
          text: `剩余天数: ${statusDetail.remainingDays}天`,
          cls: 'version-text',
        });
      }
    }

    div.createDiv({ cls: 'version-item' }).createDiv({
      text: `设备数: ${this.subscription?.deviceCount ?? 0}/${this.subscription?.maxDevices ?? 3}`,
      cls: 'version-text',
    });

    const trialText = this.subscription?.trialUsed ? '已使用' : '未使用';
    div.createDiv({ cls: 'version-item' }).createDiv({
      text: `试用状态: ${trialText}`,
      cls: 'version-text',
    });

    const feedbackButton = div.createEl('button', {
      cls: 'feedback-button',
      text: this.t('send_feedback'),
    });
    feedbackButton.addEventListener('click', () => {
      this.showFeedbackModal();
    });

    const privacyButton = div.createEl('button', {
      cls: 'privacy-button',
      text: this.t('privacy_policy'),
    });
    privacyButton.addEventListener('click', () => {
      this.showPrivacyPolicy();
    });

    const termsButton = div.createEl('button', {
      cls: 'terms-button',
      text: this.t('terms_of_service'),
    });
    termsButton.addEventListener('click', () => {
      this.showTermsOfService();
    });
  }

  private showFeedbackModal(): void {
    const modal = el('div', { cls: 'kg-feedback-modal' });
    applyCssText(modal, `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    `);

    const content = el('div');
    applyCssText(content, `
      background: white;
      border-radius: 16px;
      padding: 24px;
      width: 480px;
      max-width: 90vw;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    `);

    const lang = this.getCurrentLang();
    const feedbackOptions = lang === 'zh-CN' 
      ? [
          { value: 'bug', text: '🐛 Bug 报告' },
          { value: 'feature', text: '✨ 功能建议' },
          { value: 'question', text: '❓ 使用问题' },
          { value: 'other', text: '📝 其他' },
        ]
      : [
          { value: 'bug', text: '🐛 Bug Report' },
          { value: 'feature', text: '✨ Feature Request' },
          { value: 'question', text: '❓ Usage Question' },
          { value: 'other', text: '📝 Other' },
        ];

    const subjectMap: Record<string, string> = lang === 'zh-CN' 
      ? { bug: 'Bug报告', feature: '功能建议', question: '使用问题', other: '其他反馈' }
      : { bug: 'Bug Report', feature: 'Feature Request', question: 'Usage Question', other: 'Other Feedback' };

    const html = `
      <h3 style="margin: 0 0 16px; font-size: 18px;">${this.t('feedback_title')}</h3>
      <p style="margin: 0 0 16px; color: #666; font-size: 14px;">${this.t('feedback_desc')}</p>
      <div style="margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 8px; font-size: 14px; font-weight: 500;">${this.t('feedback_type')}</label>
        <select id="feedback-type" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px;">
          ${feedbackOptions.map(opt => `<option value="${opt.value}">${opt.text}</option>`).join('')}
        </select>
      </div>
      <div style="margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 8px; font-size: 14px; font-weight: 500;">${this.t('feedback_content')}</label>
        <textarea id="feedback-content" rows="4" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; resize: vertical;" placeholder="${lang === 'zh-CN' ? '请详细描述你的反馈...' : 'Please describe your feedback in detail...'}"></textarea>
      </div>
      <div style="margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 8px; font-size: 14px; font-weight: 500;">${this.t('contact_email')}</label>
        <input type="email" id="feedback-email" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px;" placeholder="your@email.com">
      </div>
      <div style="display: flex; gap: 12px; justify-content: flex-end;">
        <button id="feedback-cancel" style="padding: 10px 20px; border: 1px solid #ddd; border-radius: 8px; background: white; cursor: pointer;">${this.t('cancel')}</button>
        <button id="feedback-submit" style="padding: 10px 20px; border: none; border-radius: 8px; background: #667eea; color: white; cursor: pointer;">${this.t('send')}</button>
      </div>
    `;
    const fragment = parseHtml(html);
    content.replaceChildren();
    content.appendChild(fragment);

    modal.appendChild(content);
    document.body.appendChild(modal);

    const cancelBtn = content.querySelector('#feedback-cancel') as HTMLButtonElement;
    const submitBtn = content.querySelector('#feedback-submit') as HTMLButtonElement;

    const closeModal = () => {
      modal.remove();
    };

    cancelBtn.addEventListener('click', closeModal);

    submitBtn.addEventListener('click', () => {
      const type = (content.querySelector('#feedback-type') as HTMLSelectElement).value;
      const contentText = (content.querySelector('#feedback-content') as HTMLTextAreaElement).value;
      const email = (content.querySelector('#feedback-email') as HTMLInputElement).value;

      if (!contentText.trim()) {
        new Notice(this.t('please_enter_content'));
        return;
      }

      const subject = encodeURIComponent(`[Knowledge Graph AI] ${subjectMap[type] || type}`);
      const bodyPrefix = lang === 'zh-CN' 
        ? `类型: ${type}\n\n反馈内容:\n${contentText}\n\n邮箱: ${email || '未提供'}\n\n插件版本: 1.0.0`
        : `Type: ${type}\n\nFeedback Content:\n${contentText}\n\nEmail: ${email || 'Not provided'}\n\nPlugin Version: 1.0.0`;
      const body = encodeURIComponent(bodyPrefix);
      const mailtoUrl = `mailto:myzerool@outlook.com?subject=${subject}&body=${body}`;
      
      window.location.href = mailtoUrl;
      closeModal();
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
  }

  private showPrivacyPolicy(): void {
    const lang = this.getCurrentLang();
    const modal = el('div', { cls: 'kg-privacy-modal' });
    applyCssText(modal, `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
    `);

    const content = el('div');
    applyCssText(content, `
      background: white;
      border-radius: 16px;
      padding: 0;
      width: 800px;
      max-width: 95vw;
      max-height: 80vh;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    `);

    const header = el('div');
    applyCssText(header, `
      padding: 20px 24px;
      border-bottom: 1px solid #eee;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f8fafc;
    `);
    const headerHtml = `
      <h3 style="margin: 0; font-size: 18px;">${this.t('privacy_policy')}</h3>
      <button id="privacy-close" style="padding: 8px 16px; border: 1px solid #ddd; border-radius: 8px; background: white; cursor: pointer;">${this.t('close')}</button>
    `;
    header.replaceChildren();
    header.appendChild(parseHtml(headerHtml));

    const iframe = el('iframe');
    iframe.src = `docs/privacy-policy.${lang}.html`;
    applyCssText(iframe, `
      flex: 1;
      width: 100%;
      border: none;
      overflow: auto;
    `);

    content.appendChild(header);
    content.appendChild(iframe);
    modal.appendChild(content);
    document.body.appendChild(modal);

    const closeBtn = content.querySelector('#privacy-close') as HTMLButtonElement;
    
    const closeModal = () => {
      modal.remove();
    };

    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
  }

  private showTermsOfService(): void {
    const lang = this.getCurrentLang();
    const modal = el('div', { cls: 'kg-terms-modal' });
    applyCssText(modal, `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
    `);

    const content = el('div');
    applyCssText(content, `
      background: white;
      border-radius: 16px;
      padding: 0;
      width: 800px;
      max-width: 95vw;
      max-height: 80vh;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    `);

    const header = el('div');
    applyCssText(header, `
      padding: 20px 24px;
      border-bottom: 1px solid #eee;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f8fafc;
    `);
    const headerHtml2 = `
      <h3 style="margin: 0; font-size: 18px;">${this.t('terms_of_service')}</h3>
      <button id="terms-close" style="padding: 8px 16px; border: 1px solid #ddd; border-radius: 8px; background: white; cursor: pointer;">${this.t('close')}</button>
    `;
    header.replaceChildren();
    header.appendChild(parseHtml(headerHtml2));

    const iframe = el('iframe');
    iframe.src = `docs/terms-of-service.${lang}.html`;
    applyCssText(iframe, `
      flex: 1;
      width: 100%;
      border: none;
      overflow: auto;
    `);

    content.appendChild(header);
    content.appendChild(iframe);
    modal.appendChild(content);
    document.body.appendChild(modal);

    const closeBtn = content.querySelector('#terms-close') as HTMLButtonElement;
    
    const closeModal = () => {
      modal.remove();
    };

    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
  }

  private createSection(parent: HTMLElement, title: string, callback: () => void): void {
    const section = parent.createDiv({ cls: 'settings-section' });
    section.createDiv({ cls: 'settings-section-title', text: title });
    callback();
  }

  private createResetButton(parent: HTMLElement): void {
    const button = parent.createEl('button', {
      cls: 'reset-button',
      text: this.t('reset_default'),
    });
    
    button.addEventListener('click', () => {
      new ConfirmModal(this.plugin.app, this.t('confirm_reset'), () => {
        this.settings = { ...DEFAULT_SETTINGS };
        this.saveSettings();
        if (this.containerEl) {
          this.render(this.containerEl);
        }
      }).open();
    });
  }

  private createPromptWarning(parent: HTMLElement): void {
    const warningDiv = parent.createDiv({ cls: 'prompt-warning' });
    warningDiv.createEl('span', { text: '⚠️ ' });
    warningDiv.createEl('span', { 
      text: this.t('prompt_warning'),
      cls: 'warning-text'
    });
  }

  public render(containerEl: HTMLElement): void {
    this.loadSettings();
    this.containerEl = containerEl;
    containerEl.empty();

    const wrapper = containerEl.createDiv({ cls: 'settings-wrapper' });

    const lang = this.getCurrentLang();
    const localLabel = lang === 'zh-CN' ? '本地' : 'Local';
    const externalLabel = lang === 'zh-CN' ? '外部' : 'External';

    this.createSection(wrapper, this.t('basic_settings'), () => {
      this.createTextInput(wrapper, this.t('plugin_name'), this.settings.pluginName, (value) => {
        this.settings.pluginName = value;
        this.saveSettings();
      });

      this.createSelect(
        wrapper,
        this.t('ai_model_type'),
        this.settings.aiModelType,
        [
          { label: localLabel, value: 'local' },
          { label: externalLabel, value: 'external' },
        ],
        (value) => {
          this.settings.aiModelType = value as 'local' | 'external';
          this.saveSettings();
        },
        true
      );

      this.createSelect(
        wrapper,
        this.t('ai_provider'),
        this.settings.aiProvider,
        [
          { label: 'OpenAI', value: 'openai' },
          { label: 'Anthropic', value: 'anthropic' },
          { label: 'Google', value: 'google' },
          { label: 'SiliconFlow', value: 'siliconflow' },
        ],
        (value) => {
          this.settings.aiProvider = value as 'openai' | 'anthropic' | 'google' | 'siliconflow';
          this.saveSettings();
        },
        true
      );

      this.createTextInput(wrapper, this.t('ai_model'), this.settings.aiModel, (value) => {
        this.settings.aiModel = value;
        this.saveSettings();
      }, 'deepseek-ai/DeepSeek-R1-0528-Qwen3-8B', true);

      this.createTextInput(wrapper, this.t('api_address'), this.settings.apiAddress, (value) => {
        const error = this.validateApiAddress(value);
        if (error) {
          new Notice(error);
          return;
        }
        this.settings.apiAddress = value;
        this.saveSettings();
      }, 'http://localhost');

      this.createNumberInput(wrapper, this.t('api_port'), this.settings.apiPort, (value) => {
        const error = this.validatePort(value);
        if (error) {
          new Notice(error);
          return;
        }
        this.settings.apiPort = value;
        this.saveSettings();
      }, 1, 65535);
    });

    this.createSection(wrapper, `Pro ${this.t('external_ai_config')}`, () => {
      this.createPasswordInput(wrapper, this.t('api_key'), this.settings.apiKey, (value) => {
        const error = this.validateApiKey(value);
        if (error) {
          new Notice(error);
          return;
        }
        this.settings.apiKey = value;
        this.saveSettings();
      }, true);
    });

    this.createSection(wrapper, `Pro ${this.t('version')} - ${this.t('prompt_config')}`, () => {
      this.createPromptWarning(wrapper);
      
      this.createTextarea(wrapper, this.t('system_prompt'), this.settings.systemPrompt, (value) => {
        this.settings.systemPrompt = value;
        this.saveSettings();
      }, true);

      this.createTextarea(wrapper, this.t('entity_extract_prompt'), this.settings.entityExtractPrompt, (value) => {
        this.settings.entityExtractPrompt = value;
        this.saveSettings();
      }, true);

      this.createTextarea(wrapper, this.t('summary_generate_prompt'), this.settings.summaryGeneratePrompt, (value) => {
        this.settings.summaryGeneratePrompt = value;
        this.saveSettings();
      }, true);

      this.createTextarea(wrapper, this.t('fusion_prompt'), this.settings.fusionPrompt, (value) => {
        this.settings.fusionPrompt = value;
        this.saveSettings();
      }, true);
    });

    this.createSection(wrapper, this.t('version_info'), () => {
      this.createVersionInfo(wrapper);
    });

    const buttonSection = wrapper.createDiv({ cls: 'settings-section' });
    buttonSection.createDiv({ cls: 'settings-section-title', text: this.t('settings_management') });
    this.createResetButton(buttonSection);
  }

  public getSettings(): PluginSettings {
    return { ...this.settings };
  }

  public updateSettings(newSettings: Partial<PluginSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
  }

  public validateAllSettings(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    const apiAddressError = this.validateApiAddress(this.settings.apiAddress);
    if (apiAddressError) {
      errors.push(apiAddressError);
    }

    const portError = this.validatePort(this.settings.apiPort);
    if (portError) {
      errors.push(portError);
    }

    if (this.isPro) {
      const apiKeyError = this.validateApiKey(this.settings.apiKey);
      if (apiKeyError) {
        errors.push(apiKeyError);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export function createSettingsTab(props: SettingsTabProps): SettingsTab {
  return new SettingsTab(props);
}

export { SettingsTab as SettingsTabComponent };

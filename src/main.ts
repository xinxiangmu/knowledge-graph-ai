import { Notice, Plugin, Modal, TFile, requestUrl, Platform } from 'obsidian';
import { Entity } from './models/entity.js';
import { Relation } from './models/relation.js';
import { SigmaGraphView } from './ui/sigma-graph-view.js';
import { TimelineView } from './ui/timeline-view.js';
import { generateUniqueId, verifySignedToken } from './utils/crypto.js';
import { setPlatformInfo, getPlatform, getUserAgent } from './utils/platform.js';
import { AIModelParser } from './services/ai-parser.service.js';
import { createGraphStorageService, getGraphStorageService } from './services/graph-storage.service.js';
import { SubscriptionServiceImpl } from './services/subscription.service.js';
import { parseHtml, applyCssText, el } from './utils/dom-helper.js';
import { initLanguageConfig } from './i18n/language-config.js';

const LANG = {
  zh: {
    plugin_name: '知识图谱',
    home: '首页',
    parse: '汇总',
    timeline: '时间线',
    graph: '知识图谱',
    docs: '仪表盘',
    settings: '设置',
    free_version: '免费版',
    trial_active: '试用中',
    pro_version: 'Pro版本',
    start_trial: '开始3天试用',
    trial_notice: '💡 购买页面提供免费试用期，点击购买按钮了解详情',
    activate_pro: '激活Pro',
    document_count: '文档数',
    entity_count: '实体数',
    version: '版本',
    recent_parse: '最近解析',
    no_records: '暂无解析记录',
    parse_text: '文本解析',
    parse_desc: '粘贴要解析的文本或文档内容',
    model_selection: '服务配置',
    local_model: '本地服务',
    external_model: '云端服务',
    start_parse: '开始分析',
    enter_text: '请输入要解析的文本',
    timeline_view: '时间线',
    graph_view: '知识图谱',
    docs_list: '文档列表',
    no_data: '暂无数据',
    api_address: '服务地址',
    port: '端口',
    model_name: '服务名称',
    api_path: '接口路径',
    api_path_tip: '不同服务版本可能使用不同的接口端点，请根据实际情况调整',
    test_connection: '测试连接',
    api_type: '服务类型',
    api_type_openai: 'OpenAI兼容',
    api_type_anthropic: 'Anthropic兼容',
    api_type_ollama: 'Ollama本地',
    api_key: '访问密钥',
    api_base: '服务地址',
    save_settings: '保存设置',
    device_id: '设备ID',
    enter_code: '输入激活码',
    activate: '激活',
    copied: '已复制',
    click_to_copy: '点击复制',
    click_to_analyze: '点击"重新分析"按钮开始处理...',
    search: '搜索',
    days: '天',
    subscription_status: '订阅状态',
    expires_at: '到期时间',
    devices: '设备数',
    user_prompt: '自定义模板',
    document_parse_prompt: '解析模板',
    knowledge_prompt: '扩展模板',
    storage_directory: '存储目录',
    default_storage: '默认存储',
    custom_storage: '自定义存储',
    purchase_title: '升级到Pro',
    purchase_desc: '解锁所有高级功能，提升您的知识管理体验',
    device_id_label: '您的设备ID',
    copy_device_id: '复制设备ID',
    enter_activation_code: '输入激活码',
    activate_button: '激活',
    buy_now_button: '立即购买',
    buy_yearly_button: '年付优惠',
    free_features_title: '免费版功能',
    free_features: [
      '本地服务调用',
      '文本解析与提取',
      '时间线视图',
      '图谱浏览（只读）',
      '图谱搜索功能',
      '文档搜索功能'
    ],
    pro_features_title: 'Pro版本功能',
    pro_features: [
      'LLM服务支持',
      '自定义模板',
      '图谱搜索与跳转',
      '文档全文搜索',
      '无限文档处理',
      '优先技术支持'
    ],
    features_intro: '功能介绍',
    purchase_guide: '购买指南',
    upload_formats: '点击或拖拽上传文件',
    upload_formats_desc: '支持格式：.md, .txt, .json',
    or_upload_files: '或上传文件',
    reading_files: '读取文件中...',
    reading_file: '读取文件',
    preparing_data: '准备数据...',
    preparing_prompt: '准备配置...',
    formatting_output: '格式化输出...',
    calling_model: '处理中...',
    analyzing: '分析中...',
    generating_output: '生成输出...',
    saving: '保存中...',
    complete: '完成！',
    parse_complete: '解析完成',
    parse_error: '解析错误',
    required: '需要',
    knowledge_completion: '知识补充',
    knowledge_completion_desc: '根据最新文档关联查询并补充缺失知识',
    knowledge_model_selection: '选择服务补充知识',
    keywords: '关键词',
    radar_chart: '分类雷达图',
    refresh: '刷新',
    category_history: '人文历史',
    category_politics: '政治',
    category_economy: '经济',
    category_culture: '文化',
    category_technology: '科技',
    category_science: '科学',
    category_other: '其他',
    category_arts: '人文艺术',
    category_social: '社会科学',
    category_natural: '自然科学',
    category_applied: '应用技术',
    category_general: '综合杂项',
    search_nodes: '搜索节点',
    zoom_to_fit: '适应视图',
    entity_types: '实体类型',
    person: '人物',
    concept: '概念',
    document: '文档',
    organization: '组织',
    event: '事件',
    location: '地点',
    or_select_plan: '或选择订阅方案',
    knowledge_expansion: '知识扩展',
    knowledge_expansion_desc: '根据数据库中的文档数据进行汇总和总结，发现缺失的知识并进行补充',
    prompt_config: '模板配置',
    system_prompt: '系统模板',
    entity_extract_prompt: '实体提取模板',
    summary_generate_prompt: '摘要生成模板',
    fusion_prompt: '融合模板',
    model_query_prompt: '查询模板',
    model_query_prompt_desc: '用于知识卡片的查询功能，对词条进行详细介绍和知识延伸',
    analyze_history_docs: '历史文档解析',
    analyze_all_docs: '历史文档解析',
    analyze_all_docs_desc: '对历史所有文档进行重新解析和整理，按照最新逻辑处理',
    analyzing_all_docs: '正在解析所有历史文档...',
    analyze_complete: '全量解析完成！',
    analyze_error: '解析过程出错',
    confirm_analyze_all: '确定要对所有历史文档 (${count} 篇) 进行全量解析吗？此操作会更新图谱数据但不会删除原始文档。\n\n解析文档会放在插件管理的目录下',
    analyzing_doc: '正在解析文档',
    of: '/',
    doc: '篇',
    summary_doc: '重新分析',
    dashboard_welcome: '欢迎使用知识图谱',
    total_documents: '文档总量',
    documents_this_month: '本月文档',
    documents_last_7days: '最近 7 天',
    documents_opened_3months: '最近 3 月打开',
    documents_never_opened: '长期未打开',
    cancel: '取消',
    confirm: '确定',
    settings_saved: '设置已保存！'
  },
  en: {
    plugin_name: 'Knowledge Graph AI',
    home: 'Home',
    parse: 'Summary',
    timeline: 'Timeline',
    graph: 'Graph View',
    docs: 'Dashboard',
    settings: 'Settings',
    free_version: 'Free',
    trial_active: 'Trial',
    pro_version: 'Pro',
    start_trial: 'Start 7-Day Trial',
    trial_notice: '💡 A free trial is available on the purchase page. Click the buy button to learn more',
    activate_pro: 'Activate Pro',
    document_count: 'Documents',
    entity_count: 'Entities',
    version: 'Version',
    recent_parse: 'Recent Parses',
    no_records: 'No records',
    parse_text: 'Text Parsing',
    parse_desc: 'Paste text or document content to parse',
    model_selection: 'Service Configuration',
    local_model: 'Local Service',
    external_model: 'Cloud Service',
    start_parse: 'Start Analysis',
    enter_text: 'Enter text to parse',
    timeline_view: 'Timeline',
    graph_view: 'Knowledge Graph',
    docs_list: 'Documents',
    no_data: 'No data',
    api_address: 'Service Address',
    port: 'Port',
    model_name: 'Service Name',
    api_path: 'Endpoint Path',
    api_path_tip: 'Different service versions may use different endpoints, please adjust according to your situation',
    test_connection: 'Test Connection',
    api_type: 'Service Type',
    api_type_openai: 'OpenAI Compatible',
    api_type_anthropic: 'Anthropic Compatible',
    api_type_ollama: 'Ollama Local',
    api_key: 'API Key',
    api_base: 'Service Base',
    save_settings: 'Save Settings',
    device_id: 'Device ID',
    enter_code: 'Enter activation code',
    activate: 'Activate',
    copied: 'Copied',
    click_to_copy: 'Click to copy',
    click_to_analyze: 'Click "Analyze" button to start processing...',
    search: 'Search',
    days: 'days',
    subscription_status: 'Subscription Status',
    expires_at: 'Expires At',
    devices: 'Devices',
    user_prompt: 'Custom Template',
    document_parse_prompt: 'Parsing Template',
    knowledge_prompt: 'Expansion Template',
    storage_directory: 'Storage Directory',
    default_storage: 'Default Storage',
    custom_storage: 'Custom Storage',
    purchase_title: 'Upgrade to Pro',
    purchase_desc: 'Unlock all premium features and enhance your knowledge management experience',
    device_id_label: 'Your Device ID',
    copy_device_id: 'Copy Device ID',
    enter_activation_code: 'Enter activation code',
    activate_button: 'Activate',
    buy_now_button: 'Buy Now',
    buy_yearly_button: 'Yearly Plan',
    free_features_title: 'Free Features',
    free_features: [
      'Local Service',
      'Text Parsing & Extraction',
      'Timeline View',
      'Graph View (Read-only)',
      'Graph Search',
      'Document Search'
    ],
    pro_features_title: 'Pro Features',
    pro_features: [
      'LLM Service Support',
      'Custom Templates',
      'Graph Search & Navigation',
      'Full Document Search',
      'Unlimited Documents',
      'Priority Support'
    ],
    features_intro: 'Features',
    purchase_guide: 'Purchase Guide',
    upload_formats: 'Click or drag to upload files',
    upload_formats_desc: 'Supported: .md, .txt, .json',
    or_upload_files: 'or upload files',
    reading_files: 'Reading files...',
    reading_file: 'Reading file',
    preparing_data: 'Preparing data...',
    preparing_prompt: 'Preparing config...',
    formatting_output: 'Formatting output...',
    calling_model: 'Processing...',
    analyzing: 'Analyzing...',
    generating_output: 'Generating output...',
    saving: 'Saving...',
    complete: 'Complete!',
    parse_complete: 'Parse complete',
    parse_error: 'Parse error',
    required: 'required',
    knowledge_completion: 'Knowledge Completion',
    knowledge_completion_desc: 'Query and supplement missing knowledge',
    knowledge_model_selection: 'Select service for knowledge completion',
    keywords: 'Keywords',
    radar_chart: 'Category Radar',
    refresh: 'Refresh',
    category_history: 'History & Geography',
    category_politics: 'Politics',
    category_economy: 'Economy',
    category_culture: 'Culture',
    category_technology: 'Technology',
    category_science: 'Science',
    category_other: 'Other',
    category_arts: 'Arts',
    category_social: 'Social Sciences',
    category_natural: 'Natural Sciences',
    category_applied: 'Applied Sciences',
    category_general: 'Reference & General',
    search_nodes: 'Search Nodes',
    zoom_to_fit: 'Zoom to Fit',
    entity_types: 'Entity Types',
    person: 'Person',
    concept: 'Concept',
    document: 'Document',
    organization: 'Organization',
    event: 'Event',
    location: 'Location',
    or_select_plan: 'Or select a plan',
    knowledge_expansion: 'Knowledge Expansion',
    knowledge_expansion_desc: 'Summarize and analyze documents in the database to discover and supplement missing knowledge',
    prompt_config: 'Template Configuration',
    system_prompt: 'System Template',
    entity_extract_prompt: 'Entity Extraction Template',
    summary_generate_prompt: 'Summary Generation Template',
    fusion_prompt: 'Fusion Template',
    model_query_prompt: 'Query Template',
    model_query_prompt_desc: 'Used for knowledge card query function, providing detailed introductions and knowledge extensions for entries',
    analyze_all_docs: 'History Document Parsing',
    analyze_all_docs_desc: 'Re-analyze and reorganize all historical documents using the latest logic',
    analyzing_all_docs: 'Analyzing all historical documents...',
    analyze_complete: 'Analysis complete!',
    analyze_error: 'Analysis error',
    confirm_analyze_all: 'Are you sure you want to analyze all historical documents (${count})? This will update the graph data but will not delete original documents.\n\nParsed documents will be stored in the plugin management directory.',
    analyzing_doc: 'Analyzing document',
    of: '/',
    doc: 'docs',
    summary_doc: 'Re-analyze',
    dashboard_welcome: 'Welcome to Knowledge Graph',
    total_documents: 'Total Documents',
    documents_this_month: 'This Month',
    documents_last_7days: 'Last 7 Days',
    documents_opened_3months: 'Opened in 3 Months',
    documents_never_opened: 'Never Opened',
    cancel: 'Cancel',
    confirm: 'Confirm',
    settings_saved: 'Settings saved!'
  }
};

interface ProgressBar {
  update: (percent: number, text: string) => void;
  remove: () => void;
}

interface DocumentRecord {
  id: string;
  docId: string;
  title: string;
  filePath?: string;
  timestamp: number;
  keywords?: string[];
  categories?: Record<string, number>;
  summary?: string;
  content?: string;
}

interface PluginStateData {
  isPro: boolean;
  activationCode: string;
  deviceId: string;
  language: 'zh' | 'en';
  isChineseIP: boolean;
  documents: DocumentRecord[];
  entities: Entity[];
  relations: Relation[];
  localModel: { apiAddress: string; port: number; model: string; apiPath: string };
  externalModel: { providerType: string; apiKey: string; apiBase: string; model: string };
  promptConfig: { 
    systemPrompt: string; 
    userPromptTemplate: string; 
    knowledgePrompt: string;
    modelQueryPrompt: string;  // 问AI系统提示词
  };
  storageDirectory: string;
  useCustomStorage: boolean;
  expiresAt: number | null;
  lastVerifiedAt: number | null;
  categories: Record<string, number>;
  selectedParseModel: 'local' | 'external';
  preferredModel: 'local' | 'external';
  lastKnowledgeUpdate: number;
  cachedKnowledgeItems: Array<{name: string; category: string; summary: string}>;
  isKnowledgeExpanding: boolean;  // 知识扩展后台任务状态
  apiBaseUrl: string;
}

class MainModal extends Modal {
  plugin: KnowledgeGraphPlugin;
  currentTab: string;
  private graphView: SigmaGraphView | null = null;

  constructor(plugin: KnowledgeGraphPlugin) {
    super(plugin.app);
    this.plugin = plugin;
    this.currentTab = 'home';
  }

  t(key: string): string {
    return LANG[this.plugin.getState().language][key] || key;
  }

  getDocumentCountDisplay(count: number): string {
    if (count >= 300) {
      return `${count} <span style="font-size:24px;vertical-align:middle;">🏆</span>`;
    } else if (count >= 200) {
      return `${count} <span style="font-size:24px;vertical-align:middle;">🥈</span>`;
    } else if (count >= 100) {
      return `${count} <span style="font-size:24px;vertical-align:middle;">🥇</span>`;
    }
    return count.toString();
  }

  onOpen() {
    this.modalEl.addClass('kg-modal-large');
    this.render();
  }

  render() {
    const contentHtml = `
      <style>
        /* ==================== 全局容器 - macOS风格 ==================== */
        .kg-container { 
          display: flex; 
          flex-direction: column; 
          height: 100%; 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
          background: linear-gradient(135deg, #f5f7fa 0%, #e4e9f0 100%);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 20px 60px -12px rgba(0, 0, 0, 0.15);
        }

        /* ==================== 头部设计 - macOS风格 ==================== */
        .kg-header { 
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          padding: 16px 24px; 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          color: #1a1a1a;
          position: relative;
          z-index: 10;
          border-bottom: 1px solid rgba(0,0,0,0.08);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }
        .kg-header h1 { 
          margin: 0; 
          font-size: 20px; 
          font-weight: 600;
          letter-spacing: -0.3px;
          display: flex;
          align-items: center;
          gap: 8px;
          white-space: normal;
          word-wrap: break-word;
          max-width: 300px;
        }
        .kg-header h1 span {
          font-size: 24px;
        }
        .kg-header-right { 
          display: flex; 
          align-items: center; 
          gap: 12px; 
        }
        .kg-lang-btn { 
          padding: 6px 14px; 
          background: #ffffff; 
          border: 1px solid #e5e7eb; 
          border-radius: 8px; 
          cursor: pointer; 
          font-size: 13px; 
          font-weight: 500;
          transition: all 0.2s ease; 
          color: #374151;
          pointer-events: auto !important;
          z-index: 1000 !important;
          position: relative !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
        .kg-lang-btn:hover { 
          background: #f3f4f6; 
          border-color: #d1d5db;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        .kg-lang-btn:active { 
          transform: translateY(0);
        }
        .kg-status { 
          padding: 6px 14px; 
          border-radius: 20px; 
          font-size: 12px; 
          font-weight: 600; 
        }
        .kg-status.trial { 
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          color: #92400e;
          border: 1px solid #fcd34d;
        }
        .kg-status.pro { 
          background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
          color: #065f46;
          border: 1px solid #34d399;
        }
        .kg-status.free { 
          background: #f3f4f6;
          color: #4b5563;
          border: 1px solid #d1d5db;
        }

        /* ==================== 导航栏设计 - macOS风格 ==================== */
        .kg-nav { 
          display: flex; 
          background: #ffffff;
          padding: 0 16px 0 4px; 
          gap: 4px;
          border-bottom: 1px solid rgba(0,0,0,0.06);
          margin-left: -8px;
        }
        .kg-nav-btn { 
          padding: 10px 20px; 
          border: none; 
          background: transparent; 
          border-radius: 8px; 
          cursor: pointer; 
          font-size: 13px; 
          font-weight: 500;
          transition: all 0.2s ease; 
          color: #6b7280;
          position: relative;
          overflow: hidden;
        }
        .kg-nav-btn::before {
          content: '';
          position: absolute;
          bottom: 0;
          left: 50%;
          width: 0;
          height: 2px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          transition: width 0.3s ease;
          transform: translateX(-50%);
        }
        .kg-nav-btn:hover {
          background: #f9fafb;
          color: #4b5563;
        }
        .kg-nav-btn.active {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
          color: #4f46e5;
          font-weight: 600;
        }
        .kg-nav-btn.active::before {
          width: 40%;
        }
        .kg-nav-btn.active:hover {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.15), rgba(118, 75, 162, 0.15));
        }
        .kg-nav-btn.active::before {
          width: 60%;
        }

        /* ==================== 主体内容 - macOS风格 ==================== */
        .kg-body { 
          flex: 1; 
          padding: 24px; 
          overflow-y: auto; 
          background: transparent;
        }

        /* ==================== 统计卡片设计 - macOS风格 ==================== */
        .kg-stats { 
          display: grid; 
          grid-template-columns: repeat(5, 1fr); 
          gap: 16px; 
          margin-bottom: 24px;
        }
        .kg-stat-card-new {
          background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
          padding: 20px;
          border-radius: 16px;
          text-align: center;
          border: 1px solid rgba(0,0,0,0.06);
          box-shadow: 0 4px 20px -6px rgba(0, 0, 0, 0.1);
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }
        .kg-stat-card-new::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
        }
        .kg-stat-card-new:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px -4px rgba(0, 0, 0, 0.1), 0 4px 8px -2px rgba(0, 0, 0, 0.05);
        }
        .kg-stat-card-new.stat-blue::before { background: linear-gradient(90deg, #3b82f6, #1d4ed8); }
        .kg-stat-card-new.stat-green::before { background: linear-gradient(90deg, #10b981, #059669); }
        .kg-stat-card-new.stat-purple::before { background: linear-gradient(90deg, #8b5cf6, #7c3aed); }
        .kg-stat-card-new.stat-orange::before { background: linear-gradient(90deg, #f59e0b, #d97706); }
        .kg-stat-card-new.stat-pink::before { background: linear-gradient(90deg, #ec4899, #db2777); }
        .kg-stat-icon { font-size: 28px; margin-bottom: 8px; }
        .kg-stat-value-new { 
          font-size: 36px; 
          font-weight: 700; 
          background: linear-gradient(135deg, #1e293b, #475569);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .kg-stat-label-new { 
          font-size: 12px; 
          color: #94a3b8; 
          margin-top: 4px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        /* 老样式保持向后兼容 */
        .kg-stat-card { 
          background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%); 
          padding: 20px; 
          border-radius: 16px; 
          text-align: center; 
          border: 1px solid rgba(0,0,0,0.06);
          box-shadow: 0 4px 20px -6px rgba(0, 0, 0, 0.1);
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }
        .kg-stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px -4px rgba(0, 0, 0, 0.1), 0 4px 8px -2px rgba(0, 0, 0, 0.05);
        }
        .kg-stat-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #667eea, #764ba2);
        }
        .kg-stat-icon { font-size: 24px; margin-bottom: 8px; }
        .kg-stat-value { 
          font-size: 28px; 
          font-weight: 700; 
          color: #1e293b;
          margin-bottom: 4px;
        }
        .kg-stat-label { 
          font-size: 11px; 
          color: #64748b; 
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* ==================== 通用组件 - macOS风格 ==================== */
        .kg-section { margin-bottom: 24px; }
        .kg-section h3 { 
          margin: 0 0 16px; 
          font-size: 17px; 
          color: #1e293b; 
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(0,0,0,0.08);
        }

        /* ==================== 功能卡片设计 - macOS风格 ==================== */
        .kg-features-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .kg-feature-box { 
          background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%); 
          padding: 24px; 
          border-radius: 16px; 
          border: 1px solid rgba(0,0,0,0.06);
          box-shadow: 0 4px 20px -6px rgba(0, 0, 0, 0.1);
          transition: all 0.2s ease;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }
        .kg-feature-box:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px -4px rgba(0, 0, 0, 0.12), 0 6px 8px -2px rgba(0, 0, 0, 0.06);
        }
        .kg-feature-box h4 { 
          margin: 0 0 12px; 
          font-size: 15px; 
          font-weight: 600;
          color: #1e293b;
        }
        .kg-feature-box ul { margin: 0; padding: 0 0 0 20px; }
        .kg-feature-box li { 
          font-size: 13px; 
          margin-bottom: 8px; 
          color: #64748b;
          line-height: 1.6;
        }

        /* ==================== 购买卡片设计 - macOS风格 ==================== */
        .kg-purchase-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .kg-purchase-box { 
          background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%); 
          padding: 24px; 
          border-radius: 16px; 
          border: 2px solid rgba(0,0,0,0.06); 
          text-align: center;
          transition: all 0.2s ease;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }
        .kg-purchase-box:hover {
          border-color: rgba(102, 126, 234, 0.3);
          box-shadow: 0 12px 32px -6px rgba(102, 126, 234, 0.18), 0 6px 12px -4px rgba(0, 0, 0, 0.08);
          transform: translateY(-2px);
        }
        .kg-purchase-box h4 { margin: 0 0 10px; font-size: 16px; font-weight: 600; color: #1e293b; }
        .kg-purchase-box p { margin: 0 0 16px; font-size: 13px; color: #64748b; }
        .kg-purchase-box code { 
          display: block; 
          background: linear-gradient(135deg, #f8fafc, #f1f5f9); 
          padding: 12px; 
          border-radius: 10px; 
          font-size: 12px; 
          color: #475569; 
          margin-bottom: 16px; 
          word-break: break-all;
          font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
          border: 1px solid rgba(0,0,0,0.06);
        }

        /* ==================== 按钮设计 - macOS风格 ==================== */
        .kg-actions { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
        .kg-trial-notice {
          background: linear-gradient(135deg, rgba(102,126,234,0.08) 0%, rgba(118,75,162,0.08) 100%);
          border: 1px solid rgba(102,126,234,0.2);
          border-radius: 10px;
          padding: 12px 16px;
          margin-bottom: 24px;
          font-size: 13px;
          color: #475569;
          line-height: 1.5;
        }
        .kg-btn { 
          padding: 10px 22px; 
          border: none; 
          border-radius: 10px; 
          cursor: pointer; 
          font-size: 14px; 
          font-weight: 600; 
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .kg-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          transition: left 0.3s ease;
        }
        .kg-btn:hover::before {
          left: 100%;
        }
        .kg-btn.primary { 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
          color: white;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }
        .kg-btn.primary:hover { 
          transform: translateY(-2px); 
          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.5);
        }
        .kg-btn.secondary { 
          background: #ffffff;
          color: #475569;
          border: 1px solid #e2e8f0;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }
        .kg-btn.secondary:hover { 
          background: #f8fafc;
          border-color: #cbd5e1;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        .kg-btn.large { padding: 16px 32px; font-size: 15px; }
        .kg-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none !important;
        }

        /* ==================== 文档列表设计 - macOS风格 ==================== */
        .kg-recent { margin-top: 24px 0 0 0; }
        .kg-recent h3 { margin: 0 0 14px; font-size: 15px; color: #1e293b; font-weight: 600; }
        .kg-doc-item { 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          padding: 12px 16px; 
          background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%); 
          border-radius: 10px; 
          margin-bottom: 8px; 
          cursor: pointer; 
          transition: all 0.2s ease;
          border: 1px solid rgba(0,0,0,0.06);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }
        .kg-doc-item:hover { 
          background: #f8fafc; 
          transform: translateX(4px);
          border-color: rgba(102, 126, 234, 0.2);
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }
        .kg-doc-title { font-weight: 500; color: #1e293b; }
        .kg-doc-meta { color: #94a3b8; font-size: 12px; }

        /* ==================== 表单元素设计 - macOS风格 ==================== */
        .kg-textarea { 
          width: 100%; 
          height: 180px; 
          padding: 16px; 
          border: 1px solid #e2e8f0; 
          border-radius: 12px; 
          font-size: 14px; 
          resize: none; 
          box-sizing: border-box; 
          font-family: inherit;
          background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
          transition: all 0.2s ease;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }
        .kg-textarea:focus { 
          outline: none; 
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
          background: #ffffff;
        }

        /* ==================== 设置面板设计 - macOS风格 ==================== */
        .kg-setting-section { margin-bottom: 28px; padding-bottom: 24px; border-bottom: 1px solid #e2e8f0; }
        .kg-setting-section:last-child { border-bottom: none; }
        .kg-setting-section h4 { margin: 0 0 16px; font-size: 16px; color: #1e293b; font-weight: 600; padding-bottom: 8px; border-bottom: 1px solid rgba(0,0,0,0.06); }
        .kg-setting-row { display: flex; margin-bottom: 14px; align-items: center; gap: 16px; }
        .kg-setting-row label { min-width: 120px; font-size: 14px; color: #475569; flex-shrink: 0; font-weight: 500; }
        .kg-setting-row input { 
          flex: 1; 
          padding: 12px 16px; 
          border: 1px solid #e2e8f0; 
          border-radius: 10px; 
          font-size: 14px; 
          min-width: 200px; 
          background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
          transition: all 0.2s ease;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }
        .kg-setting-row input:focus { 
          outline: none; 
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
          background: #ffffff;
        }
        .kg-setting-row select { 
          flex: 1; 
          padding: 12px 36px 12px 16px; 
          border: 1px solid #e2e8f0; 
          border-radius: 10px; 
          font-size: 14px; 
          min-width: 200px; 
          background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%); 
          cursor: pointer;
          transition: all 0.2s ease;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          appearance: none;
          -webkit-appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
          background-size: 14px;
          box-sizing: border-box;
          color: #1f2937;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .kg-setting-row select option { 
          color: #1f2937;
          background: white;
          padding: 8px;
        }
        .kg-setting-row select:focus { 
          outline: none; 
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
        }
        .kg-setting-row textarea { 
          width: 100%; 
          padding: 14px 16px; 
          border: 1px solid #e2e8f0; 
          border-radius: 10px; 
          font-size: 14px; 
          resize: vertical; 
          box-sizing: border-box; 
          font-family: inherit;
          background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
          transition: all 0.2s ease;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }
        .kg-setting-row textarea:focus { 
          outline: none; 
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
          background: #ffffff;
        }
        .kg-copy-btn { 
          margin-left: 8px; 
          padding: 8px 14px; 
          background: linear-gradient(135deg, #667eea, #764ba2); 
          color: white; 
          border: none; 
          border-radius: 8px; 
          cursor: pointer; 
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s ease;
        }
        .kg-copy-btn:hover { 
          opacity: 0.9;
          transform: scale(1.02);
        }
        .kg-device-id { 
          font-family: 'SF Mono', 'Monaco', monospace; 
          font-size: 11px; 
          background: #f1f5f9; 
          padding: 8px 12px; 
          border-radius: 8px; 
          color: #475569;
        }

        /* ==================== 订阅信息设计 ==================== */
        .kg-subscription-info { 
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); 
          padding: 20px; 
          border-radius: 12px;
          border: 1px solid #fcd34d;
        }
        .kg-subscription-info p { margin: 8px 0; font-size: 13px; color: #92400e; }

        /* ==================== 空状态设计 ==================== */
        .kg-empty-msg { 
          text-align: center; 
          padding: 60px 20px; 
          color: #94a3b8; 
          font-size: 14px;
        }

        /* ==================== Dashboard 布局 ==================== */
        .kg-docs-grid { display: grid; grid-template-rows: auto auto; gap: 20px; overflow: hidden !important; max-width: 100% !important; }
        
        /* ==================== 知识扩展设计 ==================== */
        .kg-knowledge-box { 
          background: white; 
          padding: 24px; 
          border-radius: 16px; 
          border: 1px solid rgba(0,0,0,0.05);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
          transition: all 0.3s ease;
        }
        .kg-knowledge-box:hover {
          box-shadow: 0 8px 16px -4px rgba(0, 0, 0, 0.08);
        }
        .kg-knowledge-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .kg-knowledge-header h4 { 
          margin: 0; 
          font-size: 17px; 
          font-weight: 600;
          color: #1e293b;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .kg-knowledge-output { 
          background: linear-gradient(135deg, #f8fafc, #f1f5f9); 
          padding: 20px; 
          border-radius: 12px; 
          border: 1px solid #e2e8f0; 
          min-height: 200px; 
          white-space: pre-wrap;
          color: #475569;
          font-size: 14px;
          line-height: 1.6;
        }

        /* ==================== 关键词设计 ==================== */
        .kg-keywords-box { 
          background: white; 
          padding: 24px; 
          border-radius: 16px; 
          border: 1px solid rgba(0,0,0,0.05);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
          transition: all 0.3s ease;
        }
        .kg-keywords-box:hover {
          box-shadow: 0 8px 16px -4px rgba(0, 0, 0, 0.08);
        }
        .kg-keywords-box h4 { 
          margin: 0 0 16px; 
          font-size: 16px; 
          font-weight: 600;
          color: #1e293b;
        }
        .kg-keywords-list { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px; }
        .kg-keyword-tag { 
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%); 
          padding: 8px 16px; 
          border-radius: 20px; 
          font-size: 13px; 
          color: #667eea;
          font-weight: 500;
          transition: all 0.2s ease;
          border: 1px solid rgba(102, 126, 234, 0.2);
        }
        .kg-keyword-tag:hover {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%);
          transform: translateY(-2px);
        }

        /* ==================== 雷达图设计 ==================== */
        .kg-radar-box { 
          background: white; 
          padding: 16px; 
          border-radius: 16px; 
          border: 1px solid rgba(0,0,0,0.05);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
          transition: all 0.3s ease;
          overflow: hidden !important;
          max-width: 100% !important;
        }
        .kg-radar-box:hover {
          box-shadow: 0 8px 16px -4px rgba(0, 0, 0, 0.08);
        }
        .kg-radar-box h4 { 
          margin: 0 0 16px; 
          font-size: 16px; 
          font-weight: 600;
          color: #1e293b;
        }
        .kg-radar-container { width: 100%; height: 360px; display: flex; justify-content: center; align-items: center; position: relative; overflow: hidden; }
        .kg-radar-svg { display: block !important; width: 100% !important; height: 100% !important; max-width: 360px !important; max-height: 360px !important; overflow: visible; }
        .kg-radar-tooltip { cursor: help; opacity: 0.8; }
        .kg-radar-tooltip:hover { opacity: 1; }
        .kg-radar-svg text { pointer-events: none; }

        /* ==================== 双列布局 ==================== */
        .kg-row-2cols { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; overflow: hidden !important; max-width: 100% !important; }

        /* ==================== 模型选择设计 ==================== */
        .kg-model-option {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .kg-model-option:hover {
          border-color: #cbd5e1;
          background: #f8fafc;
        }
        .kg-model-option.selected {
          border-color: #667eea;
          background: rgba(102, 126, 234, 0.05);
        }
        .kg-model-option input[type="radio"] {
          accent-color: #667eea;
        }
        .kg-model-label { font-size: 14px; font-weight: 500; }
        .kg-model-badge {
          font-size: 10px;
          padding: 2px 8px;
          background: linear-gradient(135deg, #fcd34d, #f59e0b);
          color: #78350f;
          border-radius: 10px;
          font-weight: 600;
        }

        /* ==================== Tooltip 样式 ==================== */
        .kg-tooltip { position: relative; display: inline-block; }
        .kg-tooltip .kg-tooltip-text { 
          visibility: hidden; 
          width: 240px; 
          background-color: rgba(30, 41, 59, 0.95); 
          color: #fff; 
          text-align: left; 
          border-radius: 10px; 
          padding: 12px 14px; 
          font-size: 13px; 
          line-height: 1.5; 
          position: absolute; 
          z-index: 1000; 
          bottom: 125%; 
          left: 50%; 
          margin-left: -120px; 
          opacity: 0; 
          transition: opacity 0.2s, transform 0.2s; 
          pointer-events: none; 
          box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        }
        .kg-tooltip .kg-tooltip-text::after { 
          content: ""; 
          position: absolute; 
          top: 100%; 
          left: 50%; 
          margin-left: -6px; 
          border-width: 6px; 
          border-style: solid; 
          border-color: rgba(30, 41, 59, 0.95) transparent transparent transparent; 
        }
        .kg-tooltip:hover .kg-tooltip-text { 
          visibility: visible; 
          opacity: 1;
          transform: translateY(-4px);
        }
        .kg-tooltip-icon { 
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px; 
          height: 18px; 
          background: linear-gradient(135deg, #667eea, #764ba2); 
          color: white; 
          border-radius: 50%; 
          text-align: center; 
          line-height: 18px; 
          font-size: 11px; 
          cursor: pointer; 
          margin-left: 6px;
          font-weight: 600;
        }
        .kg-setting-row-label { display: flex; align-items: center; gap: 6px; }
        .kg-api-type-select { 
          min-width: 180px; 
          padding: 6px 12px; 
          border: 1px solid #e2e8f0; 
          border-radius: 6px; 
          font-size: 13px; 
          background: white; 
          cursor: pointer;
          transition: all 0.3s ease;
          width: auto;
        }
        .kg-api-type-select option {
          padding: 8px 12px;
          font-size: 13px;
          white-space: nowrap;
        }
        .kg-api-type-select:focus { 
          outline: none; 
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        /* ==================== 进度条设计 ==================== */
        .kg-progress-container { 
          position: fixed; 
          top: 50%; 
          left: 50%; 
          transform: translate(-50%, -50%); 
          z-index: 1000; 
          background: white; 
          padding: 28px; 
          border-radius: 16px; 
          box-shadow: 0 20px 60px rgba(0,0,0,0.25); 
          min-width: 320px;
        }
        .kg-progress-bar { 
          height: 8px; 
          background: #f1f5f9; 
          border-radius: 4px; 
          overflow: hidden; 
          margin-bottom: 14px;
        }
        .kg-progress-fill { 
          height: 100%; 
          background: linear-gradient(90deg, #667eea, #764ba2); 
          transition: width 0.3s ease;
          border-radius: 4px;
        }
        .kg-progress-text { 
          text-align: center; 
          font-size: 14px; 
          color: #64748b;
          font-weight: 500;
        }

        /* ==================== 汇总行设计 ==================== */
        .kg-summary-row-secondary {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 20px;
          background: white;
          border-radius: 12px;
          border: 1px solid rgba(0,0,0,0.05);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }

        /* ==================== 词云容器 ==================== */
        .kg-wordcloud-container {
          margin-top: 12px;
          min-height: 120px;
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
        }

        /* ==================== 暗黑模式支持 ==================== */
        .theme-dark .kg-container { 
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
        }
        .theme-dark .kg-header { 
          background: linear-gradient(135deg, #1e1e2e 0%, #2d2d44 50%, #1e1e2e 100%); 
          border-bottom-color: rgba(255,255,255,0.05);
        }
        .theme-dark .kg-nav { 
          background: rgba(30, 41, 59, 0.8);
          border-bottom-color: rgba(255,255,255,0.05);
        }
        .theme-dark .kg-nav-btn { 
          color: #94a3b8;
        }
        .theme-dark .kg-nav-btn:hover:not(.active) { 
          background: rgba(255,255,255,0.05);
          color: #cbd5e1;
        }
        .theme-dark .kg-nav-btn.active { 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
        }
        .theme-dark .kg-body { 
          background: transparent;
        }
        .theme-dark .kg-stat-card-new {
          background: #1e293b;
          border-color: rgba(255,255,255,0.05);
        }
        .theme-dark .kg-stat-card {
          background: #1e293b;
          border-color: rgba(255,255,255,0.05);
        }
        .theme-dark .kg-stat-card:hover {
          box-shadow: 0 12px 24px -4px rgba(0, 0, 0, 0.3), 0 4px 8px -2px rgba(0, 0, 0, 0.2);
        }
        .theme-dark .kg-stat-value {
          color: #f1f5f9;
        }
        .theme-dark .kg-stat-label {
          color: #94a3b8;
        }
        .theme-dark .kg-stat-value-new {
          background: linear-gradient(135deg, #e2e8f0, #f1f5f9);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .theme-dark .kg-stat-label-new { 
          color: #64748b;
        }
        .theme-dark .kg-section h3 { 
          color: #f1f5f9;
        }
        .theme-dark .kg-feature-box { 
          background: #1e293b; 
          border-color: rgba(255,255,255,0.05);
        }
        .theme-dark .kg-feature-box h4 { 
          color: #f1f5f9;
        }
        .theme-dark .kg-feature-box li { 
          color: #94a3b8;
        }
        .theme-dark .kg-purchase-box { 
          background: #1e293b; 
          border-color: rgba(255,255,255,0.05);
        }
        .theme-dark .kg-purchase-box h4 { 
          color: #f1f5f9;
        }
        .theme-dark .kg-purchase-box p { 
          color: #94a3b8;
        }
        .theme-dark .kg-purchase-box code { 
          background: #0f172a; 
          color: #e2e8f0; 
          border-color: rgba(255,255,255,0.1);
        }
        .theme-dark .kg-btn.secondary { 
          background: #334155; 
          color: #e2e8f0;
          border-color: rgba(255,255,255,0.1);
        }
        .theme-dark .kg-btn.secondary:hover { 
          background: #475569;
          border-color: rgba(255,255,255,0.2);
        }
        .theme-dark .kg-trial-notice {
          background: linear-gradient(135deg, rgba(102,126,234,0.15) 0%, rgba(118,75,162,0.15) 100%);
          border-color: rgba(102,126,234,0.3);
          color: #cbd5e1;
        }
        .theme-dark .kg-recent h3 { 
          color: #f1f5f9;
        }
        .theme-dark .kg-doc-item { 
          background: #1e293b; 
          border-color: rgba(255,255,255,0.05);
        }
        .theme-dark .kg-doc-item:hover { 
          background: #334155;
          border-color: rgba(102, 126, 234, 0.3);
        }
        .theme-dark .kg-doc-title { 
          color: #f1f5f9;
        }
        .theme-dark .kg-doc-meta { 
          color: #64748b;
        }
        .theme-dark .kg-textarea { 
          background: #1e293b; 
          border-color: rgba(255,255,255,0.1); 
          color: #e2e8f0;
        }
        .theme-dark .kg-textarea:focus {
          border-color: #667eea;
        }
        .theme-dark .kg-setting-section { 
          border-bottom-color: rgba(255,255,255,0.05);
        }
        .theme-dark .kg-setting-section h4 { 
          color: #f1f5f9;
        }
        .theme-dark .kg-setting-row label { 
          color: #94a3b8;
        }
        .theme-dark .kg-setting-row input, 
        .theme-dark .kg-setting-row textarea { 
          background: #1e293b; 
          border-color: rgba(255,255,255,0.1); 
          color: #e2e8f0;
        }
        .theme-dark .kg-setting-row select { 
          background: #1e293b; 
          border-color: rgba(255,255,255,0.1); 
          color: #e2e8f0;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
          background-size: 14px;
        }
        .theme-dark .kg-setting-row select option {
          background: #1e293b;
          color: #e2e8f0;
        }
        .theme-dark .kg-setting-row input:focus,
        .theme-dark .kg-setting-row select:focus,
        .theme-dark .kg-setting-row textarea:focus {
          border-color: #667eea;
        }
        .theme-dark .kg-device-id { 
          background: #0f172a; 
          color: #e2e8f0;
        }
        .theme-dark .kg-subscription-info { 
          background: linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(245,158,11,0.05) 100%); 
          border-color: rgba(245,158,11,0.3);
        }
        .theme-dark .kg-subscription-info p { 
          color: #fbbf24;
        }
        .theme-dark .kg-empty-msg { 
          color: #64748b;
        }
        .theme-dark .kg-knowledge-box { 
          background: #1e293b; 
          border-color: rgba(255,255,255,0.05);
        }
        .theme-dark .kg-knowledge-header h4 { 
          color: #f1f5f9;
        }
        .theme-dark .kg-knowledge-output { 
          background: #0f172a; 
          border-color: rgba(255,255,255,0.1);
          color: #cbd5e1;
        }
        .theme-dark .kg-keywords-box { 
          background: #1e293b; 
          border-color: rgba(255,255,255,0.05);
        }
        .theme-dark .kg-keywords-box h4 {
          color: #f1f5f9;
        }
        .theme-dark .kg-keyword-tag { 
          background: rgba(102, 126, 234, 0.15); 
          color: #a5b4fc;
          border-color: rgba(102, 126, 234, 0.3);
        }
        .theme-dark .kg-keyword-tag:hover {
          background: rgba(102, 126, 234, 0.25);
        }
        .theme-dark .kg-radar-box { 
          background: #1e293b; 
          border-color: rgba(255,255,255,0.05);
        }
        .theme-dark .kg-radar-box h4 {
          color: #f1f5f9;
        }
        .theme-dark .kg-model-option {
          background: #1e293b;
          border-color: rgba(255,255,255,0.1);
        }
        .theme-dark .kg-model-option:hover {
          border-color: rgba(255,255,255,0.2);
          background: #334155;
        }
        .theme-dark .kg-model-option.selected {
          border-color: #667eea;
          background: rgba(102, 126, 234, 0.15);
        }
        .theme-dark .kg-summary-row-secondary {
          background: #1e293b;
          border-color: rgba(255,255,255,0.05);
        }
        .theme-dark .kg-wordcloud-container {
          background: transparent;
        }
        .theme-dark .kg-progress-container {
          background: #1e293b;
          border-color: rgba(255,255,255,0.1);
        }
        .theme-dark .kg-progress-bar {
          background: #334155;
        }
      </style>

      <div class="kg-container">
        <div class="kg-header">
          <h1>🧠 ${this.t('plugin_name')}</h1>
          <div class="kg-header-right">
            <button id="langBtn" class="kg-lang-btn">
              ${this.plugin.getState().language === 'zh' ? 'EN' : '中文'}
            </button>
            <div class="kg-status kg-status-${this.getStatusClass()}">${this.getStatusText()}</div>
          </div>
        </div>
        
        <div class="kg-nav">
          <button class="kg-nav-btn ${this.currentTab === 'home' ? 'active' : ''}" id="nav-home">🏠 ${this.t('home')}</button>
          <button class="kg-nav-btn ${this.currentTab === 'parse' ? 'active' : ''}" id="nav-parse">📝 ${this.t('parse')}</button>
          <button class="kg-nav-btn ${this.currentTab === 'timeline' ? 'active' : ''}" id="nav-timeline">📅 ${this.t('timeline')}</button>
          <button class="kg-nav-btn ${this.currentTab === 'graph' ? 'active' : ''}" id="nav-graph">🕸️ ${this.t('graph')}</button>
          <button class="kg-nav-btn ${this.currentTab === 'docs' ? 'active' : ''}" id="nav-docs">📄 ${this.t('docs')}</button>
          <button class="kg-nav-btn ${this.currentTab === 'settings' ? 'active' : ''}" id="nav-settings">⚙️ ${this.t('settings')}</button>
        </div>
        
        <div class="kg-body" id="kgBody"></div>
      </div>
    `;
    this.contentEl.replaceChildren();
    this.contentEl.appendChild(parseHtml(contentHtml));

    
    // ===== 语言切换事件监听（事件委托方案）=====
    
    // 获取头部容器
    const headerRight = this.contentEl.querySelector('.kg-header-right') as unknown as HTMLElement;
    
    // 创建语言切换处理函数（独立函数，用于正确移除）
    const handleLangClick = async (e: MouseEvent) => {
      const target = e.target as unknown as HTMLElement;
      
      // 方案1：检查是否点击了语言按钮或其子元素
      let langBtn = target.closest('#langBtn') as unknown as HTMLButtonElement;
      
      // 方案2：如果方案1失败，检查点击坐标是否在按钮范围内
      if (!langBtn) {
        const potentialBtn = this.contentEl.querySelector('#langBtn') as unknown as HTMLButtonElement;
        if (potentialBtn) {
          const rect = potentialBtn.getBoundingClientRect();
          if (e.clientX >= rect.left && e.clientX <= rect.right &&
              e.clientY >= rect.top && e.clientY <= rect.bottom) {
            langBtn = potentialBtn;
          }
        }
      }
      
      if (!langBtn) return;
      
      e.stopPropagation();
      e.preventDefault();
      
      try {
        if (!this.plugin) {
          console.error('🌍 [langBtn click] ❌ 插件实例不存在！');
          return;
        }
        
        const currentState = this.plugin.getState();
        const lang = currentState.language;
        const newLang = lang === 'zh' ? 'en' : 'zh';
        
        await this.plugin.setLanguage(newLang);
        
        // 验证翻译是否生效
        
        // 检查 LANG 对象是否包含该语言
        
        // 重新渲染
        this.render();
      } catch (error) {
        console.error('🌍 [langBtn click] ❌ 语言切换失败:', error);
        console.error('🌍 [langBtn click] ❌ 错误堆栈:', (error as Error).stack);
      }
    };
    
    // 使用事件委托绑定到父容器
    if (headerRight) {
      // 先移除旧的监听器
      headerRight.removeEventListener('click', handleLangClick);
      headerRight.addEventListener('click', handleLangClick);
    } else {
      console.warn('🔧 [语言切换] ⚠️ 未找到 .kg-header-right');
    }
    
    // ===== 添加测试函数 =====
    // 在控制台调用 window.__testLangBtnClick() 可模拟点击
    (window as any).__testLangBtnClick = () => {
      const langBtn = this.contentEl.querySelector('#langBtn');
      if (langBtn) {
        // 创建并派发点击事件
        const event = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window
        });
        langBtn.dispatchEvent(event);
      } else {
        console.error('🧪 [测试] ❌ 未找到语言按钮');
      }
    };
    
    // ===== 事件监听方案结束 =====
    
    this.setupNavListeners();
    this.initKnowledgeCardFunctions();
    this.renderBody();
  }

  getStatusClass(): string {
    const state = this.plugin.getState();
    if (state.isPro) return 'pro';
    if (this.plugin.isTrialActive()) return 'trial';
    return 'free';
  }

  getStatusText(): string {
    const state = this.plugin.getState();
    if (state.isPro) return `✅ ${this.t('pro_version')}`;
    if (this.plugin.isTrialActive()) {
      const remainingDays = this.plugin.subscriptionService?.getTrialDaysRemaining() ?? 0;
      return `⏳ ${this.t('trial_active')} (${remainingDays}${this.t('days')})`;
    }
    return `🔒 ${this.t('free_version')}`;
  }

  setupNavListeners() {
    this.contentEl.querySelectorAll('.kg-nav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as unknown as HTMLElement;
        const id = target.id.replace('nav-', '');
        this.currentTab = id;
        this.render();
      });
    });
  }

  private setupLangBtnListener() {
    
    // 保存插件引用
    const plugin = this.plugin;
    const modal = this;
    
    
    // 1. 尝试从contentEl找按钮
    let langBtn = this.contentEl.querySelector('#langBtn') as unknown as HTMLButtonElement;
    
    // 2. 如果没找到，尝试从document找
    if (!langBtn) {
      langBtn = document.querySelector('#langBtn') as unknown as HTMLButtonElement;
    }
    
    
    
    // ===== 定义语言切换函数 =====
    const handleLangSwitch = async (event: Event) => {
      
      // 注意：不调用 preventDefault/stopPropagation，让 click 事件代理处理
      // click 事件代理会调用 stopPropagation，但 handleLangSwitch 在冒泡阶段执行
      
      try {
        if (!plugin) {
          console.error('🌍 [handleLangSwitch] ❌ 插件实例不存在！');
          return;
        }
        
        const currentState = plugin.getState();
        const lang = currentState.language;
        const newLang = lang === 'zh' ? 'en' : 'zh';
        
        
        // 设置新语言
        await plugin.setLanguage(newLang);
        
        // 重新渲染界面
        modal.render();
      } catch (error) {
        console.error('🌍 [handleLangSwitch] ❌ 语言切换失败:', error);
        console.error('🌍 [handleLangSwitch] ❌ 错误堆栈:', (error as Error).stack);
      }
    };
    
    // ===== 设置 window 全局函数 =====
    (window as any).__kgLangSwitch = handleLangSwitch;
    
    // ===== 绑定事件监听器 =====
    if (langBtn) {
      // click 事件代理已在 render() 中处理，此处无需额外绑定
      // 注意：不覆盖 onclick，因为 HTML 中已有 onclick 触发自定义事件
    } else {
      console.warn('[Knowledge Graph] ⚠️ 未找到语言切换按钮 #langBtn');
      console.warn('[Knowledge Graph] ⚠️ 尝试在 contentEl 中查找...');
      
      // 设置一个延迟查找机制（使用 contentEl 而不是 document）
      window.setTimeout(() => {
        const delayedBtn = modal.contentEl.querySelector('#langBtn') as unknown as HTMLButtonElement;
        if (delayedBtn) {
          // click 事件代理已在 render() 中处理，此处无需额外绑定
        } else {
          console.error('[Knowledge Graph] ❌ 延迟查找也未找到按钮！');
        }
      }, 100);
    }
    
  }

  private initKnowledgeCardFunctions() {
    // 将知识卡片相关函数绑定到window对象
    (window as any).showKnowledgeCard = (name: string, category: string, color: string, summary: string) => {
      const isZh = this.plugin.getState().language === 'zh';
      const copyTitleText = isZh ? '📋 复制标题' : '📋 Copy Title';
      const askAIText = isZh ? '🤖 问AI' : '🤖 Ask AI';
      
      const overlay = el('div', { cls: 'kg-knowledge-overlay' });
      overlay.onclick = () => overlay.remove();
      
      const card = el('div', { cls: 'kg-knowledge-card' });
      card.onclick = (e) => e.stopPropagation();
      
      const header = el('div', { cls: 'kg-knowledge-header' });
      
      const titleDiv = el('div');
      
      const title = el('h2', { cls: 'kg-knowledge-title', text: name });
      
      const categorySpan = el('span', { cls: 'kg-knowledge-category', text: category });
      categorySpan.setCssProps({ background: `${color}15`, color: color });
      
      titleDiv.appendChild(title);
      titleDiv.appendChild(categorySpan);
      
      const closeBtn = el('button', { cls: 'kg-knowledge-close', text: '×' });
      closeBtn.onclick = () => overlay.remove();
      
      header.appendChild(titleDiv);
      header.appendChild(closeBtn);
      
      const summaryDiv = el('div', { cls: 'kg-knowledge-summary', text: summary });
      
      const actions = el('div', { cls: 'kg-knowledge-actions' });
      
      const copyBtn = el('button', { cls: 'kg-knowledge-btn kg-knowledge-btn-primary', text: copyTitleText });
      copyBtn.onclick = () => (window as any).copyKnowledgeTitle(name, copyBtn);
      
      const queryBtn = el('button', { cls: 'kg-knowledge-btn kg-knowledge-btn-secondary', text: askAIText });
      queryBtn.onclick = () => (window as any).queryKnowledgeDetail(name, queryBtn);
      
      actions.appendChild(copyBtn);
      actions.appendChild(queryBtn);
      
      card.appendChild(header);
      card.appendChild(summaryDiv);
      card.appendChild(actions);
      
      overlay.appendChild(card);
      document.body.appendChild(overlay);
    };
    
    (window as any).copyKnowledgeTitle = (title: string, button: HTMLButtonElement) => {
      navigator.clipboard.writeText(title).then(() => {
        const originalText = button.textContent;
        button.textContent = '✅ 已复制';
        button.classList.add('kg-knowledge-btn-success');
        window.setTimeout(() => {
          button.textContent = originalText;
          button.classList.remove('kg-knowledge-btn-success');
        }, 1500);
      }).catch((err) => {
        console.error('复制失败:', err);
        new Notice('复制失败');
      });
    };
    
    (window as any).queryKnowledgeDetail = async (keyword: string, button: HTMLButtonElement) => {
      button.disabled = true;
      button.textContent = '查询中...';
      
      try {
        const modelType = (document.querySelector('input[name="docModelType"]:checked') as unknown as HTMLInputElement)?.value as 'local' | 'external' || 'local';
        const prompt = `请对以下知识词条进行详细的信息查询和总结：

【查询词条】：${keyword}

【输出要求】：
1. **核心定义**：简明扼要地给出该词条的基本定义
2. **关键特征**：列出3-5个最重要的特征或属性
3. **相关背景**：提供必要的背景信息和上下文
4. **应用场景**：举例说明该概念的实际应用场景
5. **关联概念**：列出2-3个相关的重要概念或术语

请用结构化的方式呈现，语言简洁清晰，便于快速理解。`;
        
        const state = this.plugin.getState();
        const systemPrompt = state.promptConfig.modelQueryPrompt || '';
        
        const response = await (window as any).kgPlugin.callModel(prompt, modelType, systemPrompt);
        
        const resultDiv = el('div', { cls: 'kg-knowledge-result', text: response });
        button.parentElement?.parentElement?.appendChild(resultDiv);
      } catch (error) {
        console.error('[Knowledge Graph] ❌ 问AI失败:', error);
        const resultDiv = el('div', { cls: 'kg-knowledge-result kg-knowledge-result-error', text: '查询失败: ' + (error as Error).message });
        button.parentElement?.parentElement?.appendChild(resultDiv);
      } finally {
        button.disabled = false;
        button.textContent = '🤖 模型查询';
      }
    };
    
    // 语言切换函数 - 使用闭包保存插件实例引用
    const pluginInstance = this.plugin;
    const modalInstance = this;
    
    (window as any).toggleLanguage = async () => {
      
      const langBtn = document.querySelector('#langBtn');
      if (!langBtn) {
        return;
      }
      
      if (!pluginInstance) {
        return;
      }
      
      const currentState = pluginInstance.getState();
      
      const lang = currentState.language;
      
      const newLang = lang === 'zh' ? 'en' : 'zh';
      
      try {
        await pluginInstance.setLanguage(newLang);
      } catch (error) {
        return;
      }
      
      // 清空知识扩展缓存，强制重新生成以匹配新语言
      const state = pluginInstance.getState();
      state.cachedKnowledgeItems = [];
      state.lastKnowledgeUpdate = 0;
      await pluginInstance.saveData(state);
      
      modalInstance.render();
    };
    
  }

  renderBody() {
    const body = this.contentEl.querySelector('#kgBody') as unknown as HTMLElement;
    if (!body) return;

    switch (this.currentTab) {
      case 'home': this.renderHome(body); break;
      case 'parse': this.renderParse(body); break;
      case 'timeline': this.renderTimeline(body); break;
      case 'graph': this.renderGraph(body); break;
      case 'docs': this.renderDocs(body); break;
      case 'settings': this.renderSettings(body); break;
    }
  }

  renderHome(body: HTMLElement) {
    const state = this.plugin.getState();
    const hasFullAccess = this.plugin.hasFullAccess();
    const docCount = state.documents.length;
    const docCountDisplay = this.getDocumentCountDisplay(docCount);

    const homeHtml = `
      <div class="kg-stats">
        <div class="kg-stat-card" style="position:relative;overflow:hidden;">
          <div class="kg-stat-icon">🧠</div>
          <div class="kg-stat-value">${docCountDisplay}</div>
          <div class="kg-stat-label">${this.t('document_count')}</div>
        </div>
        <div class="kg-stat-card" style="position:relative;overflow:hidden;">
          <div class="kg-stat-icon">🔗</div>
          <div class="kg-stat-value">${state.entities.length}</div>
          <div class="kg-stat-label">${this.t('entity_count')}</div>
        </div>
        <div class="kg-stat-card" style="position:relative;overflow:hidden;">
          <div class="kg-stat-icon"> ${state.isPro ? '👑' : this.plugin.isTrialActive() ? '⏳' : '🆓'}</div>
          <div class="kg-stat-value">${state.isPro ? 'Pro' : this.plugin.isTrialActive() ? this.t('trial_active') : this.t('free_version')}</div>
          <div class="kg-stat-label">${this.t('version')}</div>
        </div>
      </div>

      <div class="kg-section">
        <h3>${this.t('features_intro')}</h3>
        <div class="kg-features-grid">
          <div class="kg-feature-box">
            <h4>${this.t('free_features_title')}</h4>
            <ul>
              ${(LANG[this.plugin.getState().language].free_features as string[]).map(f => `<li>${f}</li>`).join('')}
            </ul>
          </div>
          <div class="kg-feature-box" style="border-color:#667eea;">
            <h4>${this.t('pro_features_title')}</h4>
            <ul>
              ${(LANG[this.plugin.getState().language].pro_features as string[]).map(f => `<li>${f}</li>`).join('')}
            </ul>
          </div>
        </div>
      </div>

      <div class="kg-section">
        <h3>${this.t('purchase_title')}</h3>
        <p style="color:#666;font-size:14px;margin-bottom:20px;">${this.t('purchase_desc')}</p>
        <div class="kg-purchase-box">
          <div style="margin-bottom:16px;">
            <label style="font-size:14px;color:#475569;margin-bottom:8px;display:block;font-weight:500;">${this.t('enter_activation_code')}</label>
            <div style="display:flex;gap:8px;">
              <input type="text" id="activationCodeInput" placeholder="${this.t('enter_code')}" style="flex:1;padding:10px 14px;border:2px solid #e5e7eb;border-radius:8px;font-size:14px;font-family:inherit;">
              <button class="kg-btn primary" id="activateBtn">${this.t('activate_button')}</button>
            </div>
          </div>
          
          <div style="border-top:1px solid #eee;padding-top:16px;">
            <div style="display:flex;gap:12px;">
              <button class="kg-btn primary" id="buyMonthlyBtn" style="flex:1;">${this.t('buy_now_button')}</button>
              <button class="kg-btn secondary" id="buyYearlyBtn" style="flex:1;">${this.t('buy_yearly_button')}</button>
            </div>
          </div>
        </div>
      </div>

      ${!hasFullAccess ? `<div class="kg-trial-notice">${this.t('trial_notice')}</div>` : ''}

      <div class="kg-recent">
        <h3>${this.t('recent_parse')}</h3>
        ${state.documents.length > 0 ?
          state.documents.slice(-5).reverse().map(d => `<div class="kg-doc-item" data-path="${d.filePath || ''}" data-docid="${d.id || ''}"><span class="kg-doc-title">${d.title}</span><span class="kg-doc-meta">${new Date(d.timestamp).toLocaleDateString()}</span></div>`).join('') :
          `<div class="kg-empty-msg">${this.t('no_records')}</div>`}
      </div>
      </div>
    `;
    body.replaceChildren();
    body.appendChild(parseHtml(homeHtml));

    body.querySelector('#copyDeviceBtn')?.addEventListener('click', () => {
      navigator.clipboard.writeText(state.deviceId);
      new Notice(this.t('copied'), 1500);
    });

    body.querySelector('#buyMonthlyBtn')?.addEventListener('click', () => {
      window.open('https://leenchat.com/', '_blank');
    });

    body.querySelector('#buyYearlyBtn')?.addEventListener('click', () => {
      window.open('https://leenchat.com/', '_blank');
    });

    body.querySelector('#activateBtn')?.addEventListener('click', async () => {
      const input = body.querySelector('#activationCodeInput') as unknown as HTMLInputElement;
      const code = input.value.trim();
      if (!code) {
        new Notice('请输入激活码', 2000);
        return;
      }
      await this.plugin.activateWithCode(code);
      this.render();
    });

    // Add click handler for recent parse items
    body.querySelectorAll('.kg-doc-item').forEach(item => {
      item.addEventListener('click', async (e) => {
        const filePath = (e.currentTarget as unknown as HTMLElement).dataset.path;
        if (filePath) {
          const file = this.plugin.app.vault.getAbstractFileByPath(filePath);
          if (file && file instanceof TFile) {
            const leaf = this.plugin.app.workspace.getLeaf(false);
            await leaf.openFile(file);
            this.close();
          }
        }
      });
    });
  }

  renderParse(body: HTMLElement) {
    const state = this.plugin.getState();
    const hasFullAccess = this.plugin.hasFullAccess();
    const selectedModel = state.selectedParseModel || 'local';

    const parseHtmlContent = `
      <style>
        .kg-upload-area { border: 2px dashed var(--kg-border-color, #ddd); border-radius: 8px; padding: 30px; text-align: center; margin-bottom: 16px; cursor: pointer; transition: all 0.2s; background: var(--kg-bg-secondary, #fff); }
        .kg-upload-area:hover { border-color: #667eea; background: var(--kg-bg-hover, #f8f9ff); }
        .kg-upload-area.dragover { border-color: #667eea; background: var(--kg-bg-active, #f0f4ff); }
        .kg-upload-icon { font-size: 36px; margin-bottom: 12px; }
        .kg-upload-text { font-size: 14px; color: var(--kg-text-secondary, #666); margin-bottom: 6px; }
        .kg-upload-formats { font-size: 12px; color: var(--kg-text-muted, #999); }
        .kg-upload-input { display: none; }
        .kg-file-list { margin-top: 16px; }
        .kg-model-selector { display: flex; gap: 20px; margin-bottom: 16px; padding: 12px; background: var(--kg-bg-tertiary, #f8f9fa); border-radius: 8px; }
        .kg-model-option { display: flex; align-items: center; cursor: pointer; padding: 8px 12px; border-radius: 6px; transition: all 0.2s; color: var(--kg-text-primary, #333); }
        .kg-model-option:hover { background: var(--kg-bg-hover, #e8e8e8); }
        .kg-model-option.selected { background: #667eea; color: white; }
        .kg-model-radio { margin-right: 8px; }
        .kg-model-label { font-size: 14px; }
        .kg-model-badge { font-size: 11px; padding: 2px 6px; border-radius: 4px; margin-left: 8px; background: rgba(0,0,0,0.1); }
        @media (prefers-color-scheme: dark) {
          .kg-upload-area { background: var(--kg-bg-secondary-dark, #2a2a2a); border-color: var(--kg-border-dark, #444); }
          .kg-upload-area:hover { background: var(--kg-bg-hover-dark, #333); }
          .kg-upload-area.dragover { background: var(--kg-bg-active-dark, #383838); }
          .kg-upload-text { color: var(--kg-text-secondary-dark, #ccc); }
          .kg-upload-formats { color: var(--kg-text-muted-dark, #888); }
          .kg-model-selector { background: var(--kg-bg-tertiary-dark, #2a2a2a); }
          .kg-model-option { color: var(--kg-text-primary-dark, #eee); }
          .kg-model-option:hover { background: var(--kg-bg-hover-dark, #333); }
        }
      </style>

      <style>
        .kg-parse-row {
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
          margin-bottom:12px;
          padding:12px;
          border-radius:8px;
          background: var(--kg-bg-secondary, #f8f9fa);
          flex-wrap: wrap;
          gap: 12px;
        }
        .kg-parse-row-left {
          display:flex;
          align-items:center;
          gap:12px;
          flex-wrap: wrap;
          flex: 1;
          min-width: 0;
        }
        .kg-parse-row-right {
          display:flex;
          align-items:center;
          gap:10px;
          flex-shrink: 0;
          margin-left: auto;
        }
        @media (prefers-color-scheme: dark) {
          .kg-parse-row {
            background: var(--kg-bg-secondary-dark, #2a2a2a);
          }
        }
      </style>
      <div class="kg-docs-grid">
        <!-- 第一行：模型选择 -->
        <div style="grid-column:1/-1;margin-bottom:16px;" class="kg-summary-row-secondary">
          <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
            <span style="font-size:14px;font-weight:500;color:var(--kg-text, #1f2937);">${this.t('model_selection')}</span>
            <label class="kg-model-option ${selectedModel === 'local' ? 'selected' : ''}" id="modelLocalOption">
              <input type="radio" name="parseModelType" value="local" ${selectedModel === 'local' ? 'checked' : ''} class="kg-model-radio">
              <span class="kg-model-label">${this.t('local_model')}</span>
            </label>
            <label class="kg-model-option ${selectedModel === 'external' ? 'selected' : ''}" id="modelExternalOption">
              <input type="radio" name="parseModelType" value="external" ${selectedModel === 'external' ? 'checked' : ''} class="kg-model-radio">
              <span class="kg-model-label">${this.t('external_model')}</span>
              <span class="kg-model-badge">⭐ Pro</span>
            </label>
          </div>
        </div>
        
        <!-- 第二行：文档分析和历史文档分析 -->
        <div style="grid-column:1/-1;margin-bottom:16px;" class="kg-summary-row">
          <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
            <button class="kg-btn primary" id="parseBtn"><span class="kg-btn-icon">📄</span> ${this.t('start_parse')}</button>
            <button class="kg-btn secondary" id="analyzeAllBtn" ${!hasFullAccess ? 'disabled' : ''}><span class="kg-btn-icon">🔄</span> ${this.t('analyze_all_docs')}</button>
          </div>
        </div>
      </div>
      <p style="color:var(--kg-text-secondary, #666);font-size:13px;margin:12px 0 16px;">${this.t('parse_desc')}</p>

      <div class="kg-upload-area" id="uploadArea">
        <div class="kg-upload-icon">📁</div>
        <div class="kg-upload-text">${this.t('upload_formats')}</div>
        <div class="kg-upload-formats">${this.t('upload_formats_desc')}</div>
        <input type="file" id="fileInput" class="kg-upload-input" multiple accept=".md,.txt,.json">
      </div>

      <div class="kg-file-list" id="fileList"></div>

      <textarea class="kg-textarea" id="parseInput" placeholder="${this.t('enter_text')}"></textarea>
    `;
    body.replaceChildren();
    body.appendChild(parseHtml(parseHtmlContent));

    const uploadArea = body.querySelector('#uploadArea') as unknown as HTMLElement;
    const fileInput = body.querySelector('#fileInput') as unknown as HTMLInputElement;
    const fileList = body.querySelector('#fileList') as unknown as HTMLElement;

    uploadArea.addEventListener('click', () => fileInput.click());

    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
      uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('dragover');
      const files = e.dataTransfer?.files;
      if (files) this.handleFiles(Array.from(files), fileList);
    });

    fileInput.addEventListener('change', (e) => {
      const files = (e.target as unknown as HTMLInputElement).files;
      if (files) this.handleFiles(Array.from(files), fileList);
    });

    const modelOptions = body.querySelectorAll('.kg-model-option');
    modelOptions.forEach(option => {
      option.addEventListener('click', () => {
        modelOptions.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        const input = option.querySelector('input');
        if (input) {
          this.plugin.setSelectedParseModel(input.value as 'local' | 'external');
        }
      });
    });

    body.querySelector('#parseBtn')?.addEventListener('click', async () => {
      const modelType = (body.querySelector('input[name="parseModelType"]:checked') as unknown as HTMLInputElement)?.value as 'local' | 'external';
      const hasFullAccess = this.plugin.hasFullAccess();

      if (modelType === 'external' && !hasFullAccess) {
        new Notice('⭐ ' + this.t('pro_version') + ' ' + this.t('required'), 2000);
        return;
      }

      const input = body.querySelector('#parseInput') as unknown as HTMLTextAreaElement;
      const fileListContainer = body.querySelector('#fileList') as unknown as HTMLElement;

      let content = input.value.trim();
      const uploadedFiles: Array<{ name: string; content: string }> = [];

      if (!content && fileListContainer.children.length === 0) {
        new Notice(this.t('enter_text') + ' ' + this.t('or_upload_files'), 2000);
        return;
      }

      const progressBar = this.createProgressBar(body);
      let progress = 0;

      try {
        if (fileListContainer.children.length > 0) {
          progressBar.update(5, this.t('reading_files'));

          for (let i = 0; i < fileListContainer.children.length; i++) {
            const fileItem = fileListContainer.children[i];
            const fileName = (fileItem.querySelector('.kg-doc-title') as unknown as HTMLElement)?.textContent?.replace('📄 ', '') || '';
            const fileData = this.uploadedFiles.find(f => f.name === fileName);

            if (fileData) {
              uploadedFiles.push(fileData);
              progress += 100 / fileListContainer.children.length;
              progressBar.update(Math.min(30, progress), `${this.t('reading_file')}: ${fileName}`);
              await this.delay(200);
            }
          }
        }

        progressBar.update(35, this.t('preparing_prompt'));
        const allContent = content + '\n\n' + uploadedFiles.map(f => `---\n## ${f.name}\n\n${f.content}`).join('\n\n');
        await this.delay(200);

        progressBar.update(40, this.t('calling_model'));
        const prompts = this.plugin.buildParsePrompt(allContent);
        const modelResponse = await this.plugin.callModel(prompts.userPrompt, modelType, prompts.systemPrompt);
        await this.delay(100);

        progressBar.update(80, this.t('formatting_output'));
        const outputContent = this.formatModelResponse(modelResponse);
        await this.delay(200);

        progressBar.update(90, this.t('saving'));

        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const summary = content.substring(0, 20).replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_') || 'document';
        const fileName = `${timestamp}_${summary}.md`;
        const outputDir = 'KnowledgeGraph';

        await this.plugin.saveParseResult(fileName, outputContent, outputDir);

        progressBar.update(100, this.t('complete'));
        await this.delay(500);

        new Notice(this.t('parse_complete') + ' → ' + outputDir + '/' + fileName, 3000);

        input.value = '';
        fileListContainer.replaceChildren();
        this.uploadedFiles = [];
        this.render();
      } catch (error) {
        console.error(`[Knowledge Graph] ❌ 文档解析失败:`, error);
        new Notice(`${this.t('parse_error')}: ${error instanceof Error ? error.message : String(error)}`, 5000);
      } finally {
        // 确保进度条总是被移除，防止卡住
        try {
          progressBar.remove();
        } catch (e) {
          console.warn('[Knowledge Graph] ⚠️ 移除进度条时出错:', e);
        }
      }
    });

    // 全量文档分析按钮
    body.querySelector('#analyzeAllBtn')?.addEventListener('click', async () => {
      const state = this.plugin.getState();
      
      // 获取用户选择的模型类型（与普通文档解析保持一致）
      const modelType = (body.querySelector('input[name="parseModelType"]:checked') as unknown as HTMLInputElement)?.value as 'local' | 'external';
      const hasFullAccess = this.plugin.hasFullAccess();

      // 检查权限（与普通文档解析保持一致）
      if (modelType === 'external' && !hasFullAccess) {
        new Notice('⭐ ' + this.t('pro_version') + ' ' + this.t('required'), 2000);
        return;
      }
      
      const progressBar = this.createProgressBar(body);
      
      try {
        const graphStorage = getGraphStorageService();
        if (!graphStorage) {
          throw new Error('Graph storage not initialized');
        }

        // 获取Vault中所有的md文件
        const allMdFiles = this.plugin.app.vault.getFiles().filter(f => f.extension === 'md');
        const processedFilePaths = new Set(state.documents.map(d => d.filePath).filter(Boolean));
        
        // 筛选未处理的文档
        const unprocessedFiles = allMdFiles.filter(f => !processedFilePaths.has(f.path));
        
        if (unprocessedFiles.length === 0) {
          progressBar.remove();
          new Notice('所有文档已处理完毕！', 2000);
          return;
        }

        // 使用更友好的确认对话框
        const confirmed = await this.showConfirmDialog(
          this.t('analyze_all_docs'),
          this.t('confirm_analyze_all').replace('${count}', unprocessedFiles.length.toString())
        );
        if (!confirmed) {
          progressBar.remove();
          return;
        }

        progressBar.update(0, this.t('analyzing_all_docs'));
        await this.delay(500);

        for (let i = 0; i < unprocessedFiles.length; i++) {
          const file = unprocessedFiles[i];
          const progress = ((i + 1) / unprocessedFiles.length) * 100;
          progressBar.update(progress, `${this.t('analyzing_doc')} ${i + 1}${this.t('of')}${unprocessedFiles.length}${this.t('doc')}: ${file.name}`);
          
          try {
            // 读取文档内容
            const content = await this.plugin.app.vault.read(file);
            
            // 构建提示词并调用模型（使用用户选择的模型类型，与普通文档解析保持一致）
            const prompts = this.plugin.buildParsePrompt(content);
            const modelResponse = await this.plugin.callModel(prompts.userPrompt, modelType, prompts.systemPrompt);
            const outputContent = this.formatModelResponse(modelResponse);
            
            // 保存分析结果
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            const summary = (file.basename.replace('.md', '') || 'document').replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
            const fileName = `${timestamp}_${summary}.md`;
            const outputDir = 'KnowledgeGraph';
            
            // 传递原始文件路径
            await this.plugin.saveParseResult(fileName, outputContent, outputDir, file.path);
            
          } catch (error) {
            console.error(`Error processing document ${file.path}:`, error);
          }
          
          await this.delay(100);
        }

        progressBar.update(100, this.t('complete'));
        await this.delay(500);
        progressBar.remove();
        new Notice(this.t('analyze_complete'), 3000);
        this.render();
      } catch (error) {
        console.error('Analyze all docs error:', error);
        progressBar.remove();
        new Notice(this.t('analyze_error'), 2000);
      }
    });
  }

  private uploadedFiles: Array<{ name: string; content: string }> = [];

  handleFiles(files: File[], container: HTMLElement) {
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        this.uploadedFiles.push({ name: file.name, content });

        const item = el('div', { cls: 'kg-doc-item' });
        const titleSpan = el('span', { cls: 'kg-doc-title', text: `📄 ${file.name}` });
        const removeSpan = el('span', { cls: 'kg-file-remove', text: '✕' });
        removeSpan.addEventListener('click', () => item.remove());
        item.appendChild(titleSpan);
        item.appendChild(removeSpan);
        container.appendChild(item);
      };
      reader.readAsText(file);
    });
  }

  formatModelResponse(response: string): string {
    let formatted = response.trim();

    if (!formatted.startsWith('#')) {
      const isZh = this.plugin.getState().language === 'zh';
      formatted = `# ${isZh ? '分析结果' : 'Analysis Result'}\n\n${formatted}`;
    }

    return formatted;
  }

  renderTimeline(body: HTMLElement) {
    const state = this.plugin.getState();
    const timelineHtml = `
      <h3 style="margin:0 0 16px;font-size:16px;font-weight:600;">${this.t('timeline_view')}</h3>
      <div id="kg-timeline-container" style="width:100%;height:500px;"></div>
    `;
    body.replaceChildren();
    body.appendChild(parseHtml(timelineHtml));

    const container = body.querySelector('#kg-timeline-container') as unknown as HTMLElement;
    if (container) {
      const timelineNodes = state.documents.map(d => ({
        id: d.id,
        summary: d.title,
        timestamp: d.timestamp,
        tags: d.keywords || [],
        filePath: d.filePath || '',
        docId: d.id
      }));

      new TimelineView(container, {
        nodes: timelineNodes,
        onNodeClick: (node) => {
          if (node.filePath) {
            const file = this.plugin.app.vault.getAbstractFileByPath(node.filePath);
            if (file && file instanceof TFile) {
              this.plugin.app.workspace.getLeaf(false).openFile(file);
            }
          }
        },
        onNodeClickClose: () => {
          this.close();
        }
      });
    }
  }

  renderGraph(body: HTMLElement) {
    const state = this.plugin.getState();
    
    if (this.graphView) {
      this.graphView.destroy();
      this.graphView = null;
    }

    const graphHtml = `
      <h3 style="margin:0 0 16px;font-size:16px;font-weight:600;">${this.t('graph_view')}</h3>
      <div id="kg-graph-container" class="sigma-graph-container" style="width:100%;height:500px;">
        <div class="sigma-search-container">
          <svg class="sigma-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input type="text" class="sigma-search-input" placeholder="${this.t('search_nodes')}" id="graphSearchInput">
          <button class="sigma-search-clear-btn" id="graphSearchClearBtn" title="${this.t('clear')}" style="display:none;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="sigma-controls">
          <button class="sigma-control-btn" id="zoomToFitBtn" title="${this.t('zoom_to_fit')}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="21" y1="21" x2="14" y2="14"></line>
              <line x1="14" y1="21" x2="21" y2="14"></line>
              <rect x="2" y="2" width="15" height="15" rx="2" ry="2"></rect>
            </svg>
          </button>
        </div>
        <div class="sigma-legend">
          <h4>${this.t('entity_types')}</h4>
          <div class="sigma-legend-items">
            <div class="sigma-legend-item"><span class="sigma-legend-dot person"></span> ${this.t('person')}</div>
            <div class="sigma-legend-item"><span class="sigma-legend-dot organization"></span> ${this.t('organization')}</div>
            <div class="sigma-legend-item"><span class="sigma-legend-dot concept"></span> ${this.t('concept')}</div>
            <div class="sigma-legend-item"><span class="sigma-legend-dot document"></span> ${this.t('document')}</div>
            <div class="sigma-legend-item"><span class="sigma-legend-dot event"></span> ${this.t('event')}</div>
            <div class="sigma-legend-item"><span class="sigma-legend-dot location"></span> ${this.t('location')}</div>
          </div>
        </div>
      </div>
    `;
    body.replaceChildren();
    body.appendChild(parseHtml(graphHtml));

    const container = body.querySelector('#kg-graph-container') as unknown as HTMLElement;
    if (container) {
      this.graphView = new SigmaGraphView({
        container,
        isPro: state.isPro,
        onJumpToFile: (filePath: string) => {
          const file = this.plugin.app.vault.getAbstractFileByPath(filePath);
          if (file && file instanceof TFile) {
            this.plugin.app.workspace.getLeaf(false).openFile(file);
            this.close();
          }
        },
      });

      // 从 GraphStorageService 加载所有实体和关系
      this.loadGraphData().then(({ entities, relations }) => {
        if (entities.length > 0 || relations.length > 0) {
          this.graphView?.setData(entities, relations);
        }
      }).catch((error) => {
        console.error('[Knowledge Graph] ❌ 加载图谱数据失败:', error);
      });

      const searchInput = body.querySelector('#graphSearchInput') as unknown as HTMLInputElement;
      const clearBtn = body.querySelector('#graphSearchClearBtn') as unknown as HTMLButtonElement;
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          const target = e.target as unknown as HTMLInputElement;
          this.graphView?.search(target.value);
          if (clearBtn) {
            clearBtn.setCssProps({ display: target.value.trim() ? 'flex' : 'none' });
          }
        });
      }

      if (clearBtn && searchInput) {
        clearBtn.addEventListener('click', () => {
          searchInput.value = '';
          this.graphView?.clearSearch();
          clearBtn.setCssProps({ display: 'none' });
          searchInput.focus();
        });
      }

      const zoomBtn = body.querySelector('#zoomToFitBtn') as unknown as HTMLButtonElement;
      if (zoomBtn) {
        zoomBtn.addEventListener('click', () => {
          this.graphView?.zoomToFit();
        });
      }
    }
  }

  // 从 GraphStorageService 加载图谱数据
  private async loadGraphData(): Promise<{ entities: Entity[]; relations: Relation[] }> {
    try {
      let graphStorage = getGraphStorageService();
      if (!graphStorage) {
        console.warn('[Knowledge Graph] ⚠️ GraphStorageService 未初始化，尝试创建新实例');
        graphStorage = await createGraphStorageService();
        if (!graphStorage) {
          return { entities: [], relations: [] };
        }
      }

      // 尝试获取数据，如果失败可能是数据库未初始化
      let entities: Entity[] = [];
      let relations: Relation[] = [];
      
      try {
        entities = await graphStorage.getAllEntities();
        relations = await graphStorage.getAllRelations();
      } catch (dbError) {
        console.warn('[Knowledge Graph] ⚠️ 数据库查询失败，尝试重新初始化:', dbError);
        // 尝试重新初始化数据库
        try {
          await graphStorage.initialize();
          entities = await graphStorage.getAllEntities();
          relations = await graphStorage.getAllRelations();
        } catch (reinitError) {
          console.error('[Knowledge Graph] ❌ 重新初始化数据库失败:', reinitError);
        }
      }

      return { entities, relations };
    } catch (error) {
      console.error('[Knowledge Graph] ❌ 加载图谱数据失败:', error);
      return { entities: [], relations: [] };
    }
  }

  renderDocs(body: HTMLElement) {
    const state = this.plugin.getState();
    const hasFullAccess = this.plugin.hasFullAccess();
    const showPreviewOnly = !hasFullAccess;

    // 计算统计数据
    const now = Date.now();
    const day7Ago = now - 7 * 24 * 60 * 60 * 1000;
    const day30Ago = now - 30 * 24 * 60 * 60 * 1000;
    const day90Ago = now - 90 * 24 * 60 * 60 * 1000;
    
    const totalDocs = state.documents.length;
    const docsLast7Days = state.documents.filter(d => d.timestamp > day7Ago).length;
    const docsLast30Days = state.documents.filter(d => d.timestamp > day30Ago).length;
    const docsOpened90Days = state.documents.filter(d => d.timestamp > day90Ago).length;
    const docsNeverOpened = state.documents.filter(d => !d.timestamp || d.timestamp === 0).length;

    // 获取缓存的知识条目
    const cachedKnowledge = state.cachedKnowledgeItems || [];
    
    const previewKnowledge = `## Core Knowledge Points
- Artificial Intelligence (AI): The theory, methods, techniques, and application systems for simulating, extending, and expanding human intelligence
- Machine Learning: The core of AI, enabling computers to learn from data and improve performance

## Knowledge Derivation & Expansion
- Deep Learning: A branch of machine learning that uses multi-layer neural networks for feature learning
- Reinforcement Learning: Learning optimal strategies through interaction with the environment and receiving rewards

## Practical Applications
- Natural Language Processing: Enabling computers to understand and generate human language
- Computer Vision: Enabling computers to "see" and understand images and videos`;

    const dashboardHtml = `
      <style>
        .kg-summary-row { 
          padding: 12px; 
          border-radius: 8px;
          background: var(--kg-bg-secondary, #f9fafb);
        }
        .kg-summary-row-secondary { 
          padding: 12px; 
          border-radius: 8px;
          background: var(--kg-bg-secondary, #f9fafb);
        }
        .theme-dark .kg-summary-row,
        .theme-dark .kg-summary-row-secondary {
          background: var(--kg-bg-secondary, #374151);
        }
        
        /* 统计卡片样式 - 支持暗黑模式 */
        .kg-stats-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 12px;
          margin-bottom: 16px;
        }
        @media (max-width: 800px) {
          .kg-stats-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        @media (max-width: 500px) {
          .kg-stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        .kg-stat-card-new {
          position: relative;
          padding: 16px;
          border-radius: 12px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          overflow: hidden;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .kg-stat-card-new:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
        }
        .kg-stat-card-new.stat-green {
          background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
        }
        .kg-stat-card-new.stat-green:hover {
          box-shadow: 0 8px 16px rgba(17, 153, 142, 0.3);
        }
        .kg-stat-card-new.stat-orange {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }
        .kg-stat-card-new.stat-orange:hover {
          box-shadow: 0 8px 16px rgba(245, 87, 108, 0.3);
        }
        .kg-stat-card-new.stat-blue {
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        }
        .kg-stat-card-new.stat-blue:hover {
          box-shadow: 0 8px 16px rgba(79, 172, 254, 0.3);
        }
        .kg-stat-card-new.stat-purple {
          background: linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%);
        }
        .kg-stat-card-new.stat-purple:hover {
          box-shadow: 0 8px 16px rgba(161, 140, 209, 0.3);
        }
        
        /* 暗黑模式下的卡片样式 */
        .theme-dark .kg-stat-card-new {
          background: linear-gradient(135deg, #4c1d95 0%, #5b21b6 100%);
        }
        .theme-dark .kg-stat-card-new.stat-green {
          background: linear-gradient(135deg, #064e3b 0%, #047857 100%);
        }
        .theme-dark .kg-stat-card-new.stat-orange {
          background: linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%);
        }
        .theme-dark .kg-stat-card-new.stat-blue {
          background: linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%);
        }
        .theme-dark .kg-stat-card-new.stat-purple {
          background: linear-gradient(135deg, #581c87 0%, #6b21a8 100%);
        }
        
        .kg-stat-icon {
          font-size: 24px;
          margin-bottom: 8px;
          opacity: 0.9;
        }
        .kg-stat-value-new {
          font-size: 28px;
          font-weight: 700;
          line-height: 1;
          margin-bottom: 4px;
        }
        .kg-stat-label-new {
          font-size: 11px;
          opacity: 0.85;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .kg-stat-card-new::after {
          content: '';
          position: absolute;
          top: -50%;
          right: -50%;
          width: 100%;
          height: 100%;
          background: rgba(255,255,255,0.1);
          border-radius: 50%;
          pointer-events: none;
        }
        
        /* 按钮图标特效 */
        .kg-btn-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          margin-right: 6px;
          transition: all 0.3s ease;
        }
        
        .kg-btn:hover .kg-btn-icon {
          animation: bounce 0.6s ease-in-out;
        }
        
        .kg-btn.primary .kg-btn-icon {
          animation: spin-glow 2s infinite linear;
        }
        
        .kg-btn.secondary .kg-btn-icon {
          animation: pulse 2s infinite;
        }
        
        .kg-btn.no-icon-animation .kg-btn-icon {
          animation: none !important;
        }
        
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        
        @keyframes spin-glow {
          0% { transform: rotate(0deg) scale(1); filter: drop-shadow(0 0 0 rgba(99, 102, 241, 0)); }
          50% { transform: rotate(180deg) scale(1.1); filter: drop-shadow(0 0 8px rgba(99, 102, 241, 0.6)); }
          100% { transform: rotate(360deg) scale(1); filter: drop-shadow(0 0 0 rgba(99, 102, 241, 0)); }
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(59, 130, 246, 0)); }
          50% { transform: scale(1.08); filter: drop-shadow(0 0 6px rgba(59, 130, 246, 0.5)); }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-3px); }
          20%, 40%, 60%, 80% { transform: translateX(3px); }
        }
        
        .kg-btn-secondary-analyzing .kg-btn-icon {
          animation: shake 0.5s infinite;
        }
      </style>
      
      <div class="kg-docs-grid">
        <!-- 第一行：模型选择 -->
        <div style="grid-column:1/-1;margin-bottom:16px;" class="kg-summary-row-secondary">
          <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
            <span style="font-size:14px;font-weight:500;color:var(--kg-text, #1f2937);">${this.t('model_selection')}</span>
            <label class="kg-model-option ${state.selectedParseModel === 'local' ? 'selected' : ''}" id="docModelLocal">
              <input type="radio" name="docModelType" value="local" ${state.selectedParseModel === 'local' ? 'checked' : ''}>
              <span>${this.t('local_model')}</span>
            </label>
            <label class="kg-model-option ${state.selectedParseModel === 'external' ? 'selected' : ''}" id="docModelExternal">
              <input type="radio" name="docModelType" value="external" ${state.selectedParseModel === 'external' ? 'checked' : ''}>
              <span>${this.t('external_model')}</span>
              <span style="font-size:10px;padding:2px 6px;background:#fcd34d;color:#78350f;border-radius:4px;">⭐ Pro</span>
            </label>
          </div>
        </div>
        
        <!-- 第二行：汇总总结按钮 -->
        <div style="grid-column:1/-1;margin-bottom:16px;" class="kg-summary-row">
          <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
            <button class="kg-btn primary no-icon-animation" id="extractCoreBtn" ${showPreviewOnly ? 'disabled' : ''}><span class="kg-btn-icon">📊</span> ${this.t('summary_doc')}</button>
          </div>
        </div>
        
        <!-- 第三行：统计数据卡片 -->
        <div style="grid-column:1/-1;margin-bottom:16px;">
          <div class="kg-stats-grid">
            <div class="kg-stat-card-new">
              <div class="kg-stat-icon">📄</div>
              <div class="kg-stat-value-new">${totalDocs}</div>
              <div class="kg-stat-label-new">${this.t('total_documents')}</div>
            </div>
            <div class="kg-stat-card-new stat-green">
              <div class="kg-stat-icon">📅</div>
              <div class="kg-stat-value-new">${docsLast7Days}</div>
              <div class="kg-stat-label-new">${this.t('documents_last_7days')}</div>
            </div>
            <div class="kg-stat-card-new stat-blue">
              <div class="kg-stat-icon">📆</div>
              <div class="kg-stat-value-new">${docsLast30Days}</div>
              <div class="kg-stat-label-new">${this.t('documents_this_month')}</div>
            </div>
            <div class="kg-stat-card-new stat-purple">
              <div class="kg-stat-icon">📊</div>
              <div class="kg-stat-value-new">${docsOpened90Days}</div>
              <div class="kg-stat-label-new">${this.t('documents_opened_3months')}</div>
            </div>
            <div class="kg-stat-card-new stat-orange">
              <div class="kg-stat-icon">⏰</div>
              <div class="kg-stat-value-new">${docsNeverOpened}</div>
              <div class="kg-stat-label-new">${this.t('documents_never_opened')}</div>
            </div>
          </div>
        </div>

        <div class="kg-knowledge-box">
          <div class="kg-knowledge-header">
            <h4>${this.t('knowledge_expansion')}</h4>
          </div>
          <div class="kg-knowledge-output" id="knowledgeOutput">
            ${showPreviewOnly ? `<div style="white-space:pre-wrap;">${previewKnowledge}</div>` : (cachedKnowledge.length > 0 ? this.renderKnowledgeSphere(cachedKnowledge) : (totalDocs > 0 ? this.t('click_to_analyze') : this.t('no_data')))}
          </div>
        </div>

        <div class="kg-row-2cols">
          <div class="kg-keywords-box">
            <h4>${this.t('keywords')}</h4>
            <div class="kg-wordcloud-container" id="wordcloudContainer">
              ${this.generateWordcloud(state)}
            </div>
          </div>
          <div class="kg-radar-box">
            <h4>${this.t('radar_chart')}</h4>
            <div class="kg-radar-container">
              <svg class="kg-radar-svg" viewBox="0 0 500 500" preserveAspectRatio="xMidYMid meet" id="radarChart">
                ${this.generateRadarChart(this.getCategoriesFromDocs(state))}
              </svg>
            </div>
          </div>
        </div>
      </div>
    `;
    body.replaceChildren();
    body.appendChild(parseHtml(dashboardHtml));

    const docModelOptions = body.querySelectorAll('.kg-model-option');
    docModelOptions.forEach(option => {
      option.addEventListener('click', () => {
        docModelOptions.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        
        // 保存模型选择到状态
        const radioInput = option.querySelector('input[type="radio"]');
        if (radioInput) {
          const modelType = (radioInput as unknown as HTMLInputElement).value as 'local' | 'external';
          const currentState = this.plugin.getState();
          currentState.selectedParseModel = modelType;
          this.plugin.saveStateData(currentState);
        }
      });
    });

    // Extract core button handler - triggers all refresh functions
    body.querySelector('#extractCoreBtn')?.addEventListener('click', async () => {
      if (showPreviewOnly) {
        new Notice('⭐ ' + this.t('pro_version') + ' ' + this.t('required'), 2000);
        return;
      }

      const modelType = body.querySelector('input[name="docModelType"]:checked') as unknown as HTMLInputElement;
      const modelValue = modelType?.value as 'local' | 'external';
      const hasFullAccess = this.plugin.hasFullAccess();

      if (modelValue === 'external' && !hasFullAccess) {
        new Notice('⭐ ' + this.t('pro_version') + ' ' + this.t('required'), 2000);
        return;
      }

      if (state.documents.length === 0) {
        new Notice(this.t('no_data'), 2000);
        return;
      }

      const progressBar = this.createProgressBar(body);
      progressBar.update(10, this.t('analyzing'));

      try {
        // 步骤1：获取用户最近一条MD文档
        const latestDoc = state.documents[state.documents.length - 1];
        const docContent = `${latestDoc.title || ''}\n${latestDoc.summary || ''}\n${latestDoc.content || ''}`;
        

        progressBar.update(15, '关联匹配知识...');

        // 步骤2：从数据库中关联匹配相关知识
        let relatedKnowledge = '';
        try {
          const graphStorage = getGraphStorageService();
          if (graphStorage && latestDoc.docId) {
            // 查询该文档的实体
            const entities = await graphStorage.queryEntitiesByDocId(latestDoc.docId);
            
            // 查询与这些实体相关的关系
            let allRelations: any[] = [];
            for (const entity of entities) {
              const relations = await graphStorage.queryRelationsByEntity(entity.id);
              allRelations = [...allRelations, ...relations];
            }
            
            // 构建关联知识汇总
            if (entities.length > 0 || allRelations.length > 0) {
              relatedKnowledge = `\n\n## 关联知识库\n\n### 相关实体：\n`;
              entities.forEach(e => {
                relatedKnowledge += `- ${e.name}（${e.type}）: ${e.summary || '暂无描述'}\n`;
              });
              
              if (allRelations.length > 0) {
                relatedKnowledge += `\n### 相关关系：\n`;
                allRelations.forEach(r => {
                  // 获取源实体和目标实体名称
                  const sourceEntity = entities.find(e => e.id === r.sourceId);
                  const targetEntity = entities.find(e => e.id === r.targetId);
                  relatedKnowledge += `- ${sourceEntity?.name || '未知'} --[${r.relationType}]--> ${targetEntity?.name || '未知'}\n`;
                });
              }
            }
          }
        } catch (error) {
          console.warn(`[Knowledge Graph] ⚠️ 查询关联知识失败:`, error);
        }

        progressBar.update(30, this.t('calling_model'));

        // 步骤3：使用知识扩展提示词进行知识扩展（user prompt不需要任何输入）
        // knowledge prompt 包含全部规则、输出格式和文档内容
        // 构建user prompt的content（包含文档内容和关联知识）
        const knowledgeUserContent = `## Original Content to Expand:
${docContent}

## Related Knowledge Base Content (Reference Priority):
${relatedKnowledge}`;

        // system prompt 只包含规则和格式要求
        const knowledgeSystemPrompt = state.promptConfig.knowledgePrompt || `You are a professional knowledge expansion assistant. Based on the original content provided by the user, you extend knowledge following 3 rules:
1. Expansion dimensions are divided into three categories: similar knowledge, upstream/downstream related knowledge, and obscure supplementary knowledge. Do not repeat information already in the original text.
2. Output a fixed 20 independent knowledge points. Each point should be concise, logically independent, and marked with its expansion category.
3. Each knowledge point includes: brief concept + key details, no redundant words, unified format.

The following is the original content to be expanded:
{content}

Output the expanded knowledge points according to the rules above.

Fixed output format (one knowledge point per line):
【Knowledge: Knowledge Point Name】Detailed knowledge content (Category: Similar/Upstream-Downstream/Obscure Supplementary)`;

        // user prompt 包含文档内容和关联知识
        const knowledgeUserPrompt = knowledgeUserContent;

        // 使用按钮点击时获取的模型选择
        const knowledgeResponse = await this.plugin.callModel(knowledgeUserPrompt, modelValue, knowledgeSystemPrompt);


        // 解析知识扩展结果并渲染为球形词云
        const outputDiv = body.querySelector('#knowledgeOutput');
        if (outputDiv) {
          let knowledgeItems: Array<{name: string, category: string, summary: string}> = [];
          try {
            // 首先尝试直接解析JSON
            knowledgeItems = JSON.parse(knowledgeResponse);
          } catch {
            // 如果不是JSON格式，尝试从文本中提取结构化信息
            knowledgeItems = this.parseKnowledgeFromText(knowledgeResponse);
          }
          
          // 保存到缓存中，以便下次打开时显示
          state.cachedKnowledgeItems = knowledgeItems;
          
          outputDiv.replaceChildren();
        outputDiv.appendChild(parseHtml(this.renderKnowledgeSphere(knowledgeItems)));
        }

        progressBar.update(40, this.t('generating_output'));

        // 从本地DB获取关键词，而不是调用模型
        let keywords: string[] = [];
        try {
          const graphStorage = getGraphStorageService();
          if (graphStorage && latestDoc.docId) {
            try {
              // 从数据库获取该文档的关键词
              const docKeywords = await graphStorage.queryKeywordsByDocId(latestDoc.docId);
              
              if (docKeywords.length > 0) {
                keywords = docKeywords;
              } else {
                // 如果DB中没有，从文档内容中提取
                keywords = this.extractKeywordsFromText(docContent);
              }
            } catch (error) {
              console.warn(`[Knowledge Graph] ⚠️ 从DB获取关键词失败，使用文本提取:`, error);
              keywords = this.extractKeywordsFromText(docContent);
            }
          } else {
            keywords = this.extractKeywordsFromText(docContent);
          }
        } catch (error) {
          console.warn(`[Knowledge Graph] ⚠️ 关键词获取失败，使用文本提取:`, error);
          keywords = this.extractKeywordsFromText(docContent);
        }

        const container = body.querySelector('#wordcloudContainer');
        if (container) {
          container.replaceChildren();
          container.appendChild(parseHtml(this.generateWordcloudFromKeywords(keywords)));
        }

        progressBar.update(60, this.t('formatting_output'));

        // 直接从数据库获取分类数据，不再调用AI
        let categories = this.getCategoriesFromDocs(state);

        const svgContainer = body.querySelector('#radarChart');
        if (svgContainer) {
          svgContainer.replaceChildren();
          svgContainer.appendChild(parseHtml(this.generateRadarChart(categories)));
        }

        progressBar.update(100, this.t('complete'));
        await this.delay(500);
        progressBar.remove();
        state.lastKnowledgeUpdate = Date.now();
        await this.plugin.saveStateData(state);
        new Notice(this.t('parse_complete'), 2000);
      } catch (error) {
        progressBar.remove();
        console.error('[Knowledge Graph] ❌ 知识扩展分析失败:', error);
        // 更新显示状态
        const outputDiv = body.querySelector('#knowledgeOutput');
        if (outputDiv) {
          outputDiv.replaceChildren();
          outputDiv.appendChild(parseHtml(`<div style="text-align:center;padding:20px;color:#ef4444;">${this.t('parse_error')}: ${error.message}</div>`));
        }
        new Notice(this.t('parse_error'), 2000);
      }
    });

    // History docs analyze button handler
    body.querySelector('#analyzeHistoryBtn')?.addEventListener('click', async () => {
      if (showPreviewOnly) {
        new Notice('⭐ ' + this.t('pro_version') + ' ' + this.t('required'), 2000);
        return;
      }

      const modelType = body.querySelector('input[name="docModelType"]:checked') as unknown as HTMLInputElement;
      const modelValue = modelType?.value as 'local' | 'external';
      const hasFullAccess = this.plugin.hasFullAccess();

      if (modelValue === 'external' && !hasFullAccess) {
        new Notice('⭐ ' + this.t('pro_version') + ' ' + this.t('required'), 2000);
        return;
      }

      if (state.documents.length === 0) {
        new Notice(this.t('no_data'), 2000);
        return;
      }

      const progressBar = this.createProgressBar(body);
      progressBar.update(10, this.t('analyzing_history'));

      try {
        // 获取所有历史文档内容
        const allDocsContent = state.documents.map(doc => 
          `${doc.title || ''}\n${doc.summary || ''}\n${doc.content || ''}`
        ).join('\n\n---\n\n');


        progressBar.update(20, this.t('calling_model'));

        const systemPrompt = `You are a professional document analysis assistant. Summarize and analyze multiple historical documents.

Please output:
1. Document topic overview
2. Core viewpoints summary
3. Key data and statistics
4. Main conclusions

Output in clear Markdown format.`;

        const response = await this.plugin.callModel(allDocsContent, modelValue, systemPrompt);

        const outputDiv = body.querySelector('#knowledgeOutput');
        if (outputDiv) {
          outputDiv.replaceChildren();
          outputDiv.appendChild(parseHtml(`<div style="white-space:pre-wrap;">${response}</div>`));
        }

        progressBar.update(100, this.t('complete'));
        await this.delay(500);
        progressBar.remove();
        new Notice(this.t('analyze_complete'), 2000);
      } catch (error) {
        progressBar.remove();
        console.error('[Knowledge Graph] ❌ 历史文档分析失败:', error);
        const outputDiv = body.querySelector('#knowledgeOutput');
        if (outputDiv) {
          outputDiv.replaceChildren();
          outputDiv.appendChild(parseHtml(`<div style="text-align:center;padding:20px;color:#ef4444;">${this.t('parse_error')}: ${error.message}</div>`));
        }
        new Notice(this.t('parse_error'), 2000);
      }
    });

    // 如果有缓存的知识条目，渲染知识球形词云
    if (!showPreviewOnly && cachedKnowledge.length > 0) {
      const outputDiv = body.querySelector('#knowledgeOutput');
      if (outputDiv) {
        outputDiv.replaceChildren();
        outputDiv.appendChild(parseHtml(this.renderKnowledgeSphere(cachedKnowledge)));
      }
    }
  }

  generateRadarChart(categories: Record<string, number>): string {
    // 检查是否有数据
    const totalValue = Object.values(categories).reduce((sum, val) => sum + val, 0);
    if (totalValue === 0) {
      // 没有数据时显示提示信息
      return `
        <text x="250" y="250" text-anchor="middle" dominant-baseline="middle" font-size="14" fill="#9ca3af">
          ${this.t('no_data')}
        </text>
      `;
    }

    // 使用用户指定的6个分类，支持中英文切换
    const categoriesList = ['arts', 'social', 'natural', 'applied', 'history', 'general'];
    const labels = [
      this.t('category_arts') || 'Arts',
      this.t('category_social') || 'Social Sciences',
      this.t('category_natural') || 'Natural Sciences',
      this.t('category_applied') || 'Applied Sciences',
      this.t('category_history') || 'History & Geography',
      this.t('category_general') || 'Reference & General'
    ];

    const values = categoriesList.map(cat => categories[cat] || Math.random() * 30 + 10);
    const angles = categoriesList.map((_, i) => (i * 2 * Math.PI) / categoriesList.length);
    // 动态计算 maxValue 为实际最大值，但至少为 50
    const actualMaxValue = Math.max(...values, 50);
    const maxValue = actualMaxValue;

    // viewBox 0 0 500 500，中心点 (250, 250)，半径 180
    const centerX = 250;
    const centerY = 250;
    const maxRadius = 180;
    const labelOffset = 30; // 标签距离雷达图边缘的距离

    // ========== 调试日志 ==========
    categoriesList.forEach((cat, i) => {
    });

    let svg = '';
    
    // 绘制网格多边形
    for (let level = 1; level <= 5; level++) {
      const radius = level * maxRadius / 5;
      const points = angles.map((angle) => {
        const x = centerX + radius * Math.cos(angle - Math.PI / 2);
        const y = centerY + radius * Math.sin(angle - Math.PI / 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(' ');
      svg += `<polygon points="${points}" fill="none" stroke="#e0e0e0" stroke-width="1"/>`;
    }

    // 绘制轴线和标签
    angles.forEach((angle, i) => {
      const axisX = centerX + maxRadius * Math.cos(angle - Math.PI / 2);
      const axisY = centerY + maxRadius * Math.sin(angle - Math.PI / 2);
      const labelX = centerX + (maxRadius + labelOffset) * Math.cos(angle - Math.PI / 2);
      const labelY = centerY + (maxRadius + labelOffset) * Math.sin(angle - Math.PI / 2);
      const shortLabel = labels[i].length > 5 ? labels[i].substring(0, 5) : labels[i];
      let anchor = 'middle';
      if (labelX > centerX + 20) anchor = 'start';
      else if (labelX < centerX - 20) anchor = 'end';
      
      
      svg += `<line x1="${centerX}" y1="${centerY}" x2="${axisX}" y2="${axisY}" stroke="#e0e0e0" stroke-width="1"/>`;
      svg += `<text x="${labelX}" y="${labelY}" text-anchor="${anchor}" dominant-baseline="middle" font-size="12" fill="#475569" class="kg-radar-tooltip" title="${labels[i]}">${shortLabel}</text>`;
    });

    // 绘制数据多边形
    const dataPoints = values.map((value, i) => {
      const ratio = value / maxValue;
      const x = centerX + ratio * maxRadius * Math.cos(angles[i] - Math.PI / 2);
      const y = centerY + ratio * maxRadius * Math.sin(angles[i] - Math.PI / 2);
      return `${x},${y}`;
    }).join(' ');
    svg += `<polygon points="${dataPoints}" fill="rgba(102,126,234,0.3)" stroke="#667eea" stroke-width="2"/>`;

    // 绘制数据点
    values.forEach((value, i) => {
      const x = centerX + (value / maxValue) * maxRadius * Math.cos(angles[i] - Math.PI / 2);
      const y = centerY + (value / maxValue) * maxRadius * Math.sin(angles[i] - Math.PI / 2);
      svg += `<circle cx="${x}" cy="${y}" r="4" fill="#667eea" class="kg-radar-tooltip" title="${labels[i]}: ${Math.round(value)}"/>`;
    });

    return svg;
  }

  getCategoriesFromDocs(state: PluginStateData): Record<string, number> {
    // 使用6个固定分类
    // arts - 人文艺术 Arts
    // social - 社会科学 Social Sciences
    // natural - 自然科学 Natural Sciences
    // applied - 应用技术 Applied Sciences
    // history - 人文历史 History & Geography
    // general - 综合杂项 Reference & General
    const categories: Record<string, number> = {
      arts: 0,        // 人文艺术
      social: 0,      // 社会科学
      natural: 0,     // 自然科学
      applied: 0,     // 应用技术
      history: 0,     // 人文历史
      general: 0      // 综合杂项
    };

    state.documents.forEach(doc => {
      // 优先使用新的6分类格式
      if (doc.categories && doc.categories['arts'] !== undefined) {
        Object.keys(categories).forEach(cat => {
          categories[cat as keyof typeof categories] += doc.categories[cat] || 0;
        });
      } else if (doc.categories) {
        // 兼容旧的DDC分类格式
        Object.keys(doc.categories).forEach(cat => {
          let normalizedCat = cat;
          
          // 映射旧分类到新分类
          if (cat === 'computer' || cat === 'technology' || cat === 'tech') normalizedCat = 'applied';
          if (cat === 'philosophy' || cat === 'religion') normalizedCat = 'social';
          if (cat === 'language') normalizedCat = 'arts';
          if (cat === 'literature') normalizedCat = 'arts';
          if (cat === 'economics' || cat === 'politics' || cat === 'social_sciences') normalizedCat = 'social';
          if (cat === 'culture') normalizedCat = 'arts';
          
          if (categories[normalizedCat as keyof typeof categories] !== undefined) {
            categories[normalizedCat as keyof typeof categories] += doc.categories[cat] || 0;
          }
        });
      }
    });

    const total = Object.values(categories).reduce((a, b) => a + b, 0);
    if (total === 0) {
      // 没有数据时返回全零对象，让雷达图显示"暂无数据"提示
      return { 
        arts: 0, 
        social: 0, 
        natural: 0, 
        applied: 0, 
        history: 0, 
        general: 0 
      };
    }

    return categories;
  }

  generateWordcloud(state: PluginStateData): string {
    const wordCounts: Record<string, number> = {};
    
    state.documents.forEach(doc => {
      doc.keywords?.forEach(keyword => {
        wordCounts[keyword] = (wordCounts[keyword] || 0) + 1;
      });
    });

    const words = Object.entries(wordCounts).sort((a, b) => b[1] - a[1]).slice(0, 20);
    
    if (words.length === 0) {
      return `<div style="text-align:center;padding:30px;color:#999;">暂无关键词数据</div>`;
    }

    const maxCount = Math.max(...words.map(w => w[1]));
    const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];
    
    let html = '<div class="kg-wordcloud" style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;min-height:120px;padding:10px;">';
    words.forEach(([word, count], index) => {
      const size = 14 + (count / maxCount) * 20;
      const color = colors[index % colors.length];
      const weight = 300 + (count / maxCount) * 400;
      html += `<span style="font-size:${size}px;color:${color};font-weight:${weight};cursor:pointer;padding:4px 8px;border-radius:4px;transition:transform 0.2s;" 
        title="${word}: ${count}次">${word}</span>`;
    });
    html += '</div>';
    
    return html;
  }

  extractKeywordsFromText(text: string): string[] {
    if (!text || text.trim() === '') {
      return [];
    }
    
    // 常见停用词列表（中英文）
    const stopWords = new Set([
      // 中文停用词
      '的', '了', '和', '是', '就', '都', '而', '及', '与', '着', '或', '一个', '没有', '我们', '你们', '他们', 
      '它们', '这个', '那个', '这些', '那些', '什么', '怎么', '为什么', '因为', '所以', '但是', '然而',
      '在', '上', '下', '左', '右', '前', '后', '中', '外', '里', '内', '间', '之', '以', '从', '到', '向',
      '对', '对于', '关于', '至于', '由于', '通过', '按照', '根据', '为了', '以便', '以免', '得以',
      '能', '能够', '会', '可以', '应该', '必须', '需要', '得', '要', '应', '该', '可', '须', '需',
      '不', '很', '也', '还', '又', '再', '更', '最', '太', '非常', '十分', '特别', '尤其', '格外',
      '已经', '曾经', '正在', '将要', '刚刚', '才', '刚', '就', '便', '即', '立即', '马上', '立刻',
      '这', '那', '此', '其', '某', '每', '各', '所有', '任何', '一些', '许多', '不少', '大量', '少量',
      // 英文停用词
      'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used',
      'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after',
      'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why',
      'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
      'so', 'than', 'too', 'very', 'just', 'but', 'if', 'or', 'because', 'until', 'while', 'about', 'against', 'among',
      'throughout', 'towards', 'upon', 'concerning', 'regarding', 'including', 'following', 'without', 'within'
    ]);
    
    // 匹配中文词和英文单词
    const chinesePattern = /[\u4e00-\u9fa5]{2,}/g;
    const englishPattern = /[a-zA-Z]{3,}/g;
    
    const chineseMatches = text.match(chinesePattern) || [];
    const englishMatches = text.match(englishPattern) || [];
    
    const allMatches = [...chineseMatches, ...englishMatches.map(w => w.toLowerCase())];
    
    // 统计词频
    const wordCounts: Record<string, number> = {};
    allMatches.forEach(word => {
      if (!stopWords.has(word)) {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      }
    });
    
    // 按词频排序，取前20个
    const sortedWords = Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word]) => word);
    
    return sortedWords;
  }

  parseKnowledgeFromText(text: string): Array<{name: string, category: string, summary: string}> {
    if (!text || text.trim() === '') {
      return [];
    }

    const items: Array<{name: string, category: string, summary: string}> = [];
    const isZh = this.plugin.getState().language === 'zh';
    // 根据语言设置默认分类
    const defaultCategory = isZh ? '延伸补充' : 'Obscure Supplementary';
    
    try {
      // 尝试解析JSON格式（兼容旧版本）
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // 非JSON格式，尝试从文本中提取
    }

    // 解析格式：
    // 英文格式：【Knowledge: XX】Knowledge content (Category: Similar/Upstream-Downstream/Obscure Supplementary)
    // 中文格式：【知识点：XX】知识点正文（所属分类：同类相似/上下游关联/延伸冷门）
    const lines = text.split('\n').filter(line => line.trim() !== '');

    for (const line of lines) {
      // 匹配英文格式：【Knowledge: XX】Content (Category: ...)
      const matchEnglish = line.match(/【Knowledge[：:]\s*(.+?)】(.+)/i);
      if (matchEnglish) {
        const name = matchEnglish[1].trim();
        let summary = matchEnglish[2].trim();
        let category = 'Obscure Supplementary'; // 默认分类
        
        // 从摘要中提取英文分类信息
        const categoryMatch = summary.match(/\(Category:\s*(Similar|Upstream-Downstream|Obscure Supplementary)\)/i);
        if (categoryMatch) {
          category = categoryMatch[1];
          // 从摘要中移除分类标记
          summary = summary.replace(/\(Category:\s*(Similar|Upstream-Downstream|Obscure Supplementary)\)/i, '').trim();
        }
        
        // 验证名称和概述长度
        if (name.length >= 2 && name.length <= 50 && summary.length >= 5) {
          items.push({
            name,
            category,
            summary
          });
        }
        continue;
      }
      
      // 匹配中文格式：【知识点：XX】知识点正文（所属分类：...）
      const matchChinese = line.match(/【知识点[：:](.+?)】(.+)/);
      if (matchChinese) {
        const name = matchChinese[1].trim();
        let summary = matchChinese[2].trim();
        let category = '延伸补充'; // 默认分类
        
        // 从摘要中提取中文分类信息
        const categoryMatch = summary.match(/所属分类[：:](同类相似|上下游关联|延伸冷门)/);
        if (categoryMatch) {
          category = categoryMatch[1];
          // 从摘要中移除分类标记
          summary = summary.replace(/所属分类[：:](同类相似|上下游关联|延伸冷门)/, '').trim();
        }
        
        // 验证名称和概述长度
        if (name.length >= 2 && name.length <= 50 && summary.length >= 5) {
          items.push({
            name,
            category,
            summary
          });
        }
        continue;
      }
      
      // 匹配旧格式：【XX】知识点正文（无分类标记）
      const matchOld = line.match(/^【(.+?)】(.+)/);
      if (matchOld && !line.includes('知识点：') && !line.includes('Knowledge:')) {
        const name = matchOld[1].trim();
        const summary = matchOld[2].trim();
        
        if (name.length >= 2 && name.length <= 50 && summary.length >= 5) {
          items.push({
            name,
            category: defaultCategory,
            summary
          });
        }
      }
    }

    // 如果没有成功解析，返回默认项
    if (items.length === 0) {
      items.push({
        name: this.t('knowledge_expansion'),
        category: this.t('category_other'),
        summary: text.substring(0, Math.min(200, text.length))
      });
    }

    return items;
  }

  generateWordcloudFromKeywords(keywords: string[]): string {
    if (keywords.length === 0) {
      return `<div style="text-align:center;padding:30px;color:#999;">暂无关键词数据</div>`;
    }

    const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];
    
    let html = '<div class="kg-wordcloud" style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;min-height:120px;padding:10px;">';
    keywords.forEach((word, index) => {
      const size = 14 + Math.random() * 16;
      const color = colors[index % colors.length];
      const weight = 400 + Math.random() * 300;
      html += `<span style="font-size:${size}px;color:${color};font-weight:${weight};cursor:pointer;padding:4px 8px;border-radius:4px;transition:transform 0.2s;opacity:${0.7 + Math.random() * 0.3};" 
        title="${word}">${word}</span>`;
    });
    html += '</div>';
    
    return html;
  }

  renderKnowledgeSphere(items: Array<{name: string, category: string, summary: string}>): string {
    if (items.length === 0) {
      const noDataText = this.plugin.getState().language === 'zh' ? '暂无知识扩展数据' : 'No knowledge expansion data';
      return `<div style="text-align:center;padding:30px;color:#999;">${noDataText}</div>`;
    }
    
    const isZh = this.plugin.getState().language === 'zh';
    const copyTitleText = isZh ? '📋 复制标题' : '📋 Copy Title';
    const viewDetailsText = isZh ? '🔍 查看详情' : '🔍 View Details';
    
    const categoryColors: Record<string, string> = {
      // 中文分类
      '同类相似': '#3b82f6',
      '上下游关联': '#10b981',
      '延伸补充': '#8b5cf6',
      '延伸冷门': '#ec4899',
      '其他': '#6b7280',
      // 英文分类
      'Similar': '#3b82f6',
      'Upstream-Downstream': '#10b981',
      'Obscure Supplementary': '#8b5cf6',
      'Other': '#6b7280',
    };
    
    let html = `
      <style>
        .kg-knowledge-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 16px;
        }
        
        .kg-knowledge-item {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 16px;
          background: linear-gradient(135deg, #f8f9fa 0%, #f0f4ff 100%);
          border-radius: 12px;
          border-left: 4px solid #6b7280;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        
        .kg-knowledge-item::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, var(--item-color, #6b7280), transparent);
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        
        .kg-knowledge-item:hover {
          background: linear-gradient(135deg, #f0f4ff 0%, #e8eeff 100%);
          transform: translateX(6px) scale(1.01);
          box-shadow: 0 4px 16px rgba(99, 102, 241, 0.15);
        }
        
        .kg-knowledge-item:hover::before {
          opacity: 1;
        }
        
        .theme-dark .kg-knowledge-item {
          background: linear-gradient(135deg, #374151 0%, #1f2937 100%);
        }
        
        .theme-dark .kg-knowledge-item:hover {
          background: linear-gradient(135deg, #4b5563 0%, #374151 100%);
        }
        
        .kg-knowledge-item-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        
        .kg-knowledge-item-name {
          font-weight: 600;
          font-size: 15px;
          color: var(--kg-text, #1f2937);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .theme-dark .kg-knowledge-item-name {
          color: var(--kg-text, #f9fafb);
        }
        
        .kg-knowledge-item-badge {
          display: inline-flex;
          align-items: center;
          padding: 2px 8px;
          background: var(--item-color, #6b7280);
          color: white;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 500;
        }
        
        .kg-knowledge-item-summary {
          font-size: 13px;
          color: var(--kg-text-secondary, #6b7280);
          line-height: 1.6;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
        
        .theme-dark .kg-knowledge-item-summary {
          color: var(--kg-text-secondary, #d1d5db);
        }
        
        .kg-knowledge-item-actions {
          display: none;
          gap: 8px;
          margin-top: 8px;
        }
        
        .kg-knowledge-item:hover .kg-knowledge-item-actions {
          display: flex;
        }
        
        .kg-knowledge-action-btn {
          padding: 6px 12px;
          font-size: 12px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .kg-knowledge-action-btn.primary {
          background: var(--kg-primary-color, #6366f1);
          color: white;
        }
        
        .kg-knowledge-action-btn.secondary {
          background: var(--kg-bg-secondary, #e5e7eb);
          color: var(--kg-text-secondary, #6b7280);
        }
        
        .kg-knowledge-action-btn:hover {
          transform: scale(1.05);
        }
        
        .theme-dark .kg-knowledge-action-btn.secondary {
          background: var(--kg-bg-secondary, #4b5563);
          color: var(--kg-text-secondary, #d1d5db);
        }
      </style>
      
      <div class="kg-knowledge-list">`;
    
    items.forEach((item, index) => {
      const color = categoryColors[item.category] || '#6b7280';
      
      // 对字符串进行HTML属性安全转义
      const safeName = this.escapeHtmlForAttribute(item.name);
      const safeCategory = this.escapeHtmlForAttribute(item.category);
      const safeSummary = this.escapeHtmlForAttribute(item.summary);
      const safeColor = this.escapeHtmlForAttribute(color);
      
      html += `
        <div class="kg-knowledge-item" 
             style="--item-color: ${color};"
             onclick='window.showKnowledgeCard("${safeName}", "${safeCategory}", "${safeColor}", "${safeSummary}")'>
          <div class="kg-knowledge-item-header">
            <div class="kg-knowledge-item-name">
              <span style="color: ${color};">◆</span>
              ${item.name}
            </div>
            <span class="kg-knowledge-item-badge" style="background: ${color};">${item.category}</span>
          </div>
          <div class="kg-knowledge-item-summary">${item.summary}</div>
          <div class="kg-knowledge-item-actions">
            <button class="kg-knowledge-action-btn primary" onclick='(event || window.event).stopPropagation();window.copyKnowledgeTitle("${safeName}", this)'>
              ${copyTitleText}
            </button>
            <button class="kg-knowledge-action-btn secondary" onclick='(event || window.event).stopPropagation();window.showKnowledgeCard("${safeName}", "${safeCategory}", "${safeColor}", "${safeSummary}")'>
              ${viewDetailsText}
            </button>
          </div>
        </div>`;
    });
    
    html += `
      </div>`;
    
    return html;
  }

  /**
   * 转义HTML属性中的特殊字符，确保在onclick等属性中安全使用
   */
  escapeHtmlForAttribute(str: string): string {
    if (!str) return '';
    return str
      .replace(/\\/g, '\\\\')  // 先转义反斜杠
      .replace(/"/g, '\\"')    // 转义双引号
      .replace(/'/g, "\\'")    // 转义单引号
      .replace(/\n/g, '\\n')   // 转义换行符
      .replace(/\r/g, '\\r')   // 转义回车符
      .replace(/</g, '&lt;')   // 转义小于号
      .replace(/>/g, '&gt;');  // 转义大于号
  }

  /**
   * 更新知识扩展区域的显示
   * 当插件启动时异步完成知识扩展后，调用此方法更新UI显示
   */
  updateKnowledgeDisplay(knowledgeItems: Array<{name: string; category: string; summary: string}>): void {
    const outputDiv = this.contentEl.querySelector('#knowledgeOutput');
    if (outputDiv) {
      if (knowledgeItems.length > 0) {
        outputDiv.replaceChildren();
        outputDiv.appendChild(parseHtml(this.renderKnowledgeSphere(knowledgeItems)));
        // 重新注册知识卡片函数，确保点击事件生效
        this.initKnowledgeCardFunctions();
      } else {
        outputDiv.replaceChildren();
        outputDiv.appendChild(parseHtml('<div style="text-align:center;padding:40px;color:#94a3b8;">' + this.t('no_data') + '</div>'));
      }
    }
  }

  /**
   * 显示知识扩展加载状态
   */
  showKnowledgeLoading(): void {
    const outputDiv = this.contentEl.querySelector('#knowledgeOutput');
    if (outputDiv) {
      outputDiv.replaceChildren();
      outputDiv.appendChild(parseHtml(`
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px;color:#667eea;">
          <div style="width:40px;height:40px;border:3px solid #e2e8f0;border-top-color:#667eea;border-radius:50%;animation:spin 1s linear infinite;margin-bottom:16px;"></div>
          <div style="font-size:14px;">${this.t('analyzing')}</div>
          <div style="font-size:12px;color:#94a3b8;margin-top:4px;">${this.t('knowledge_expansion_desc')}</div>
        </div>
        <style>@keyframes spin {to {transform:rotate(360deg);}}</style>
      `));
    }
  }

  renderSettings(body: HTMLElement) {
    const state = this.plugin.getState();
    const hasFullAccess = this.plugin.hasFullAccess();

    const settingsHtml = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--kg-border-color, #e0e0e0);">
        <h3 style="margin:0;font-size:16px;font-weight:600;">${this.t('settings')}</h3>
        <button class="kg-btn primary" id="saveSettingsBtn">${this.t('save_settings')}</button>
      </div>

      <div class="kg-setting-section">
        <h4>${this.t('local_model')}</h4>
        <div class="kg-setting-row"><label>${this.t('api_address')}</label><input type="text" id="localApiAddress" value="${state.localModel.apiAddress}"></div>
        <div class="kg-setting-row"><label>${this.t('port')}</label><input type="number" id="localPort" value="${state.localModel.port}"></div>
        <div class="kg-setting-row"><label>${this.t('model_name')}</label><input type="text" id="localModel" value="${state.localModel.model}"></div>
        <div class="kg-setting-row">
          <label class="kg-setting-row-label">
            ${this.t('api_path')}
            <span class="kg-tooltip">
              <span class="kg-tooltip-icon">?</span>
              <span class="kg-tooltip-text">${state.language === 'zh' ? '不同模型版本可能使用不同的API端点，如 /api/generate 或 /api/chat，请根据实际情况调整' : 'Different model versions may use different API endpoints, such as /api/generate or /api/chat, please adjust according to your situation'}</span>
            </span>
          </label>
          <input type="text" id="localApiPath" value="${state.localModel.apiPath}" placeholder="/api/generate">
        </div>
        <button class="kg-btn secondary" id="testLocalBtn" style="margin-top:8px;">${this.t('test_connection')}</button>
      </div>

      <div class="kg-setting-section ${hasFullAccess ? '' : 'kg-locked'}">
        <h4>${this.t('external_model')} ${!hasFullAccess ? '⭐ Pro' : ''}</h4>
        <div class="kg-setting-row">
          <label class="kg-setting-row-label">
            ${this.t('api_type')}
            <span class="kg-tooltip">
              <span class="kg-tooltip-icon">?</span>
              <span class="kg-tooltip-text">${state.language === 'zh' ? '选择 API 提供商：OpenAI 兼容 API、Anthropic Claude API 或 Ollama 本地' : 'Select API provider: OpenAI compatible API, Anthropic Claude API, or Ollama local'}</span>
            </span>
          </label>
          <select id="providerType" class="kg-api-type-select" ${!hasFullAccess ? 'disabled' : ''}>
            <option value="openai" ${state.externalModel.providerType === 'openai' ? 'selected' : ''}>${this.t('api_type_openai') || 'OpenAI 兼容'}</option>
            <option value="anthropic" ${state.externalModel.providerType === 'anthropic' ? 'selected' : ''}>${this.t('api_type_anthropic') || 'Anthropic 兼容'}</option>
            <option value="ollama" ${state.externalModel.providerType === 'ollama' ? 'selected' : ''}>${this.t('api_type_ollama') || 'Ollama 本地'}</option>
          </select>
        </div>
        <div class="kg-setting-row">
          <label class="kg-setting-row-label">
            ${this.t('api_base')}
            <span class="kg-tooltip">
              <span class="kg-tooltip-icon">?</span>
              <span class="kg-tooltip-text">${state.language === 'zh' ? 'API 基础 URL 地址。切换提供商将自动填入默认地址' : 'API base URL. Switching provider will auto-fill the default URL'}</span>
            </span>
          </label>
          <input type="text" id="externalApiBase" value="${state.externalModel.apiBase}" ${!hasFullAccess ? 'disabled' : ''}>
        </div>
        <div class="kg-setting-row">
          <label class="kg-setting-row-label">
            ${this.t('api_key')}
            <span class="kg-tooltip">
              <span class="kg-tooltip-icon">?</span>
              <span class="kg-tooltip-text">${state.language === 'zh' ? 'API 密钥，用于身份验证。Ollama 本地模式通常不需要' : 'API key for authentication. Usually not required for Ollama local'}</span>
            </span>
          </label>
          <input type="password" id="externalApiKey" value="${state.externalModel.apiKey}" ${!hasFullAccess ? 'disabled' : ''} placeholder="${state.externalModel.providerType === 'ollama' ? 'Not required for Ollama' : ''}">
        </div>
        <div class="kg-setting-row">
          <label class="kg-setting-row-label">
            ${this.t('model_name')}
            <span class="kg-tooltip">
              <span class="kg-tooltip-icon">?</span>
              <span class="kg-tooltip-text">${state.language === 'zh' ? '模型名称，如 gpt-4o、claude-3-5-sonnet、llama3.2 等' : 'Model name, e.g. gpt-4o, claude-3-5-sonnet, llama3.2, etc.'}</span>
            </span>
          </label>
          <input type="text" id="externalModel" value="${state.externalModel.model}" ${!hasFullAccess ? 'disabled' : ''} placeholder="${state.externalModel.providerType === 'ollama' ? 'llama3.2' : state.externalModel.providerType === 'anthropic' ? 'claude-3-5-sonnet-20241022' : 'gpt-4o'}">
        </div>
        <div style="display:flex;gap:8px;margin-top:8px;">
          <button class="kg-btn secondary" id="testExternalBtn" ${!hasFullAccess ? 'disabled' : ''}>🔗 ${this.t('test_connection') || 'Test Connection'}</button>
        </div>
      </div>

      <div class="kg-setting-section ${hasFullAccess ? '' : 'kg-locked'}">
        <h4>
          ${this.t('document_parse_prompt')} ${!hasFullAccess ? '⭐ Pro' : ''}
          <span class="kg-tooltip">
            <span class="kg-tooltip-icon">?</span>
            <span class="kg-tooltip-text">${state.language === 'zh' ? '文档解析提示词用于指导 AI 模型从文档中提取结构化信息' : 'Document parsing prompt guides AI model to extract structured information from documents'}</span>
          </span>
          <button id="resetPromptsBtn" class="kg-btn kg-btn-secondary" style="margin-left: 12px; padding: 4px 12px; font-size: 12px;">
            🔄 ${state.language === 'zh' ? '恢复默认' : 'Restore Defaults'}
          </button>
        </h4>
        <textarea id="document_parse_prompt" rows="6" class="kg-prompt-input" style="min-height: 120px;" ${!hasFullAccess ? 'disabled' : ''}>${state.promptConfig.systemPrompt || `You are a professional knowledge graph construction and structured parsing assistant. Your task is to extract entities, mine relationships, summarize content, and extract tags from any text. All output must be in standard Markdown format, NOT JSON.

Mandatory Format Rules:
1. Add HTML comment DocID at the beginning: <!-- docid: [32-character random unique string] -->
2. Generate standard timestamp
3. Summary ≤ 100 words, accurately summarizing core content
4. Keep 3-8 core keyword tags
5. Entities include: ID, Name, Type, Description
6. Relationships must be clear, semantically standard, and non-redundant
7. Keep full original text at the bottom

Fixed Output Structure (Strictly Follow):
<!-- docid: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx -->
Knowledge Graph Structured Parsing Result

## I. Content Summary
(Core summary of the full text, ≤100 words)

## II. Keyword Tags
- Tag 1
- Tag 2
- Tag 3

## III. Basic Information
- Document ID: (same as docid in header)
- Generated Timestamp: (numeric timestamp)

## IV. Entity Library
Entity ID | Entity Name | Entity Type | Entity Description
entity_001 | - | - | -

## V. Entity Relationship Graph
Source Entity ID | Target Entity ID | Relationship Type
entity_001 | entity_002 | semantic relationship

## VI. Original Text
Full original user input text`}</textarea>
        
        <h4 style="margin-top:12px;">
          ${this.t('user_prompt')} ${!hasFullAccess ? '⭐ Pro' : ''}
          <span class="kg-tooltip">
            <span class="kg-tooltip-icon">?</span>
            <span class="kg-tooltip-text">${state.language === 'zh' ? '用户提示模板定义了向 AI 提交的输入格式，包含待分析的文档内容占位符' : 'User prompt template defines the input format for AI analysis, including placeholders for document content'}</span>
          </span>
        </h4>
        <textarea id="user_prompt" rows="4" class="kg-prompt-input" style="min-height: 80px;" ${!hasFullAccess ? 'disabled' : ''}>${state.promptConfig.userPromptTemplate || `Text to parse:
{{text}}`}</textarea>
        
        <h4 style="margin-top:12px;">
          ${this.t('knowledge_prompt')} ${!hasFullAccess ? '⭐ Pro' : ''}
          <span class="kg-tooltip">
            <span class="kg-tooltip-icon">?</span>
            <span class="kg-tooltip-text">${state.language === 'zh' ? '知识扩展提示词用于指导 AI 进行知识衍生和补充，帮助发现缺失的知识点' : 'Knowledge expansion prompt guides AI to derive and supplement knowledge, helping discover missing knowledge points'}</span>
          </span>
        </h4>
        <textarea id="knowledge_prompt" rows="6" class="kg-prompt-input" style="min-height: 120px;" ${!hasFullAccess ? 'disabled' : ''}>${state.promptConfig.knowledgePrompt || ''}</textarea>
        
        <h4 style="margin-top:12px;">
          ${this.t('model_query_prompt')} ${!hasFullAccess ? '⭐ Pro' : ''}
          <span class="kg-tooltip">
            <span class="kg-tooltip-icon">?</span>
            <span class="kg-tooltip-text">${this.t('model_query_prompt_desc')}</span>
          </span>
        </h4>
        <textarea id="model_query_prompt" rows="6" class="kg-prompt-input" style="min-height: 120px;" ${!hasFullAccess ? 'disabled' : ''}>${state.promptConfig.modelQueryPrompt || ''}</textarea>
      </div>

      <div class="kg-setting-section">
        <h4>${this.t('subscription_status')}</h4>
        <div class="kg-subscription-info">
          <p><strong>${this.t('version')}：</strong>${state.isPro ? `✅ ${this.t('pro_version')}` : this.plugin.isTrialActive() ? `⏳ ${this.t('trial_active')}` : `🔒 ${this.t('free_version')}`}</p>
          <p><strong>${this.t('device_id')}：</strong><span class="kg-device-id">${state.deviceId}</span><button class="kg-copy-btn" id="copyDeviceId">📋</button></p>
          <p><strong>${this.t('document_count')}：</strong>${state.documents.length}</p>
          <p><strong>${this.t('entity_count')}：</strong>${state.entities.length}</p>
          ${state.expiresAt ? `<p><strong>${this.t('expires_at')}：</strong>${new Date(state.expiresAt).toLocaleDateString()}</p>` : ''}
        </div>
      </div>

      
    `;
    body.replaceChildren();
    body.appendChild(parseHtml(settingsHtml));

    body.querySelector('#copyDeviceId')?.addEventListener('click', () => {
      navigator.clipboard.writeText(state.deviceId);
      new Notice(this.t('copied'), 1000);
    });

    body.querySelector('#testLocalBtn')?.addEventListener('click', async () => {
      const apiAddress = (body.querySelector('#localApiAddress') as unknown as HTMLInputElement).value;
      const port = (body.querySelector('#localPort') as unknown as HTMLInputElement).value;
      try {
        const res = await requestUrl(`${apiAddress}:${port}/api/tags`);
        if (res.status === 200) {
          new Notice('✅ Connected!', 2000);
        } else {
          new Notice('❌ Connection failed', 2000);
        }
      } catch {
        new Notice('❌ Cannot connect', 2000);
      }
    });

    body.querySelector('#providerType')?.addEventListener('change', (e) => {
      const newType = (e.target as unknown as HTMLSelectElement).value;
      const baseInput = body.querySelector('#externalApiBase') as unknown as HTMLInputElement | null;
      const modelInput = body.querySelector('#externalModel') as unknown as HTMLInputElement | null;
      const keyInput = body.querySelector('#externalApiKey') as unknown as HTMLInputElement | null;
      
      const defaults: Record<string, { apiBase: string; model: string }> = {
        openai: { apiBase: 'https://api.openai.com/v1', model: 'gpt-4o' },
        anthropic: { apiBase: 'https://api.anthropic.com', model: 'claude-3-5-sonnet-20241022' },
        ollama: { apiBase: 'http://localhost:11434', model: 'llama3.2' }
      };
      
      const preset = defaults[newType] || defaults.openai;
      if (baseInput && (!baseInput.value || baseInput.value === '' || this.plugin.getState().externalModel.apiBase === '')) {
        baseInput.value = preset.apiBase;
      }
      if (modelInput && (!modelInput.value || modelInput.value === '')) {
        modelInput.value = preset.model;
      }
      if (keyInput) {
        keyInput.placeholder = newType === 'ollama' ? 'Not required for Ollama' : '';
      }
    });

    body.querySelector('#testExternalBtn')?.addEventListener('click', async () => {
      const providerType = (body.querySelector('#providerType') as unknown as HTMLSelectElement).value;
      const apiBase = (body.querySelector('#externalApiBase') as unknown as HTMLInputElement).value;
      const apiKey = (body.querySelector('#externalApiKey') as unknown as HTMLInputElement).value;
      const model = (body.querySelector('#externalModel') as unknown as HTMLInputElement).value;
      
      if (!apiBase) {
        new Notice(state.language === 'zh' ? '请输入 API 基础地址' : 'Please enter API base URL', 2000);
        return;
      }
      if (!model) {
        new Notice(state.language === 'zh' ? '请输入模型名称' : 'Please enter model name', 2000);
        return;
      }
      
      const btn = body.querySelector('#testExternalBtn') as unknown as HTMLButtonElement;
      const originalText = btn.textContent;
      btn.textContent = '⏳ Testing...';
      btn.disabled = true;
      
      try {
        let targetUrl: string;
        let headers: Record<string, string>;
        let bodyData: any;
        
        if (providerType === 'anthropic') {
          targetUrl = `${apiBase.replace(/\/$/, '')}/v1/messages`;
          headers = {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
          };
          bodyData = {
            model,
            max_tokens: 50,
            messages: [{ role: 'user', content: 'Hi' }]
          };
        } else if (providerType === 'ollama') {
          targetUrl = `${apiBase.replace(/\/$/, '')}/api/generate`;
          headers = { 'Content-Type': 'application/json' };
          bodyData = { model, prompt: 'Hi', stream: false };
        } else {
          targetUrl = `${apiBase.replace(/\/$/, '')}/chat/completions`;
          headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          };
          bodyData = {
            model,
            messages: [{ role: 'user', content: 'Hi' }],
            max_tokens: 50
          };
        }
        
        const res = await requestUrl({ url: targetUrl, method: 'POST', headers, body: JSON.stringify(bodyData) });
        
        if (res.status >= 200 && res.status < 300) {
          new Notice(state.language === 'zh' ? '✅ 连接成功！' : '✅ Connected!', 2000);
        } else {
          const errText = res.text ? JSON.parse(res.text)?.error?.message || res.text : `HTTP ${res.status}`;
          new Notice(`❌ ${errText}`, 3000);
        }
      } catch (err: any) {
        new Notice(`❌ ${err?.message || 'Connection failed'}`, 3000);
      } finally {
        btn.textContent = originalText;
        btn.disabled = false;
      }
    });

    body.querySelector('#resetPromptsBtn')?.addEventListener('click', async () => {
      const confirmed = await this.showConfirmDialog(
        state.language === 'zh' ? '确认操作' : 'Confirm',
        state.language === 'zh' ? '确定要恢复所有默认提示词吗？此操作无法撤销。' : 'Are you sure you want to restore all default prompts? This action cannot be undone.'
      );
      if (confirmed) {
        const isZh = state.language === 'zh';

        const zhSystemPrompt = `你是一名专业的知识图谱构建和结构化解析助手。你的任务是从任意文本中提取实体、挖掘关系、总结内容和提取标签。所有输出必须采用标准Markdown格式，NOT JSON。

## 输出格式规则：
1. 在开头添加HTML注释DocID：<!-- docid: [32位随机唯一字符串] -->
2. 生成标准时间戳
3. 摘要 ≤ 100字，准确概括核心内容
4. 保留3-8个核心关键词标签
5. 实体包含：ID、名称、类型、描述
6. 关系必须清晰、语义规范、非冗余
7. 在底部保留完整原始文本

## 实体类型参考（必须从以下类型中选择）：
- 人物：个人、角色、用户
- 组织：公司、机构、团体
- 地点：城市、国家、场所
- 概念：思想、理论、抽象概念
- 事件：历史事件、活动、会议
- 文档：文章、书籍、论文
- 产品：商品、软件、硬件
- 技术：技术、方法、工具
- 时间：日期、时间段
- 金钱：金额、货币
- 学术：研究领域、学科
- 行业：产业、行业
- 疾病：病症、健康问题
- 药物：药品、治疗方法
- 食物：食材、菜肴

## 关系类型参考（必须从以下类型中选择）：
- 属于、包含、组成、子类、父类（层级关系）
- 相关、相似、衍生（关联关系）
- 导致、影响、促进、阻碍（因果关系）
- 先于、后于、同时（时序关系）
- 位于、拥有、使用、创建、合作（其他关系）

## 固定输出结构（严格遵守）：
<!-- docid: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx -->
知识图谱结构化解析结果

## 一、摘要
（全文核心总结，≤100字）

## 二、关键词标签
- 标签1
- 标签2
- 标签3

## 三、基本信息
- 文档ID：（与头部的docid相同）
- 生成时间戳：（数字时间戳）

## 四、实体库
实体ID | 实体名称 | 实体类型 | 实体描述
entity_001 | - | - | -

## 五、实体关系图谱
源实体ID | 目标实体ID | 关系类型
entity_001 | entity_002 | 语义关系

## 六、原始文本
完整的用户输入原始文本`;

        const enSystemPrompt = `You are a professional knowledge graph construction and structured parsing assistant. Your task is to extract entities, mine relationships, summarize content, and extract tags from any text. All output must be in standard Markdown format, NOT JSON.

## Output Format Rules:
1. Add HTML comment DocID at the beginning: <!-- docid: [32-character random unique string] -->
2. Generate standard timestamp
3. Summary ≤ 100 words, accurately summarizing core content
4. Keep 3-8 core keyword tags
5. Entities include: ID, Name, Type, Description
6. Relationships must be clear, semantically standard, and non-redundant
7. Keep full original text at the bottom

## Entity Type Reference (Must choose from the following):
- Person: Individual, character, user
- Organization: Company, institution, group
- Location: City, country, place
- Concept: Idea, theory, abstract concept
- Event: Historical event, activity, meeting
- Document: Article, book, paper
- Product: Product, software, hardware
- Technology: Technology, method, tool
- Time: Date, time period
- Money: Amount, currency
- Academic: Research field, discipline
- Industry: Industry, sector
- Disease: Illness, health issue
- Medicine: Drug, treatment
- Food: Ingredient, dish

## Relationship Type Reference (Must choose from the following):
- BelongsTo, Contains, ComposedOf, SubclassOf, ParentOf (Hierarchical)
- RelatedTo, SimilarTo, DerivedFrom (Association)
- Causes, Influences, Promotes, Blocks (Causal)
- Before, After, Concurrent (Temporal)
- LocatedAt, Owns, Uses, CreatedBy, CooperatesWith (Other)

## Fixed Output Structure (Strictly Follow):
<!-- docid: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx -->
Knowledge Graph Structured Parsing Result

## I. Content Summary
(Core summary of the full text, ≤100 words)

## II. Keyword Tags
- Tag 1
- Tag 2
- Tag 3

## III. Basic Information
- Document ID: (same as docid in header)
- Generated Timestamp: (numeric timestamp)

## IV. Entity Library
Entity ID | Entity Name | Entity Type | Entity Description
entity_001 | - | - | -

## V. Entity Relationship Graph
Source Entity ID | Target Entity ID | Relationship Type
entity_001 | entity_002 | semantic relationship

## VI. Original Text
Full original user input text`;

        const defaultSystemPrompt = isZh ? zhSystemPrompt : enSystemPrompt;
        const defaultUserPromptTemplate = isZh ? `请分析以下文档内容：
{content}` : `Please analyze the following document content:
{content}`;

        const zhKnowledgePrompt = `你是一名专业的知识扩展助手。根据用户提供的原始内容，遵循3条规则进行知识延伸：
1. 扩展维度分为三类：相似知识、上下游关联知识、延伸补充知识。不重复原文已有信息。
2. 输出固定20个独立知识点。每个知识点要简洁、逻辑独立，并标注扩展类别。
3. 每个知识点包含：简要概念+关键细节，无冗余词，格式统一。

以下是待扩展的原始内容：
{content}`;

        const enKnowledgePrompt = `You are a professional knowledge expansion assistant. Based on the original content provided by the user, you extend knowledge following 3 rules:
1. Expansion dimensions are divided into three categories: similar knowledge, upstream/downstream related knowledge, and obscure supplementary knowledge. Do not repeat information already in the original text.
2. Output a fixed 20 independent knowledge points. Each point should be concise, logically independent, and marked with its expansion category.
3. Each knowledge point includes: brief concept + key details, no redundant words, unified format.

The following is the original content to be expanded:
{content}`;

        const defaultKnowledgePrompt = isZh ? zhKnowledgePrompt : enKnowledgePrompt;

        const zhModelQueryPrompt = `你是一位知识渊博的专家。你的核心目标是为给定的术语/概念提供详细、全面、深入的介绍和解释。

## 核心任务：
当用户提供一个术语/概念/专业词汇时，你需要提供全面的知识介绍和解释。

## 详细介绍维度：
1. **基本定义**：提供准确完整的定义
2. **发展历史**：追溯起源和演变过程
3. **核心原理**：解释基本原理和工作机制
4. **主要特点**：列出关键特性和重要属性
5. **应用场景**：描述实际应用和使用领域
6. **相关概念**：联系其他相关概念和理论
7. **重要人物/事件**：如有相关的创始人及里程碑事件，请提及
8. **发展趋势**：探讨未来发展方向和研究趋势

## 输出要求：
- 语言准确、清晰、通俗易懂
- 内容全面深入
- 逻辑清晰、层次分明
- 适当使用专业术语但要解释清楚`;

        const enModelQueryPrompt = `You are a knowledgeable expert. Your core goal is to provide detailed, comprehensive, and in-depth introductions and explanations for given terms.

## Core Task:
When users provide a term/concept/terminology, you need to provide comprehensive knowledge introduction and explanation.

## Detailed Introduction Dimensions:
1. **Basic Definition**: Provide accurate and complete definition
2. **Development History**: Trace origins and evolution process
3. **Core Principles**: Explain fundamental principles and working mechanisms
4. **Main Features**: List key characteristics and important attributes
5. **Application Scenarios**: Describe practical applications and usage areas
6. **Related Concepts**: Connect with other related concepts and theories
7. **Important People/Events**: Mention relevant founders and milestone events if applicable
8. **Development Trends**: Discuss future development and research directions

## Output Requirements:
- Accurate, clear, and easy to understand language
- Comprehensive and in-depth content
- Clear logic and hierarchical structure
- Appropriately use professional terminology but explain clearly`;

        const defaultModelQueryPrompt = isZh ? zhModelQueryPrompt : enModelQueryPrompt;

        (body.querySelector('#document_parse_prompt') as unknown as HTMLTextAreaElement).value = defaultSystemPrompt;
        (body.querySelector('#user_prompt') as unknown as HTMLTextAreaElement).value = defaultUserPromptTemplate;
        (body.querySelector('#knowledge_prompt') as unknown as HTMLTextAreaElement).value = defaultKnowledgePrompt;
        (body.querySelector('#model_query_prompt') as unknown as HTMLTextAreaElement).value = defaultModelQueryPrompt;

        const newState = { ...state };
        newState.promptConfig.systemPrompt = defaultSystemPrompt;
        newState.promptConfig.userPromptTemplate = defaultUserPromptTemplate;
        newState.promptConfig.knowledgePrompt = defaultKnowledgePrompt;
        newState.promptConfig.modelQueryPrompt = defaultModelQueryPrompt;
        await this.plugin.saveStateData(newState);

        new Notice(state.language === 'zh' ? '✅ 已恢复默认提示词' : '✅ Default prompts restored', 2000);
      }
    });

    body.querySelector('#saveSettingsBtn')?.addEventListener('click', async () => {
      const newState = { ...state };
      newState.localModel.apiAddress = (body.querySelector('#localApiAddress') as unknown as unknown as HTMLInputElement).value;
      newState.localModel.port = parseInt((body.querySelector('#localPort') as unknown as unknown as HTMLInputElement).value) || 11434;
      newState.localModel.model = (body.querySelector('#localModel') as unknown as unknown as HTMLInputElement).value;
      newState.localModel.apiPath = (body.querySelector('#localApiPath') as unknown as unknown as HTMLInputElement).value;
      const apiBaseUrlInput = body.querySelector('#apiBaseUrl') as unknown as unknown as HTMLInputElement;
      if (apiBaseUrlInput) {
        newState.apiBaseUrl = apiBaseUrlInput.value;
      }

      if (hasFullAccess) {
        newState.externalModel.providerType = (body.querySelector('#providerType') as unknown as unknown as HTMLSelectElement).value;
        newState.externalModel.apiBase = (body.querySelector('#externalApiBase') as unknown as unknown as HTMLInputElement).value;
        newState.externalModel.apiKey = (body.querySelector('#externalApiKey') as unknown as unknown as HTMLInputElement).value;
        newState.externalModel.model = (body.querySelector('#externalModel') as unknown as unknown as HTMLInputElement).value;
        newState.promptConfig.systemPrompt = (body.querySelector('#document_parse_prompt') as unknown as unknown as HTMLTextAreaElement).value;
        newState.promptConfig.userPromptTemplate = (body.querySelector('#user_prompt') as unknown as unknown as HTMLTextAreaElement).value;
        newState.promptConfig.knowledgePrompt = (body.querySelector('#knowledge_prompt') as unknown as unknown as HTMLTextAreaElement).value;
        newState.promptConfig.modelQueryPrompt = (body.querySelector('#model_query_prompt') as unknown as unknown as HTMLTextAreaElement).value;  // 问AI
      }

      await this.plugin.saveStateData(newState);
      new Notice(this.t('settings_saved'), 2000);
    });
  }

  createProgressBar(parent: HTMLElement): ProgressBar {
    const bar = el('div', { cls: 'kg-progress-container' });
    const barHtml = `
      <style>
        .kg-progress-container { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 1000; background: white; padding: 24px; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); min-width: 300px; }
        .kg-progress-bar { height: 8px; background: #eee; border-radius: 4px; overflow: hidden; margin-bottom: 12px; }
        .kg-progress-fill { height: 100%; background: linear-gradient(90deg, #667eea, #764ba2); transition: width 0.3s; }
        .kg-progress-text { text-align: center; font-size: 14px; color: #666; }
      </style>
      <div class="kg-progress-bar"><div class="kg-progress-fill"></div></div>
      <div class="kg-progress-text"></div>
    `;
    bar.appendChild(parseHtml(barHtml));
    parent.appendChild(bar);

    return {
      update: (percent: number, text: string) => {
        const fill = bar.querySelector('.kg-progress-fill') as unknown as HTMLElement;
        const textEl = bar.querySelector('.kg-progress-text') as unknown as HTMLElement;
        fill.setCssProps({ width: `${percent}%` });
        textEl.textContent = text;
      },
      remove: () => bar.remove()
    };
  }

  async showConfirmDialog(title: string, message: string): Promise<boolean> {
    return new Promise((resolve) => {
      const backdrop = el('div', { cls: 'kg-confirm-backdrop' });
      applyCssText(backdrop, `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        z-index: 999;
        backdrop-filter: blur(4px);
      `);
      
      const dialog = el('div', { cls: 'kg-confirm-dialog' });
      const dialogHtml = `
        <style>
          .kg-confirm-dialog { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 1000; background: var(--modal-bg, #ffffff); padding: 24px; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); min-width: 320px; max-width: 480px; }
          .kg-confirm-title { font-size: 18px; font-weight: 600; margin-bottom: 12px; color: var(--text-normal); }
          .kg-confirm-message { font-size: 14px; color: var(--text-muted); margin-bottom: 20px; line-height: 1.5; }
          .kg-confirm-buttons { display: flex; gap: 12px; justify-content: flex-end; }
          .kg-confirm-btn { padding: 8px 16px; border-radius: 6px; font-size: 14px; cursor: pointer; transition: all 0.2s; }
          .kg-confirm-btn.cancel { background: var(--background-secondary); color: var(--text-normal); border: 1px solid var(--background-modifier-border); }
          .kg-confirm-btn.cancel:hover { background: var(--background-hover); }
          .kg-confirm-btn.confirm { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; }
          .kg-confirm-btn.confirm:hover { opacity: 0.9; transform: scale(1.02); }
        </style>
        <div class="kg-confirm-title">${title}</div>
        <div class="kg-confirm-message">${message}</div>
        <div class="kg-confirm-buttons">
          <button class="kg-confirm-btn cancel">${this.t('cancel')}</button>
          <button class="kg-confirm-btn confirm">${this.t('confirm')}</button>
        </div>
      `;
      dialog.appendChild(parseHtml(dialogHtml));
      
      document.body.appendChild(backdrop as unknown as Node);
      document.body.appendChild(dialog as unknown as Node);
      
      const cancelBtn = dialog.querySelector('.kg-confirm-btn.cancel') as unknown as HTMLElement;
      const confirmBtn = dialog.querySelector('.kg-confirm-btn.confirm') as unknown as HTMLElement;
      
      const cleanup = () => {
        backdrop.remove();
        dialog.remove();
      };
      
      cancelBtn.addEventListener('click', () => {
        cleanup();
        resolve(false);
      });
      
      confirmBtn.addEventListener('click', () => {
        cleanup();
        resolve(true);
      });
      
      backdrop.addEventListener('click', () => {
        cleanup();
        resolve(false);
      });
    });
  }

  delay(ms: number): Promise<void> {
    return new Promise(resolve => window.setTimeout(resolve, ms));
  }
}

export default class KnowledgeGraphPlugin extends Plugin {
  private state!: PluginStateData;
  private modals: MainModal[] = [];
  private graphStorage: any | null = null;
  private isUnloading: boolean = false;
  private ribbonIconEl: HTMLElement | null = null;
  subscriptionService: SubscriptionServiceImpl | null = null;

  setupFileWatcher() {
    // Set up file watcher to clean up state when markdown files are deleted
    // Use registerEvent so the event is automatically cleaned up on unload
    this.registerEvent(
      this.app.vault.on('delete', (file) => {
        if (!(file instanceof TFile)) return;
        if (!file.path.endsWith('.md')) return;

        // Check if this file matches any document in our state
        const filePath = file.path;
        const docIndex = this.state.documents.findIndex(d => d.filePath === filePath);

        if (docIndex !== -1) {
          // Remove the document from state
          const removedDoc = this.state.documents.splice(docIndex, 1)[0];

          // Remove associated entities and relations from state
          if (removedDoc.id) {
            this.state.entities = this.state.entities.filter(e => e.docId !== removedDoc.id);
            this.state.relations = this.state.relations.filter(r => r.docId !== removedDoc.id);
          }

          // Save the updated state
          this.saveData(this.state).catch(err => {
            console.error('[Knowledge Graph] Failed to save state after deletion:', err);
          });

          // Notify all modals to refresh their content
          this.modals.forEach(modal => {
            modal.renderBody();
          });
        }
      })
    );
  }

  onunload() {
    // 标记服务正在关闭，防止后续访问
    this.isUnloading = true;

    // 清理周期性验证定时器
    if (this.validationTimer !== null) {
      window.clearTimeout(this.validationTimer);
      this.validationTimer = null;
    }

    // 关闭所有打开的 modals
    this.modals.forEach(modal => {
      try {
        modal.close();
      } catch (error) {
        console.warn('[Knowledge Graph] ⚠️ Error closing modal:', error.message);
      }
    });
    this.modals = [];

    // 清理 ribbon icon
    if (this.ribbonIconEl) {
      try {
        this.ribbonIconEl.remove();
        this.ribbonIconEl = null;
      } catch (error) {
        console.warn('[Knowledge Graph] ⚠️ Error removing ribbon icon:', error.message);
      }
    }

    // 清理全局 window 引用
    try {
      delete (window as any).kgPlugin;
    } catch (error) {
      console.warn('[Knowledge Graph] ⚠️ Error cleaning up window reference:', error.message);
    }

    // 关闭图形存储服务，使用异步方式并添加额外保护
    if (this.graphStorage) {
      try {
        // 检查是否存在有效的 close 方法且不是已释放的对象
        const storage = this.graphStorage;
        this.graphStorage = null; // 在调用前先置空，防止重复调用
        
        // 使用 setTimeout 延迟执行，避免同步阻塞
        window.setTimeout(() => {
          try {
            if (typeof storage.close === 'function') {
              storage.close();
            }
          } catch (error) {
            console.warn('[Knowledge Graph] ⚠️ Error closing graph storage (may be normal during unload):', error.message);
          }
        }, 100);
        
      } catch (error) {
        console.warn('[Knowledge Graph] ⚠️ Error during graph storage cleanup:', error.message);
        this.graphStorage = null;
      }
    }
  }

  async loadState(): Promise<PluginStateData> {
    const data = await this.loadData();
    
    // === 设备ID双重持久化方案 ===
    // 1. 首先尝试从文件系统读取（主存储，跨插件数据删除仍保留）
    // 2. 其次从 Obsidian 数据存储读取（缓存）
    // 3. 最后生成新ID并保存到两个地方
    
    // 获取文件系统持久化路径（用户主目录下的隐藏文件）
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    const deviceIdFilePath = path.join(os.homedir(), '.knowledge-graph-device-id');
    
    let fileDeviceId: string | null = null;
    try {
      if (fs.existsSync(deviceIdFilePath)) {
        fileDeviceId = fs.readFileSync(deviceIdFilePath, 'utf-8').trim();
      }
    } catch (_e) {
    }
    
    // 检查设备ID是否有效
    const existingDeviceId = fileDeviceId || data?.deviceId;
    const needsNewDeviceId = !existingDeviceId || existingDeviceId.length < 20;
    let newDeviceId: string;
    
    if (needsNewDeviceId) {
      newDeviceId = this.generateDeviceId();
      
      // 保存到文件系统（主存储）
      try {
        fs.writeFileSync(deviceIdFilePath, newDeviceId);
      } catch (_e) {
      }
    } else {
      newDeviceId = existingDeviceId;
    }
    
    // Model Query System Prompt - Used for model query function in knowledge cards
    const defaultModelQueryPrompt = `You are a knowledgeable expert. Your core goal is to provide detailed, comprehensive, and in-depth introductions and explanations for given terms.

## Core Task:
When users provide a term/concept/terminology, you need to provide comprehensive knowledge introduction and explanation.

## Detailed Introduction Dimensions:
1. **Basic Definition**: Provide accurate and complete definition
2. **Development History**: Trace origins and evolution process
3. **Core Principles**: Explain fundamental principles and working mechanisms
4. **Main Features**: List key characteristics and important attributes
5. **Application Scenarios**: Describe practical applications and usage areas
6. **Related Concepts**: Connect with other related concepts and theories
7. **Important People/Events**: Mention relevant founders and milestone events if applicable
8. **Development Trends**: Discuss future development and research directions

## Output Requirements:
- Accurate, clear, and easy to understand language
- Comprehensive and in-depth content
- Clear logic and hierarchical structure
- Appropriately use professional terminology but explain clearly`;

    // 知识扩展默认提示词 - 英文版（作为设置的默认值）
    const defaultKnowledgeExpansionPrompt = `You are a professional knowledge expansion assistant. Based on the original content provided by the user, you extend knowledge following 3 rules:
1. Expansion dimensions are divided into three categories: similar knowledge, upstream/downstream related knowledge, and obscure supplementary knowledge. Do not repeat information already in the original text.
2. Output a fixed 20 independent knowledge points. Each point should be concise, logically independent, and marked with its expansion category.
3. Each knowledge point includes: brief concept + key details, no redundant words, unified format.

The following is the original content to be expanded:
{content}

Output the expanded knowledge points according to the rules above.

Fixed output format (one knowledge point per line):
【Knowledge: Knowledge Point Name】Detailed knowledge content (Category: Similar/Upstream-Downstream/Obscure Supplementary)`;
    
    const containsChinese = (str: string): boolean => {
      return /[\u4e00-\u9fa5]/.test(str);
    };

    const defaultSystemPrompt = `You are a professional knowledge graph construction and structured parsing assistant. Your task is to extract entities, mine relationships, summarize content, extract tags, and categorize text. All output must be in standard Markdown format, NOT JSON.

Mandatory Format Rules:
1. Add HTML comment DocID at the beginning: <!-- docid: [32-character random unique string] -->
2. Generate standard timestamp
3. Summary ≤ 100 words, accurately summarizing core content
4. Keep 3-8 core keyword tags
5. Entities include: ID, Name, Type, Relationships, Description
6. Entity types include: person, location, organization, concept, event, book, product, technology, etc.
7. Classification must use these terms: arts, social, natural, applied, history, general
8. Keep full original text at the bottom

Fixed Output Structure (Strictly Follow):
<!-- docid: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx -->

## I. Content Summary
(Core summary of the full text, ≤100 words)

## II. Keyword Tags
- Tag 1
- Tag 2
- Tag 3

## III. Entity Library
Entity ID | Entity Name | Entity Type | Entity Description
entity_001 | - | - | -

## IV. Entity Relationship Graph
Source Entity ID | Target Entity ID | Relationship Type
entity_001 | entity_002 | semantic relationship

## V. Classification
Must use these classification terms: arts, social, natural, applied, history, general

## VI. Original Text
Full original user input text

Sample Output (Standard Final Format):
<!-- docid: 8f92ac36d2144f89b76321abc98765432 -->

## I. Content Summary
GitHub Copilot deprecated most AI models across mainstream scenarios on June 5, 2026, retaining only GPT-5.2 for code review, with differentiated version permissions and data usage rules.

## II. Keyword Tags
- GitHub Copilot
- AI Model
- GPT-5.2
- Code Review
- Model Deprecation
- Programming Assistant

## III. Entity Library
Entity ID | Entity Name | Entity Type | Entity Description
entity_001 | GitHub Copilot | AI Programming Tool | AI code assistance tool by GitHub, providing code completion, chat, review, and editing capabilities
entity_002 | GPT-5.2 | AI Large Model | Advanced AI model, only retained for Copilot code review after June 2026

## IV. Entity Relationship Graph
Source Entity ID | Target Entity ID | Relationship Type
entity_001 | entity_002 | restricted scenario usage

## V. Classification
arts, social, natural, applied, history, general

## VI. Original Text
As of today, June 5, 2026, we have deprecated the following models across most GitHub Copilot experiences (including Copilot Chat, inline edits, ask and agent modes, and code completions). Note that GPT-5.2 is still available as part of Copilot code review.`;

    const defaultUserPromptTemplate = `Text to parse:
{{text}}`;

    const result: PluginStateData = {
      isPro: false,
      activationCode: '',
      language: 'en',
      isChineseIP: false,
      documents: [],
      entities: [],
      relations: [],
      localModel: { apiAddress: 'http://localhost', port: 11434, model: 'gemma3:latest', apiPath: '/api/chat' },
      externalModel: { providerType: 'openai', apiKey: '', apiBase: 'https://api.openai.com/v1', model: '' },
      storageDirectory: '',
      useCustomStorage: false,
      expiresAt: null,
      proxyPort: 9999,
      categories: {
        history: 0,
        politics: 0,
        economy: 0,
        culture: 0,
        technology: 0,
        science: 0,
        other: 0
      },
      selectedParseModel: 'local',
      ...data,
      deviceId: newDeviceId,
      apiBaseUrl: data?.apiBaseUrl || 'https://worker-service.workers.dev',
      promptConfig: {
        systemPrompt: (data?.promptConfig?.systemPrompt && !containsChinese(data.promptConfig.systemPrompt)) 
          ? data.promptConfig.systemPrompt 
          : defaultSystemPrompt,
        userPromptTemplate: (data?.promptConfig?.userPromptTemplate && !containsChinese(data.promptConfig.userPromptTemplate)) 
          ? data.promptConfig.userPromptTemplate 
          : defaultUserPromptTemplate,
        knowledgePrompt: (data?.promptConfig?.knowledgePrompt && !containsChinese(data.promptConfig.knowledgePrompt)) 
          ? data.promptConfig.knowledgePrompt 
          : defaultKnowledgeExpansionPrompt,
        modelQueryPrompt: (data?.promptConfig?.modelQueryPrompt && !containsChinese(data.promptConfig.modelQueryPrompt)) 
          ? data.promptConfig.modelQueryPrompt 
          : defaultModelQueryPrompt
      }
    };
    
    
    // 如果设备ID被重新生成，立即保存到持久化存储
    if (needsNewDeviceId) {
      await this.saveData(result);
    }
    
    return result;
  }

  generateDocId(filePath: string, content: string): string {
    // Generate a unique docId based on file path and content hash
    let hash = 0;
    const combined = `${filePath}:${content.substring(0, 100)}`;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return 'doc_' + Math.abs(hash).toString(36).padStart(12, '0') + '_' + Date.now().toString(36);
  }

  generateDeviceId(): string {
    
    // 收集多个设备特征以生成唯一的设备指纹
    const features: string[] = [];
    
    // === 1. 浏览器特征 ===
    features.push(getUserAgent());
    features.push(navigator.language);
    features.push(navigator.languages?.join(',') || '');
    features.push(getPlatform());
    features.push(navigator.hardwareConcurrency?.toString() || '');
    
    // === 2. 屏幕特征 ===
    features.push(`${screen.width}x${screen.height}`);
    features.push(`${screen.colorDepth}`);
    features.push(`${screen.pixelDepth}`);
    features.push(`${screen.availWidth}x${screen.availHeight}`);
    
    // === 3. 时区特征 ===
    features.push(Intl.DateTimeFormat().resolvedOptions().timeZone);
    features.push(new Date().getTimezoneOffset().toString());
    
    // === 4. Canvas指纹 ===
    try {
      const canvas = el('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillStyle = '#f60';
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = '#069';
        ctx.fillText('Knowledge Graph AI', 2, 15);
        ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
        ctx.fillText('Device ID', 4, 17);
        features.push(canvas.toDataURL().substring(0, 100));
      }
    } catch (_e) {
      features.push('canvas-unavailable');
    }
    
    // WebGL渲染器信息
    try {
      const canvas = el('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl && gl instanceof WebGLRenderingContext) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          features.push(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '');
          features.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '');
        }
      }
    } catch (e) {
      features.push('webgl-unavailable');
    }
    
    // 音频上下文指纹
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const analyser = audioCtx.createAnalyser();
      const gain = audioCtx.createGain();
      const scriptProcessor = audioCtx.createScriptProcessor(4096, 1, 1);
      
      gain.gain.value = 0;
      oscillator.type = 'triangle';
      oscillator.connect(analyser);
      analyser.connect(scriptProcessor);
      scriptProcessor.connect(gain);
      gain.connect(audioCtx.destination);
      
      const frequencyData = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(frequencyData);
      features.push(frequencyData.slice(0, 32).join(','));
      
      oscillator.stop();
      audioCtx.close();
    } catch (_e) {
      features.push('audio-unavailable');
    }
    
    // 浏览器插件列表（如果可访问）
    try {
      const plugins = Array.from(navigator.plugins || []).map(p => String((p as unknown as { name: string }).name)).join(',');
      features.push(plugins);
    } catch (_e) {
      features.push('plugins-unavailable');
    }
    
    // 对所有特征进行哈希
    const combinedString = features.join('|');
    let hash1 = 0;
    let hash2 = 5381;
    
    // 使用更安全的哈希算法（djb2 + sdbm组合）
    for (let i = 0; i < combinedString.length; i++) {
      hash1 = ((hash1 << 5) - hash1 + combinedString.charCodeAt(i)) | 0;
      hash2 = ((hash2 << 6) + (hash2 << 16) - hash2 + combinedString.charCodeAt(i)) | 0;
    }
    
    // 合并两个哈希值
    const finalHash = (hash1 ^ hash2) >>> 0;
    
    // 生成设备ID（使用base36编码）
    const deviceId = Math.abs(finalHash).toString(36).padStart(9, '0') + 
                     Math.abs(hash2 >>> 0).toString(36).padStart(9, '0');
    
    // 添加校验位
    const checkSum = deviceId.split('').reduce((acc, char, idx) => {
      return acc + char.charCodeAt(0) * (idx + 1);
    }, 0);
    
    const finalDeviceId = `kg_${deviceId}_${(checkSum % 997).toString(36).padStart(3, '0')}`;
    
    
    return finalDeviceId;
  }

  async saveParseResult(fileName: string, content: string, outputDir: string, sourceFilePath?: string): Promise<void> {
    try {
      const vault = this.app.vault;
      const dirExists = await vault.adapter.exists(outputDir);

      if (!dirExists) {
        await vault.createFolder(outputDir);
      }

      const filePath = `${outputDir}/${fileName}`;
      const fileExists = await vault.adapter.exists(filePath);

      if (fileExists) {
        const file = vault.getAbstractFileByPath(filePath);
        if (file) {
          await vault.modify(file as any, content);
        }
      } else {
        await vault.create(filePath, content);
      }

      // Configure AI parser based on user settings
      const modelType = this.state?.selectedParseModel || 'local';
      
      const keywords = this.extractKeywords(content);
      
      // 从 AI 返回的 Markdown 内容中提取分类信息
      let categories: Record<string, number>;
      try {
        categories = this.extractCategoriesFromMarkdown(content);
      } catch (error) {
        console.warn(`[Knowledge Graph] ⚠️ 分类提取失败，使用默认分类:`, error);
        categories = { arts: 0, social: 0, natural: 0, applied: 0, history: 0, general: 100 };
      }
      
      // 获取主分类（分数最高的分类）
      const mainCategory = Object.entries(categories).reduce((a, b) => 
        (b[1] > a[1] ? b : a), ['general', 0])[0];

      const docId = this.generateDocId(filePath, content);

      if (sourceFilePath) {
      }

      // Extract entities and relations using AI parser
      const aiParser = new AIModelParser();
      
      if (modelType === 'external' && this.state?.externalModel) {
        const { apiBase, model } = this.state.externalModel;
        
        // 直接使用完整URL
        aiParser.configureByUrl(apiBase);
        aiParser.setModel(model);
      } else if (this.state?.localModel) {
        const { apiAddress, port, model, apiPath } = this.state.localModel;
        aiParser.configure(apiAddress, port, apiPath);
        aiParser.setModel(model);
      } else {
      }
      
      let aiResult;
      try {
        aiResult = await aiParser.parse({ text: content, format: 'auto' });
      } catch (error) {
        console.error(`[Knowledge Graph] ❌ AI解析失败:`, error);
        new Notice('AI解析失败，请检查模型配置或重试', 5000);
        // 即使AI解析失败，仍保存文档记录，但不保存实体和关系
        this.state.documents.push({
          id: docId,
          docId,
          title: fileName,
          filePath: filePath,
          timestamp: Date.now(),
          keywords,
          categories,
          summary: content.substring(0, 200)
        });
        await this.saveData(this.state);
        this.modals.forEach(modal => modal.renderBody());
        return;
      }
      
      // 检查AI解析结果，如果没有实体且没有关系，说明解析失败
      if (!aiResult || (!aiResult.entities || aiResult.entities.length === 0) && (!aiResult.relations || aiResult.relations.length === 0)) {
        // 即使没有提取到实体，仍保存文档记录
        this.state.documents.push({
          id: docId,
          docId,
          title: fileName,
          filePath: filePath,
          timestamp: Date.now(),
          keywords,
          categories,
          summary: content.substring(0, 200)
        });
        await this.saveData(this.state);
        this.modals.forEach(modal => modal.renderBody());
        return;
      }
      
      const entities = aiResult.entities.map((e, idx) => ({
        id: crypto.randomUUID(),
        docId,
        name: e.name,
        type: e.type,
        tags: [],
        summary: e.summary,
        timestamp: Date.now(),
        filePath,
        isMainEntity: idx === 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }));
      
      // 创建实体名称到ID的映射
      const entityMap = new Map(entities.map(e => [e.name, e.id]));
      
      
      const relations = aiResult.relations.map(r => {
        const sourceId = entityMap.get(r.sourceName) || '';
        const targetId = entityMap.get(r.targetName) || '';
        return {
          id: crypto.randomUUID(),
          sourceId: sourceId,
          targetId: targetId,
          relationType: r.relationType,
          docId,
          weight: 1.0,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
      }).filter(r => r.sourceId && r.targetId);
      if (entities.length > 0) {
      }
      // 关系调试日志
      if (aiResult.relations && aiResult.relations.length > 0) {
      }
      if (relations.length > 0) {
      } else if (aiResult.relations.length > 0) {
        aiResult.relations.forEach((r, i) => {
          const sourceFound = entityMap.has(r.sourceName);
          const targetFound = entityMap.has(r.targetName);
          console.debug(`[Knowledge Graph] Relation check: ${r.sourceName} (found: ${sourceFound}) -> ${r.targetName} (found: ${targetFound})`);
        });
      }

      // ========== 插入实体和关系到图数据库 ==========
      try {
        if (this.graphStorage) {
          await this.insertToGraphDatabase(docId, entities, relations, content, filePath, sourceFilePath, fileName, mainCategory, categories);
        } else {
          console.warn(`[Knowledge Graph] ⚠️  GraphStorageService 未初始化，尝试重新初始化...`);
          try {
            await this.initializeGraphStorageWithRetry();
            if (this.graphStorage) {
              await this.insertToGraphDatabase(docId, entities, relations, content, filePath, sourceFilePath, fileName, mainCategory, categories);
            } else {
              console.warn(`[Knowledge Graph] ⚠️  GraphStorageService 重新初始化失败，跳过图数据库插入`);
            }
          } catch (error) {
            console.error(`[Knowledge Graph] ❌ 重新初始化 GraphStorageService 失败:`, error);
            console.warn(`[Knowledge Graph] ⚠️  跳过图数据库插入`);
          }
        }
      } catch (error) {
        console.error(`[Knowledge Graph] ❌ 插入图数据库失败:`, error);
        // 图数据库插入失败不影响文档保存
      }

      this.state.documents.push({
        id: docId,
        docId,
        title: fileName,
        filePath: filePath,
        timestamp: Date.now(),
        keywords,
        categories,
        summary: content.substring(0, 200)
      });

      // Add entities and relations to state
      this.state.entities.push(...entities);
      this.state.relations.push(...relations);

      Object.keys(categories).forEach(cat => {
        if (this.state.categories[cat]) {
          this.state.categories[cat] += categories[cat];
        } else {
          this.state.categories[cat] = categories[cat];
        }
      });

      await this.saveData(this.state);
      
      // Notify all modals to refresh their content
      this.modals.forEach(modal => {
        modal.renderBody();
      });
      
      
      // ========== 后台执行知识扩展查询（不阻塞主流程）==========
      this.executeKnowledgeExpansionInBackground(docId, content, keywords);
      
    } catch (error) {
      console.error(`[Knowledge Graph] ❌ 保存解析结果失败:`, error);
      new Notice(`保存解析结果失败: ${error instanceof Error ? error.message : String(error)}`, 5000);
      throw error;
    }
  }

  /**
   * 后台执行知识扩展查询，不阻塞文档解析流程
   */
  private async executeKnowledgeExpansionInBackground(docId: string, content: string, keywords: string[]): Promise<void> {
    const state = this.getState();
    
    try {
      
      // 设置后台任务状态为进行中
      state.isKnowledgeExpanding = true;
      await this.saveData(state);
      
      // 更新所有打开的模态框显示加载状态
      this.modals.forEach(modal => {
        if (modal instanceof MainModal) {
          modal.showKnowledgeLoading();
        }
      });
      
      const modelType = state.selectedParseModel || 'local';
      
      // 获取关联知识
      let relatedKnowledge = '';
      try {
        const graphStorage = getGraphStorageService();
        if (graphStorage) {
          const entities = await graphStorage.queryEntitiesByDocId(docId);
          let allRelations: any[] = [];
          for (const entity of entities) {
            const relations = await graphStorage.queryRelationsByEntity(entity.id);
            allRelations = [...allRelations, ...relations];
          }
          
          if (entities.length > 0 || allRelations.length > 0) {
            relatedKnowledge = `\n\n## 关联知识库\n\n### 相关实体：\n`;
            entities.forEach(e => {
              relatedKnowledge += `- ${e.name}（${e.type}）: ${e.summary || '暂无描述'}\n`;
            });
            
            if (allRelations.length > 0) {
              relatedKnowledge += `\n### 相关关系：\n`;
              allRelations.forEach(r => {
                const sourceEntity = entities.find(e => e.id === r.sourceId);
                const targetEntity = entities.find(e => e.id === r.targetId);
                relatedKnowledge += `- ${sourceEntity?.name || '未知'} --[${r.relationType}]--> ${targetEntity?.name || '未知'}\n`;
              });
            }
          }
        }
      } catch (error) {
        console.warn(`[Knowledge Graph] ⚠️ 查询关联知识失败:`, error);
      }
      
      // 构建知识扩展提示词
      const knowledgeUserContent = `## 需要拓展的原文内容：
${content.substring(0, 2000)}

## 关联知识库内容（优先参考）：
${relatedKnowledge}`;

      const knowledgeSystemPrompt = state.promptConfig.knowledgePrompt || `You are a professional knowledge expansion assistant. Based on the original content provided by the user, you extend knowledge following 3 rules:
1. Expansion dimensions are divided into three categories: similar knowledge, upstream/downstream related knowledge, and obscure supplementary knowledge. Do not repeat information already in the original text.
2. Output a fixed 20 independent knowledge points. Each point should be concise, logically independent, and marked with its expansion category.
3. Each knowledge point includes: brief concept + key details, no redundant words, unified format.

The following is the original content to be expanded:
{content}

Output the expanded knowledge points according to the rules above.

Fixed output format (one knowledge point per line):
【Knowledge: Knowledge Point Name】Detailed knowledge content (Category: Similar/Upstream-Downstream/Obscure Supplementary)`;

      // 调用模型进行知识扩展
      const knowledgeResponse = await this.callModel(knowledgeUserContent, modelType, knowledgeSystemPrompt);
      
      // 解析结果
      let knowledgeItems: Array<{name: string, category: string, summary: string}> = [];
      try {
        knowledgeItems = JSON.parse(knowledgeResponse);
      } catch {
        knowledgeItems = this.parseKnowledgeFromText(knowledgeResponse);
      }
      
      // 更新缓存
      state.cachedKnowledgeItems = knowledgeItems;
      state.lastKnowledgeUpdate = Date.now();
      state.isKnowledgeExpanding = false;
      await this.saveData(state);
      
      
      // 更新所有打开的模态框UI
      this.modals.forEach(modal => {
        if (modal instanceof MainModal) {
          modal.updateKnowledgeDisplay(knowledgeItems);
        }
      });
      
    } catch (error) {
      console.warn(`[Knowledge Graph] ⚠️ 后台知识扩展失败:`, error);
      // 设置后台任务状态为完成
      state.isKnowledgeExpanding = false;
      await this.saveData(state);
      // 知识扩展失败不影响文档解析流程
    }
  }

  private parseKnowledgeFromText(text: string): Array<{name: string, category: string, summary: string}> {
    if (!text || text.trim() === '') {
      return [];
    }

    const items: Array<{name: string, category: string, summary: string}> = [];
    const state = this.getState();
    const isZh = state.language === 'zh';
    
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
    }

    const lines = text.split('\n').filter(line => line.trim() !== '');

    for (const line of lines) {
      const matchEnglish = line.match(/【Knowledge[：:]\s*(.+?)】(.+)/i);
      if (matchEnglish) {
        const name = matchEnglish[1].trim();
        let summary = matchEnglish[2].trim();
        let category = 'Obscure Supplementary';
        
        const categoryMatch = summary.match(/\(Category:\s*(Similar|Upstream-Downstream|Obscure Supplementary)\)/i);
        if (categoryMatch) {
          category = categoryMatch[1];
          summary = summary.replace(/\(Category:\s*(Similar|Upstream-Downstream|Obscure Supplementary)\)/i, '').trim();
        }
        
        if (name.length >= 2 && name.length <= 50 && summary.length >= 5) {
          items.push({
            name,
            category,
            summary
          });
        }
        continue;
      }
      
      const matchChinese = line.match(/【知识点[：:](.+?)】(.+)/);
      if (matchChinese) {
        const name = matchChinese[1].trim();
        let summary = matchChinese[2].trim();
        let category = '延伸补充';
        
        const categoryMatch = summary.match(/所属分类[：:](同类相似|上下游关联|延伸冷门)/);
        if (categoryMatch) {
          category = categoryMatch[1];
          summary = summary.replace(/所属分类[：:](同类相似|上下游关联|延伸冷门)/, '').trim();
        }
        
        if (name.length >= 2 && name.length <= 50 && summary.length >= 5) {
          items.push({
            name,
            category,
            summary
          });
        }
        continue;
      }
    }

    return items;
  }

  private async insertToGraphDatabase(
    docId: string,
    entities: Entity[],
    relations: Relation[],
    content: string,
    filePath: string,
    sourceFilePath: string,
    fileName: string,
    mainCategory: string,
    categories: Record<string, number>
  ): Promise<void> {
    try {

      // 1. 创建文档节点
      const document = {
        id: docId,
        docId,
        filePath,
        sourceFilePath,
        fileName: fileName,
        title: content.substring(0, 100),
        summary: content.substring(0, 200),
        tags: [],
        category: mainCategory,
        categories: categories,
        timestamp: Date.now(),
        entityCount: entities.length,
        relationCount: relations.length,
        viewCount: 0,
        lastViewedAt: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await this.graphStorage!.createDocument(document);

      // 2. 批量插入实体
      if (entities.length > 0) {
        await this.graphStorage!.batchInsertEntities(entities, (progress) => {
          if (progress % 20 === 0) {
          }
        });
      } else {
      }

      // 3. 批量插入关系
      if (relations.length > 0) {
        await this.graphStorage!.batchInsertRelations(relations, (progress) => {
          if (progress % 20 === 0) {
          }
        });
      } else {
      }

      // 4. 验证插入结果
      const verifyEntities = await this.graphStorage!.queryEntitiesByDocId(docId);
      const verifyRelations = await this.graphStorage!.queryRelationsByDocId(docId);
      console.debug(`[Knowledge Graph] Verification: ${verifyEntities.length} entities, ${verifyRelations.length} relations for doc ${docId}`);

    } catch (error) {
      console.error(`[Knowledge Graph] ❌ 图数据库插入失败:`, error);
      console.error(`[Knowledge Graph] 错误堆栈:`, (error as Error).stack);
    }
  }

  extractEntitiesAndRelationsFromContent(content: string, docId: string, filePath: string): { entities: Entity[]; relations: Relation[] } {
    const entities: Entity[] = [];
    const relations: Relation[] = [];
    const now = Date.now();

    const lines = content.split('\n');
    const entityMap = new Map<string, string>();

    // 获取现有实体，用于去重
    const existingEntities = this.state.entities;
    const existingEntityNames = new Set(existingEntities.map(e => e.name));


    let inEntityRelationSection = false;

    lines.forEach((line, index) => {
      const headerMatch = line.match(/^###\s+\*\*(.+?)\*\*\s+\((.+?)\):?(.*)$/);
      if (headerMatch) {
        const name = headerMatch[1].trim();
        
        // 检查是否已存在相同名称的实体
        if (existingEntityNames.has(name)) {
          return;
        }
        
        const type = this.inferEntityTypeFromName(headerMatch[2].trim());
        const summary = headerMatch[3].trim();

        const entityId = crypto.randomUUID();
        entityMap.set(name, entityId);
        entities.push({
          id: entityId,
          docId,
          name,
          type,
          tags: [],
          summary,
          timestamp: now,
          filePath,
          isMainEntity: index === 0,
          createdAt: now,
          updatedAt: now
        });
      }

      if (line.trim().startsWith('### 实体关系') || line.trim().startsWith('### Entity Relations')) {
        inEntityRelationSection = true;
        return;
      }

      if (inEntityRelationSection && line.trim().startsWith('- ')) {
        const entityMatch = line.match(/-\s+\*\*(.+?)\*\*\s*（(.+?)）/);
        if (entityMatch) {
          const name = entityMatch[1].trim();
          
          // 检查是否已存在相同名称的实体
          if (existingEntityNames.has(name) || entityMap.has(name)) {
            return;
          }
          
          const title = entityMatch[2].trim();
          const entityId = crypto.randomUUID();
          entityMap.set(name, entityId);
          entities.push({
            id: entityId,
            docId,
            name,
            type: this.inferEntityTypeFromName(name),
            tags: [],
            summary: title,
            timestamp: now,
            filePath,
            isMainEntity: false,
            createdAt: now,
            updatedAt: now
          });
        }
      }
    });

    if (entities.length === 0) {
      const conceptMatch = content.match(/^([\u4e00-\u9fa5、，。]+?)(?=\s|###)/);
      if (conceptMatch) {
        const concepts = conceptMatch[1].split(/[、，]/).map(c => c.trim()).filter(c => c.length > 1);
        concepts.forEach((concept, idx) => {
          const entityId = crypto.randomUUID();
          entityMap.set(concept, entityId);
          entities.push({
            id: entityId,
            docId,
            name: concept,
            type: 'concept',
            tags: [],
            summary: '',
            timestamp: now,
            filePath,
            isMainEntity: idx === 0,
            createdAt: now,
            updatedAt: now
          });
        });
      }

      lines.forEach((line, index) => {
        if (line.startsWith('# ')) {
          const name = line.substring(2).trim();
          if (name && name.length > 0 && name.length < 100) {
            if (!entityMap.has(name)) {
              const entityId = crypto.randomUUID();
              entityMap.set(name, entityId);
              entities.push({
                id: entityId,
                docId,
                name,
                type: this.inferEntityTypeFromName(name),
                tags: [],
                summary: '',
                timestamp: now,
                filePath,
                isMainEntity: index === 0,
                createdAt: now,
                updatedAt: now
              });
            }
          }
        }
      });
    }

    lines.forEach((line, index) => {
      const relationMatch = line.match(/^(?:-|•)\s+(.+?)\s+--([^-]+)-->\s+(.+?)\s*$/);
      if (relationMatch) {
        const sourceName = relationMatch[1].trim();
        const relationType = relationMatch[2].trim();
        const targetName = relationMatch[3].trim();

        // 优先从已有实体中查找ID
        const existingSource = existingEntities.find(e => e.name === sourceName);
        const existingTarget = existingEntities.find(e => e.name === targetName);
        
        const sourceId = existingSource?.id || entityMap.get(sourceName) || '';
        const targetId = existingTarget?.id || entityMap.get(targetName) || '';

        if (sourceId && targetId) {
          relations.push({
            id: crypto.randomUUID(),
            sourceId,
            targetId,
            relationType,
            docId,
            weight: 1.0,
            createdAt: now,
            updatedAt: now
          });
        }
      }
    });

    return { entities, relations };
  }

  inferEntityTypeFromName(context: string): string {
    const contextLower = context.toLowerCase();
    if (contextLower.includes('公司') || contextLower.includes('企业') || contextLower.includes('集团')) {
      return 'organization';
    }
    if (contextLower.includes('教授') || contextLower.includes('博士') || contextLower.includes('先生') || contextLower.includes('女士')) {
      return 'person';
    }
    return 'concept';
  }

  extractKeywords(content: string): string[] {
    const keywords: string[] = [];
    const matches = content.match(/[a-zA-Z\u4e00-\u9fa5]+/g);
    if (matches) {
      const wordCounts: Record<string, number> = {};
      matches.forEach(word => {
        if (word.length >= 2) {
          wordCounts[word] = (wordCounts[word] || 0) + 1;
        }
      });
      const sortedWords = Object.entries(wordCounts).sort((a, b) => b[1] - a[1]);
      return sortedWords.slice(0, 8).map(entry => entry[0]);
    }
    return keywords;
  }

  /**
   * 从 Markdown 内容中提取分类信息
   */
  extractCategoriesFromMarkdown(content: string): Record<string, number> {
    const defaultCategories = { arts: 0, social: 0, natural: 0, applied: 0, history: 0, general: 100 };
    
    // 尝试匹配 ## 分类 下的 JSON 内容
    const categoryMatch = content.match(/## 分类\s*\n\s*({[^}]+})/);
    if (categoryMatch && categoryMatch[1]) {
      try {
        const categories = JSON.parse(categoryMatch[1]);
        // 确保所有分类都有值
        return { ...defaultCategories, ...categories };
      } catch (error) {
        console.warn('[Knowledge Graph] ⚠️ 解析分类 JSON 失败:', error);
      }
    }
    
    // 如果没有找到分类部分，使用默认分类
    return defaultCategories;
  }

  analyzeCategories(content: string): Record<string, number> {
    const categories: Record<string, number> = {
      history: 0,
      politics: 0,
      economy: 0,
      culture: 0,
      technology: 0,
      science: 0,
      other: 0
    };

    const lowerContent = content.toLowerCase();

    if (lowerContent.includes('历史') || lowerContent.includes('history')) categories.history += 1;
    if (lowerContent.includes('政治') || lowerContent.includes('politics')) categories.politics += 1;
    if (lowerContent.includes('经济') || lowerContent.includes('economy')) categories.economy += 1;
    if (lowerContent.includes('文化') || lowerContent.includes('culture')) categories.culture += 1;
    if (lowerContent.includes('技术') || lowerContent.includes('technology')) categories.technology += 1;
    if (lowerContent.includes('科学') || lowerContent.includes('science')) categories.science += 1;

    if (Object.values(categories).every(v => v === 0)) {
      categories.other = 1;
    }

    return categories;
  }

  /**
   * 使用AI调用获取文档分类（6个固定分类）
   */
  async analyzeCategoriesWithAI(content: string, modelType: 'local' | 'external'): Promise<Record<string, number>> {
    // 使用system prompt进行分类分析
    const systemPrompt = `You are a professional document classification assistant responsible for categorizing document content.

## Classification System
1. arts (Arts & Humanities): Literature, music, painting, film, and other art-related content
2. social (Social Sciences): Social, political, economic, legal, etc.
3. natural (Natural Sciences): Physics, chemistry, biology, astronomy, etc.
4. applied (Applied Technology): Computer, engineering, medical, agriculture, etc.
5. history (History & Culture): History, archaeology, culture, etc.
6. general (General): Other comprehensive content

## Output Requirements
Analyze the document content and give a relevance score of 0-100 for each category.
Return format: {"arts":number,"social":number,"natural":number,"applied":number,"history":number,"general":number}

Example: {"arts": 75, "social": 60, "natural": 30, "applied": 80, "history": 45, "general": 90}`;
    
    const userPrompt = `Please analyze the following document content and provide classification scores:
{content}`;
    
    const prompt = userPrompt.replace('{content}', content);

    try {
      const response = await this.callModel(prompt, modelType, systemPrompt);
      let categories: Record<string, number> = {};
      
      try {
        categories = JSON.parse(response);
      } catch {
        // 如果不是JSON格式，使用默认分类
        categories = { arts: 0, social: 0, natural: 0, applied: 0, history: 0, general: 100 };
      }
      
      // 确保所有分类都有值
      const defaultCategories = { arts: 0, social: 0, natural: 0, applied: 0, history: 0, general: 0 };
      return { ...defaultCategories, ...categories };
    } catch (error) {
      console.warn('[Knowledge Graph] ⚠️ 分类分析失败，使用默认分类:', error);
      return { arts: 0, social: 0, natural: 0, applied: 0, history: 0, general: 100 };
    }
  }

  getDocumentCountDisplay(count: number): string {
    if (count >= 300) {
      return `${count} <span style="font-size:24px;vertical-align:middle;">🏆</span>`;
    } else if (count >= 200) {
      return `${count} <span style="font-size:24px;vertical-align:middle;">🥈</span>`;
    } else if (count >= 100) {
      return `${count} <span style="font-size:24px;vertical-align:middle;">🥇</span>`;
    }
    return count.toString();
  }

  async callModel(prompt: string, modelType: 'local' | 'external', systemPrompt?: string): Promise<string> {
    const state = this.getState();
    const effectiveSystemPrompt = systemPrompt || state.promptConfig.systemPrompt;
    
    if (modelType === 'local') {
      const { apiAddress, port, model, apiPath } = state.localModel;
      
      // 如果 apiPath 为空，使用默认路径
      const effectiveApiPath = apiPath && apiPath.trim() ? apiPath : '/api/generate';
      // 确保 apiPath 以 / 开头
      const normalizedApiPath = effectiveApiPath.startsWith('/') ? effectiveApiPath : `/${effectiveApiPath}`;
      
      // 构建完整目标URL
      let targetUrl = '';
      if (apiAddress.startsWith('http://') || apiAddress.startsWith('https://')) {
        // 如果 apiAddress 已经是完整URL
        const urlObj = new URL(apiAddress);
        // 如果URL中没有端口，使用配置的端口
        if (!urlObj.port && port) {
          urlObj.port = port.toString();
        }
        targetUrl = `${urlObj.origin}${normalizedApiPath}`;
      } else {
        // 传统格式：apiAddress + port + apiPath
        targetUrl = `http://${apiAddress}:${port}${normalizedApiPath}`;
      }
      
      
      try {
        // 根据 API 路径选择请求格式
        let body: string;
        if (normalizedApiPath === '/api/chat') {
          // /api/chat 使用 messages 格式
          body = JSON.stringify({
            model,
            messages: [
              { role: 'system', content: effectiveSystemPrompt },
              { role: 'user', content: prompt }
            ],
            stream: false
          });
        } else {
          // /api/generate 或其他端点使用 prompt 格式
          body = JSON.stringify({
            model,
            prompt: `${effectiveSystemPrompt}\n\n${prompt}`,
            stream: false,
            options: { temperature: 0.7 }
          });
        }
        
        // 直接使用 requestUrl 请求本地模型
        const response = await requestUrl({
          url: targetUrl,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: body
        });
        
        const text = response.text;
        
        if (response.status >= 400) {
          return 'API Error: ' + text;
        }
        
        const result = JSON.parse(text);
        
        // 根据不同端点返回格式提取响应
        let responseText = '';
        if (result.message) {
          responseText = result.message.content || result.message;
        } else if (result.response) {
          responseText = result.response;
        } else if (result.choices && result.choices[0]) {
          responseText = result.choices[0].message?.content || result.choices[0].text || '';
        }
        return responseText || 'No response from model';
      } catch (error) {
        return 'Error calling local model: ' + (error as Error).message;
      }
    } else {
      const { providerType, apiKey, apiBase, model } = state.externalModel;
      const normalizedApiBase = apiBase.replace(/\/$/, '');

      try {
        if (providerType === 'anthropic') {
          const targetUrl = `${normalizedApiBase}/v1/messages`;
          const requestBody = {
            model,
            max_tokens: 4096,
            system: effectiveSystemPrompt,
            messages: [
              { role: 'user', content: prompt }
            ]
          };

          const response = await requestUrl({
            url: targetUrl,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
              'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify(requestBody)
          });

          const text = response.text;

          if (response.status >= 400) {
            return 'API Error: ' + text;
          }
          const result = JSON.parse(text);
          return result.content?.[0]?.text || 'No response from model';
        } else if (providerType === 'ollama') {
          const targetUrl = `${normalizedApiBase}/api/generate`;
          const response = await requestUrl({
            url: targetUrl,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model,
              prompt: `${effectiveSystemPrompt}\n\n${prompt}`,
              stream: false,
              options: { temperature: 0.7 }
            })
          });

          const text = response.text;
          if (response.status >= 400) {
            return 'API Error: ' + text;
          }
          const result = JSON.parse(text);
          return result.response || 'No response from model';
        } else {
          const targetUrl = `${normalizedApiBase}/chat/completions`;
          const response = await requestUrl({
            url: targetUrl,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: 'system', content: effectiveSystemPrompt },
                { role: 'user', content: prompt }
              ],
              temperature: 0.7
            })
          });

          const text = response.text;
          if (response.status >= 400) {
            return 'API Error: ' + text;
          }
          const result = JSON.parse(text);
          return result.choices?.[0]?.message?.content || 'No response from model';
        }
      } catch (error) {
        return 'Error calling external model: ' + (error as Error).message;
      }
    }
  }

  buildParsePrompt(content: string): { systemPrompt: string; userPrompt: string } {
    const state = this.getState();
    const isZh = state.language === 'zh';
    
    const zhSystemPrompt = `你是一名专业的知识图谱构建和结构化解析助手。你的任务是从任意文本中提取实体、挖掘关系、总结内容和提取标签。所有输出必须采用标准Markdown格式，NOT JSON。

## 输出格式规则：
1. 在开头添加HTML注释DocID：<!-- docid: [32位随机唯一字符串] -->
2. 生成标准时间戳
3. 摘要 ≤ 100字，准确概括核心内容
4. 保留3-8个核心关键词标签
5. 实体包含：ID、名称、类型、描述
6. 关系必须清晰、语义规范、非冗余
7. 在底部保留完整原始文本

## 实体类型参考（必须从以下类型中选择）：
- 人物：个人、角色、用户
- 组织：公司、机构、团体
- 地点：城市、国家、场所
- 概念：思想、理论、抽象概念
- 事件：历史事件、活动、会议
- 文档：文章、书籍、论文
- 产品：商品、软件、硬件
- 技术：技术、方法、工具
- 时间：日期、时间段
- 金钱：金额、货币
- 学术：研究领域、学科
- 行业：产业、行业
- 疾病：病症、健康问题
- 药物：药品、治疗方法
- 食物：食材、菜肴

## 关系类型参考（必须从以下类型中选择）：
- 属于、包含、组成、子类、父类（层级关系）
- 相关、相似、衍生（关联关系）
- 导致、影响、促进、阻碍（因果关系）
- 先于、后于、同时（时序关系）
- 位于、拥有、使用、创建、合作（其他关系）

## 固定输出结构（严格遵守）：
<!-- docid: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx -->
知识图谱结构化解析结果

## 一、摘要
（全文核心总结，≤100字）

## 二、关键词标签
- 标签1
- 标签2
- 标签3

## 三、基本信息
- 文档ID：（与头部的docid相同）
- 生成时间戳：（数字时间戳）

## 四、实体库
实体ID | 实体名称 | 实体类型 | 实体描述
entity_001 | - | - | -

## 五、实体关系图谱
源实体ID | 目标实体ID | 关系类型
entity_001 | entity_002 | 语义关系

## 六、原始文本
完整的用户输入原始文本`;

    const enSystemPrompt = `You are a professional knowledge graph construction and structured parsing assistant. Your task is to extract entities, mine relationships, summarize content, and extract tags from any text. All output must be in standard Markdown format, NOT JSON.

## Output Format Rules:
1. Add HTML comment DocID at the beginning: <!-- docid: [32-character random unique string] -->
2. Generate standard timestamp
3. Summary ≤ 100 words, accurately summarizing core content
4. Keep 3-8 core keyword tags
5. Entities include: ID, Name, Type, Description
6. Relationships must be clear, semantically standard, and non-redundant
7. Keep full original text at the bottom

## Entity Type Reference (Must choose from the following):
- Person: Individual, character, user
- Organization: Company, institution, group
- Location: City, country, place
- Concept: Idea, theory, abstract concept
- Event: Historical event, activity, meeting
- Document: Article, book, paper
- Product: Product, software, hardware
- Technology: Technology, method, tool
- Time: Date, time period
- Money: Amount, currency
- Academic: Research field, discipline
- Industry: Industry, sector
- Disease: Illness, health issue
- Medicine: Drug, treatment
- Food: Ingredient, dish

## Relationship Type Reference (Must choose from the following):
- BelongsTo, Contains, ComposedOf, SubclassOf, ParentOf (Hierarchical)
- RelatedTo, SimilarTo, DerivedFrom (Association)
- Causes, Influences, Promotes, Blocks (Causal)
- Before, After, Concurrent (Temporal)
- LocatedAt, Owns, Uses, CreatedBy, CooperatesWith (Other)

## Fixed Output Structure (Strictly Follow):
<!-- docid: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx -->
Knowledge Graph Structured Parsing Result

## I. Content Summary
(Core summary of the full text, ≤100 words)

## II. Keyword Tags
- Tag 1
- Tag 2
- Tag 3

## III. Basic Information
- Document ID: (same as docid in header)
- Generated Timestamp: (numeric timestamp)

## IV. Entity Library
Entity ID | Entity Name | Entity Type | Entity Description
entity_001 | - | - | -

## V. Entity Relationship Graph
Source Entity ID | Target Entity ID | Relationship Type
entity_001 | entity_002 | semantic relationship

## VI. Original Text
Full original user input text`;
    
    let systemPrompt: string;
    let userPromptTemplate: string;
    
    if (isZh) {
      if (!state.promptConfig.systemPrompt || state.promptConfig.systemPrompt.includes('Content Summary') || state.promptConfig.systemPrompt.includes('Entity Library')) {
        systemPrompt = zhSystemPrompt;
      } else {
        systemPrompt = state.promptConfig.systemPrompt;
      }
      if (!state.promptConfig.userPromptTemplate || state.promptConfig.userPromptTemplate.includes('Please analyze')) {
        userPromptTemplate = `请分析以下文档内容：
{content}`;
      } else {
        userPromptTemplate = state.promptConfig.userPromptTemplate;
      }
    } else {
      if (!state.promptConfig.systemPrompt || state.promptConfig.systemPrompt.includes('摘要') || state.promptConfig.systemPrompt.includes('实体库')) {
        systemPrompt = enSystemPrompt;
      } else {
        systemPrompt = state.promptConfig.systemPrompt;
      }
      if (!state.promptConfig.userPromptTemplate || state.promptConfig.userPromptTemplate.includes('请分析')) {
        userPromptTemplate = `Please analyze the following document content:
{content}`;
      } else {
        userPromptTemplate = state.promptConfig.userPromptTemplate;
      }
    }
    
    const userPrompt = userPromptTemplate.replace('{content}', content).replace('{text}', content);
    
    return {
      systemPrompt,
      userPrompt
    };
  }

  async saveStateData(newState: PluginStateData) {
    this.state = newState;
    await this.saveData(this.state);
  }

  getState(): PluginStateData {
    return this.state;
  }

  hasFullAccess(): boolean {
    return this.state.isPro || this.isTrialActive();
  }

  isTrialActive(): boolean {
    return this.subscriptionService?.isTrialActive() ?? false;
  }

  async startTrial(): Promise<void> {
    if (this.subscriptionService) {
      await this.subscriptionService.startTrial();
    }
  }

  async setLanguage(lang: 'zh' | 'en') {
    this.state.language = lang;
    
    const isZh = lang === 'zh';
    
    const zhSystemPrompt = `你是一名专业的知识图谱构建和结构化解析助手。你的任务是从任意文本中提取实体、挖掘关系、总结内容和提取标签。所有输出必须采用标准Markdown格式，NOT JSON。

## 输出格式规则：
1. 在开头添加HTML注释DocID：<!-- docid: [32位随机唯一字符串] -->
2. 生成标准时间戳
3. 摘要 ≤ 100字，准确概括核心内容
4. 保留3-8个核心关键词标签
5. 实体包含：ID、名称、类型、描述
6. 关系必须清晰、语义规范、非冗余
7. 在底部保留完整原始文本

## 实体类型参考（必须从以下类型中选择）：
- 人物：个人、角色、用户
- 组织：公司、机构、团体
- 地点：城市、国家、场所
- 概念：思想、理论、抽象概念
- 事件：历史事件、活动、会议
- 文档：文章、书籍、论文
- 产品：商品、软件、硬件
- 技术：技术、方法、工具
- 时间：日期、时间段
- 金钱：金额、货币
- 学术：研究领域、学科
- 行业：产业、行业
- 疾病：病症、健康问题
- 药物：药品、治疗方法
- 食物：食材、菜肴

## 关系类型参考（必须从以下类型中选择）：
- 属于、包含、组成、子类、父类（层级关系）
- 相关、相似、衍生（关联关系）
- 导致、影响、促进、阻碍（因果关系）
- 先于、后于、同时（时序关系）
- 位于、拥有、使用、创建、合作（其他关系）

## 固定输出结构（严格遵守）：
<!-- docid: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx -->
知识图谱结构化解析结果

## 一、摘要
（全文核心总结，≤100字）

## 二、关键词标签
- 标签1
- 标签2
- 标签3

## 三、基本信息
- 文档ID：（与头部的docid相同）
- 生成时间戳：（数字时间戳）

## 四、实体库
实体ID | 实体名称 | 实体类型 | 实体描述
entity_001 | - | - | -

## 五、实体关系图谱
源实体ID | 目标实体ID | 关系类型
entity_001 | entity_002 | 语义关系

## 六、原始文本
完整的用户输入原始文本`;

    const enSystemPrompt = `You are a professional knowledge graph construction and structured parsing assistant. Your task is to extract entities, mine relationships, summarize content, and extract tags from any text. All output must be in standard Markdown format, NOT JSON.

## Output Format Rules:
1. Add HTML comment DocID at the beginning: <!-- docid: [32-character random unique string] -->
2. Generate standard timestamp
3. Summary ≤ 100 words, accurately summarizing core content
4. Keep 3-8 core keyword tags
5. Entities include: ID, Name, Type, Description
6. Relationships must be clear, semantically standard, and non-redundant
7. Keep full original text at the bottom

## Entity Type Reference (Must choose from the following):
- Person: Individual, character, user
- Organization: Company, institution, group
- Location: City, country, place
- Concept: Idea, theory, abstract concept
- Event: Historical event, activity, meeting
- Document: Article, book, paper
- Product: Product, software, hardware
- Technology: Technology, method, tool
- Time: Date, time period
- Money: Amount, currency
- Academic: Research field, discipline
- Industry: Industry, sector
- Disease: Illness, health issue
- Medicine: Drug, treatment
- Food: Ingredient, dish

## Relationship Type Reference (Must choose from the following):
- BelongsTo, Contains, ComposedOf, SubclassOf, ParentOf (Hierarchical)
- RelatedTo, SimilarTo, DerivedFrom (Association)
- Causes, Influences, Promotes, Blocks (Causal)
- Before, After, Concurrent (Temporal)
- LocatedAt, Owns, Uses, CreatedBy, CooperatesWith (Other)

## Fixed Output Structure (Strictly Follow):
<!-- docid: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx -->
Knowledge Graph Structured Parsing Result

## I. Content Summary
(Core summary of the full text, ≤100 words)

## II. Keyword Tags
- Tag 1
- Tag 2
- Tag 3

## III. Basic Information
- Document ID: (same as docid in header)
- Generated Timestamp: (numeric timestamp)

## IV. Entity Library
Entity ID | Entity Name | Entity Type | Entity Description
entity_001 | - | - | -

## V. Entity Relationship Graph
Source Entity ID | Target Entity ID | Relationship Type
entity_001 | entity_002 | semantic relationship

## VI. Original Text
Full original user input text`;

    const zhKnowledgePrompt = `你是一名专业的知识扩展助手。根据用户提供的原始内容，遵循3条规则进行知识延伸：
1. 扩展维度分为三类：相似知识、上下游关联知识、延伸补充知识。不重复原文已有信息。
2. 输出固定20个独立知识点。每个知识点要简洁、逻辑独立，并标注扩展类别。
3. 每个知识点包含：简要概念+关键细节，无冗余词，格式统一。

以下是待扩展的原始内容：
{content}`;

    const enKnowledgePrompt = `You are a professional knowledge expansion assistant. Based on the original content provided by the user, you extend knowledge following 3 rules:
1. Expansion dimensions are divided into three categories: similar knowledge, upstream/downstream related knowledge, and obscure supplementary knowledge. Do not repeat information already in the original text.
2. Output a fixed 20 independent knowledge points. Each point should be concise, logically independent, and marked with its expansion category.
3. Each knowledge point includes: brief concept + key details, no redundant words, unified format.

The following is the original content to be expanded:
{content}`;

    const zhModelQueryPrompt = `你是一位知识渊博的专家。你的核心目标是为给定的术语/概念提供详细、全面、深入的介绍和解释。

## 核心任务：
当用户提供一个术语/概念/专业词汇时，你需要提供全面的知识介绍和解释。

## 详细介绍维度：
1. **基本定义**：提供准确完整的定义
2. **发展历史**：追溯起源和演变过程
3. **核心原理**：解释基本原理和工作机制
4. **主要特点**：列出关键特性和重要属性
5. **应用场景**：描述实际应用和使用领域
6. **相关概念**：联系其他相关概念和理论
7. **重要人物/事件**：如有相关的创始人及里程碑事件，请提及
8. **发展趋势**：探讨未来发展方向和研究趋势

## 输出要求：
- 语言准确、清晰、通俗易懂
- 内容全面深入
- 逻辑清晰、层次分明
- 适当使用专业术语但要解释清楚`;

    const enModelQueryPrompt = `You are a knowledgeable expert. Your core goal is to provide detailed, comprehensive, and in-depth introductions and explanations for given terms.

## Core Task:
When users provide a term/concept/terminology, you need to provide comprehensive knowledge introduction and explanation.

## Detailed Introduction Dimensions:
1. **Basic Definition**: Provide accurate and complete definition
2. **Development History**: Trace origins and evolution process
3. **Core Principles**: Explain fundamental principles and working mechanisms
4. **Main Features**: List key characteristics and important attributes
5. **Application Scenarios**: Describe practical applications and usage areas
6. **Related Concepts**: Connect with other related concepts and theories
7. **Important People/Events**: Mention relevant founders and milestone events if applicable
8. **Development Trends**: Discuss future development and research directions

## Output Requirements:
- Accurate, clear, and easy to understand language
- Comprehensive and in-depth content
- Clear logic and hierarchical structure
- Appropriately use professional terminology but explain clearly`;

    this.state.promptConfig.systemPrompt = isZh ? zhSystemPrompt : enSystemPrompt;
    this.state.promptConfig.userPromptTemplate = isZh ? `请分析以下文档内容：
{content}` : `Please analyze the following document content:
{content}`;
    this.state.promptConfig.knowledgePrompt = isZh ? zhKnowledgePrompt : enKnowledgePrompt;
    this.state.promptConfig.modelQueryPrompt = isZh ? zhModelQueryPrompt : enModelQueryPrompt;
    
    await this.saveData(this.state);
  }

  setSelectedParseModel(model: 'local' | 'external') {
    this.state.selectedParseModel = model;
    this.saveData(this.state);
  }

  getUniqueId(): string {
    const deviceId = this.state.deviceId;
    const timestamp = Date.now().toString();
    const combined = deviceId + timestamp + Math.random().toString(36);
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      hash = ((hash << 5) - hash) + combined.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36).padStart(20, '0');
  }

  async activateWithCode(code: string): Promise<void> {
    const deviceId = this.state.deviceId;
    const uniqueId = generateUniqueId();
    const apiBaseUrl = this.state.apiBaseUrl || 'https://worker-service.workers.dev';
    const forwardUrl = `${apiBaseUrl}/api/activate`;
    console.debug('[Knowledge Graph] Activate URL:', forwardUrl, 'Device ID:', deviceId, 'Code:', code);

    try {
      const response = await requestUrl({
        url: forwardUrl,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Bypass-Check': 'true' },
        body: JSON.stringify({
          activation_code: code,
          device_id: deviceId,
          unique_id: uniqueId
        })
      });

      const result = JSON.parse(response.text);

      if (response.status === 200 && result.success) {
        // 验证服务端私钥签名的令牌
        const payload = result.signed_token
          ? await verifySignedToken(result.signed_token)
          : null;

        if (payload) {
          this.state.activationCode = code;
          this.state.isPro = true;
          this.state.expiresAt = new Date(payload.expires_at).getTime();
          await this.saveData(this.state);
          new Notice('激活成功！', 2000);
          this.modals.forEach(modal => modal.render());
        } else {
          // 签名验证失败，不信任响应
          new Notice('激活响应验证失败', 3000);
        }
      } else {
        new Notice(result?.error || '激活失败', 2000);
      }
    } catch (error) {
      console.error('[Knowledge Graph] 激活异常:', error);
      new Notice('激活服务暂时不可用', 2000);
    }
  }

  async validateLicense(): Promise<boolean> {
    const deviceId = this.state.deviceId;
    const uniqueId = generateUniqueId();
    const now = Date.now();
    
    // 本地过期检查：如果本地记录的过期时间已过，直接返回 false
    if (this.state.expiresAt && this.state.expiresAt < now) {
      this.state.isPro = false;
      await this.saveData(this.state);
      console.warn('[Knowledge Graph] License expired locally');
      return false;
    }

    const apiBaseUrl = this.state.apiBaseUrl || 'https://worker-service.workers.dev';
    const forwardUrl = `${apiBaseUrl}/api/validate`;
    console.debug('[Knowledge Graph] Validate URL:', forwardUrl, 'Device ID:', this.state.deviceId);

    try {
      const response = await requestUrl({
        url: forwardUrl,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Bypass-Check': 'true' },
        body: JSON.stringify({
          device_id: deviceId,
          unique_id: uniqueId,
          activation_code: this.state.activationCode || undefined
        })
      });

      const result = JSON.parse(response.text);

      if (response.status === 200 && result.valid) {
        const payload = result.signed_token
          ? await verifySignedToken(result.signed_token)
          : null;

        if (payload) {
          this.state.isPro = true;
          this.state.expiresAt = new Date(payload.expires_at).getTime();
          this.state.lastVerifiedAt = now;
          await this.saveData(this.state);
          return true;
        }
      }

      // 服务端验证失败，检查本地是否有未过期的许可证
      // 安全检查：本地过期时间不能超过上次验证时间太久（防止用户篡改）
      const maxTolerance = 24 * 60 * 60 * 1000;
      const isLocalTimeValid = this.state.expiresAt && 
        this.state.expiresAt > now &&
        (!this.state.lastVerifiedAt || this.state.expiresAt < this.state.lastVerifiedAt + maxTolerance);
      
      if (isLocalTimeValid) {
        console.warn('[Knowledge Graph] Server validation failed, but local license is still valid');
        return true;
      }

      this.state.isPro = false;
      await this.saveData(this.state);
      return false;
    } catch (error) {
      console.error('[Knowledge Graph] License validation error:', error);
      
      // 服务端不可达时，使用本地过期时间作为降级方案
      // 安全检查：本地过期时间不能超过上次验证时间太久（防止用户篡改）
      const maxTolerance = 24 * 60 * 60 * 1000;
      const isLocalTimeValid = this.state.expiresAt && 
        this.state.expiresAt > now &&
        (!this.state.lastVerifiedAt || this.state.expiresAt < this.state.lastVerifiedAt + maxTolerance);
      
      if (isLocalTimeValid) {
        console.warn('[Knowledge Graph] Server unreachable, using local validation (still valid)');
        return true;
      }
      
      return false;
    }
  }

  private validationTimer: number | null = null;

  private startPeriodicValidation(): void {
    // 每1小时检查一次本地过期时间，每1-4小时验证服务端
    const scheduleNext = () => {
      const delayMs = (1 + Math.random() * 3) * 60 * 60 * 1000;
      this.validationTimer = window.setTimeout(async () => {
        // 先检查本地过期时间
        if (this.state.isPro && this.state.expiresAt && this.state.expiresAt < Date.now()) {
          this.state.isPro = false;
          await this.saveData(this.state);
          new Notice('许可证已过期，Pro 功能已禁用', 3000);
        }
        
        // 如果仍为 Pro，进行服务端验证
        if (this.state.isPro && this.state.activationCode) {
          const isValid = await this.validateLicense();
          if (!isValid) {
            new Notice('许可证验证失败，Pro 功能已禁用', 3000);
          }
        }
        scheduleNext();
      }, delayMs);
    };
    scheduleNext();
  }

  async onload() {
    initLanguageConfig(this.app);

    setPlatformInfo({
      isMac: Platform.isMacOS,
      isWin: Platform.isWin,
      isLinux: Platform.isLinux,
      isMobile: Platform.isMobile,
      platform: Platform.isMacOS ? 'MacIntel' : Platform.isWin ? 'Win32' : Platform.isLinux ? 'Linux' : 'Unknown',
      userAgent: Platform.isMacOS ? 'Mac' : Platform.isWin ? 'Windows' : Platform.isLinux ? 'Linux' : 'Unknown'
    });

    this.state = await this.loadState();

    // Initialize graph storage service with retry
    await this.initializeGraphStorageWithRetry();

    this.setupFileWatcher();
    await this.validateLicenseOnStartup();
    this.startPeriodicValidation();

    // 暴露插件实例给前端 JavaScript
    (window as any).kgPlugin = this;

    this.ribbonIconEl = this.addRibbonIcon('brain', 'Knowledge Graph', () => {
      const modal = new MainModal(this);
      this.modals.push(modal);
      modal.open();
    });
    this.ribbonIconEl.textContent = '🧠';

    // 异步触发知识扩展（插件启动时）
    // 为避免阻塞主线程，不使用 async/await 延迟，让它自然执行
    this.triggerKnowledgeExpansionOnStartup();
  }

  /**
   * 插件启动时异步触发知识扩展
   * 获取本地最新文档，解析并进行知识扩展，结果存储到状态中供UI展示
   */
  private async triggerKnowledgeExpansionOnStartup(): Promise<void> {
    // 延迟5秒执行，确保插件完全初始化
    await new Promise(resolve => window.setTimeout(resolve, 5000));

    try {
      const state = this.getState();
      
      // 检查是否有文档
      if (state.documents.length === 0) {
        return;
      }

      // 检查是否在1小时内已经执行过
      const lastUpdate = state.lastKnowledgeUpdate || 0;
      const now = Date.now();
      if (now - lastUpdate < 3600000) {
        return;
      }


      // 获取用户最近一条MD文档
      const latestDoc = state.documents[state.documents.length - 1];
      const docContent = `${latestDoc.title || ''}\n${latestDoc.summary || ''}\n${latestDoc.content || ''}`;
      

      // 从数据库中关联匹配相关知识
      let relatedKnowledge = '';
      try {
        let graphStorage = getGraphStorageService();
        
        // 如果服务存在但数据库未初始化，尝试重新初始化
        if (graphStorage) {
          try {
            // 尝试调用一个简单方法来验证数据库是否已初始化
            await graphStorage.getAllEntities();
          } catch (_e) {
            // 如果数据库未初始化，尝试重新初始化
            console.warn(`[Knowledge Graph] ⚠️ 数据库未初始化，尝试重新初始化...`);
            graphStorage = await createGraphStorageService();
          }
        }
        
        if (graphStorage && latestDoc.docId) {
          try {
            const entities = await graphStorage.queryEntitiesByDocId(latestDoc.docId);
            
            let allRelations: any[] = [];
            for (const entity of entities) {
              const relations = await graphStorage.queryRelationsByEntity(entity.id);
              allRelations = [...allRelations, ...relations];
            }
            
            if (entities.length > 0 || allRelations.length > 0) {
              relatedKnowledge = `\n\n## 关联知识库\n\n### 相关实体：\n`;
              entities.forEach(e => {
                relatedKnowledge += `- ${e.name}（${e.type}）: ${e.summary || '暂无描述'}\n`;
              });
              
              if (allRelations.length > 0) {
                relatedKnowledge += `\n### 相关关系：\n`;
                allRelations.forEach(r => {
                  const sourceEntity = entities.find(e => e.id === r.sourceId);
                  const targetEntity = entities.find(e => e.id === r.targetId);
                  relatedKnowledge += `- ${sourceEntity?.name || '未知'} --[${r.relationType}]--> ${targetEntity?.name || '未知'}\n`;
                });
              }
            }
          } catch (error) {
            console.warn(`[Knowledge Graph] ⚠️ 查询关联知识失败:`, error);
          }
        }
      } catch (error) {
        console.warn(`[Knowledge Graph] ⚠️ 查询关联知识失败:`, error);
      }

      // 构建user prompt的content（包含文档内容和关联知识）
      const knowledgeUserContent = `## 原文内容
${docContent}

${relatedKnowledge}`;

      // system prompt 只包含规则和格式要求
      const knowledgeSystemPrompt = state.promptConfig.knowledgePrompt || `You are a professional knowledge expansion assistant. Based on the original content provided by the user, you extend knowledge following 3 rules:
1. Expansion dimensions are divided into three categories: similar knowledge, upstream/downstream related knowledge, and obscure supplementary knowledge. Do not repeat information already in the original text.
2. Output a fixed 20 independent knowledge points. Each point should be concise, logically independent, and marked with its expansion category.
3. Each knowledge point includes: brief concept + key details, no redundant words, unified format.

The following is the original content to be expanded:
{content}

Output the expanded knowledge points according to the rules above.

Fixed output format (one knowledge point per line):
【Knowledge: Knowledge Point Name】Detailed knowledge content (Category: Similar/Upstream-Downstream/Obscure Supplementary)`;
      
      const knowledgeUserPrompt = knowledgeUserContent;

      // 使用仪表盘上选择的模型
      const modelValue = state.selectedParseModel || 'local';
      
      try {
        const knowledgeResponse = await this.callModel(knowledgeUserPrompt, modelValue, knowledgeSystemPrompt);

        // 解析结果
        let knowledgeItems: Array<{name: string, category: string, summary: string}> = [];
        try {
          knowledgeItems = JSON.parse(knowledgeResponse);
        } catch {
          const isZh = this.state.language === 'zh';
          knowledgeItems = [{name: isZh ? '知识扩展' : 'Knowledge Expansion', category: isZh ? '其他' : 'Other', summary: knowledgeResponse}];
        }

        // 存储到状态中
        state.lastKnowledgeUpdate = Date.now();
        state.cachedKnowledgeItems = knowledgeItems;
        await this.saveData(state);


        // 如果模态框已经打开，更新UI
        this.modals.forEach(modal => {
          if (modal instanceof MainModal) {
            modal.updateKnowledgeDisplay(knowledgeItems);
          }
        });

      } catch (error) {
        console.warn('[Knowledge Graph] ⚠️ 启动时知识扩展调用失败:', error);
      }

    } catch (error) {
      console.error('[Knowledge Graph] ❌ 启动时知识扩展异常:', error);
    }
  }

  private async validateLicenseOnStartup(): Promise<void> {
    if (this.state.isPro && this.state.activationCode) {
      const isValid = await this.validateLicense();
      if (!isValid) {
        new Notice('许可证验证失败，请重新激活', 3000);
        this.state.isPro = false;
        await this.saveData(this.state);
      }
    }
  }

  private async initializeGraphStorageWithRetry(maxRetries: number = 3, delayMs: number = 1000): Promise<void> {
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt < maxRetries) {
      try {
        this.graphStorage = await createGraphStorageService();
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        attempt++;
        console.warn(`[Knowledge Graph] ⚠️ Graph Storage Service initialization attempt ${attempt} failed:`, lastError.message);
        
        if (attempt < maxRetries) {
          await new Promise(resolve => window.setTimeout(resolve, delayMs));
        }
      }
    }

    console.error('[Knowledge Graph] ❌ Failed to initialize Graph Storage Service after ${maxRetries} attempts');
    console.error('[Knowledge Graph] Error details:', lastError?.stack || lastError?.message);
    new Notice('知识图谱数据库初始化失败，部分功能可能受限', 5000);
  }
}
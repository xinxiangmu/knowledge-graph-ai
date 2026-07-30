import { Plugin } from 'obsidian';
import type KnowledgeGraphPlugin from '../main.js';
import { parseHtml } from '../utils/dom-helper.js';

export interface IntroViewProps {
  plugin: KnowledgeGraphPlugin;
  onStartTrial: () => void;
  onPurchase: (plan: 'monthly' | 'yearly') => void;
}

export interface IntroViewOptions {
  theme?: 'light' | 'dark';
}

export class IntroView {
  private container: HTMLElement;
  private props: IntroViewProps;
  private theme: 'light' | 'dark';
  private isRendered: boolean = false;

  constructor(container: HTMLElement, props: IntroViewProps, options: IntroViewOptions = {}) {
    this.container = container;
    this.props = props;
    this.theme = options.theme || 'light';
  }

  public render(): void {
    if (this.isRendered) {
      return;
    }

    const html = this.generateHTML();
    const fragment = parseHtml(html);
    this.container.replaceChildren();
    this.container.appendChild(fragment);
    this.attachEventListeners();
    this.isRendered = true;
  }

  public updateTheme(theme: 'light' | 'dark'): void {
    this.theme = theme;
    const root = this.container.querySelector('.kg-intro-root');
    if (root) {
      root.setAttribute('data-theme', theme);
    }
  }

  public getContainer(): HTMLElement {
    return this.container;
  }

  private generateHTML(): string {
    return `
      <div class="kg-intro-root" data-theme="${this.theme}">
        <style>
          .kg-intro-root {
            --kg-amber: #d97706;
            --kg-amber-light: #f59e0b;
            --kg-teal: #0d9488;
            --kg-teal-light: #14b8a6;
            --kg-bg: #ffffff;
            --kg-bg-secondary: #f9fafb;
            --kg-text: #1f2937;
            --kg-text-secondary: #6b7280;
            --kg-border: #e5e7eb;
            --kg-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 2rem;
            max-width: 640px;
            margin: 0 auto;
            color: var(--kg-text);
            background: var(--kg-bg);
          }

          .kg-intro-root[data-theme="dark"] {
            --kg-bg: #1f2937;
            --kg-bg-secondary: #374151;
            --kg-text: #f9fafb;
            --kg-text-secondary: #d1d5db;
            --kg-border: #4b5563;
            --kg-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
          }

          .kg-intro-header {
            text-align: center;
            margin-bottom: 2rem;
            padding-bottom: 1.5rem;
            border-bottom: 1px solid var(--kg-border);
          }

          .kg-intro-logo {
            font-size: 2.5rem;
            margin-bottom: 0.75rem;
          }

          .kg-intro-title {
            font-size: 1.75rem;
            font-weight: 700;
            color: var(--kg-text);
            margin: 0 0 0.5rem 0;
          }

          .kg-intro-subtitle {
            font-size: 1.125rem;
            color: var(--kg-text-secondary);
            margin: 0;
            line-height: 1.6;
          }

          .kg-intro-badge {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            background: linear-gradient(135deg, var(--kg-amber), var(--kg-teal));
            color: white;
            font-size: 0.75rem;
            font-weight: 600;
            border-radius: 9999px;
            margin-top: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }

          .kg-intro-section {
            margin-bottom: 2rem;
          }

          .kg-intro-section-title {
            font-size: 1.125rem;
            font-weight: 600;
            color: var(--kg-text);
            margin: 0 0 1rem 0;
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          .kg-intro-features {
            list-style: none;
            padding: 0;
            margin: 0;
          }

          .kg-intro-features li {
            display: flex;
            align-items: flex-start;
            gap: 0.75rem;
            padding: 0.625rem 0;
            color: var(--kg-text-secondary);
            font-size: 0.9375rem;
            line-height: 1.5;
          }

          .kg-intro-features li::before {
            content: "•";
            color: var(--kg-teal);
            font-weight: bold;
          }

          .kg-intro-features.pro li::before {
            color: var(--kg-amber);
          }

          .kg-intro-pro-section {
            background: var(--kg-bg-secondary);
            border-radius: 0.75rem;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
            border: 1px solid var(--kg-border);
          }

          .kg-intro-trial {
            text-align: center;
            padding: 1rem;
            background: linear-gradient(135deg, rgba(217, 119, 6, 0.1), rgba(13, 148, 136, 0.1));
            border-radius: 0.5rem;
            margin-bottom: 1.5rem;
            font-size: 0.875rem;
            color: var(--kg-text-secondary);
          }

          .kg-intro-trial strong {
            color: var(--kg-text);
          }

          .kg-intro-buttons {
            display: flex;
            gap: 1rem;
            justify-content: center;
          }

          .kg-intro-btn {
            padding: 0.75rem 1.5rem;
            font-size: 0.9375rem;
            font-weight: 600;
            border-radius: 0.5rem;
            cursor: pointer;
            transition: all 0.2s ease;
            border: 2px solid transparent;
            min-width: 140px;
          }

          .kg-intro-btn-secondary {
            background: transparent;
            color: var(--kg-teal);
            border-color: var(--kg-teal);
          }

          .kg-intro-btn-secondary:hover {
            background: var(--kg-teal);
            color: white;
          }

          .kg-intro-btn-primary {
            background: linear-gradient(135deg, var(--kg-amber), var(--kg-amber-light));
            color: white;
            border-color: var(--kg-amber);
          }

          .kg-intro-btn-primary:hover {
            background: linear-gradient(135deg, var(--kg-amber-light), var(--kg-amber));
            transform: translateY(-1px);
            box-shadow: var(--kg-shadow);
          }

          .kg-intro-footer {
            margin-top: 2rem;
            padding-top: 1.5rem;
            border-top: 1px solid var(--kg-border);
            text-align: center;
            font-size: 0.8125rem;
            color: var(--kg-text-secondary);
          }

          .kg-intro-divider {
            height: 1px;
            background: linear-gradient(90deg, transparent, var(--kg-border), transparent);
            margin: 1.5rem 0;
          }

          .kg-intro-billing-toggle {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            margin-bottom: 1rem;
            background: var(--kg-bg-secondary);
            padding: 4px;
            border-radius: 12px;
          }

          .kg-intro-billing-option {
            padding: 8px 20px;
            font-size: 14px;
            color: var(--kg-text-secondary);
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
            text-align: center;
            flex: 1;
          }

          .kg-intro-billing-option.active {
            background: var(--kg-amber);
            color: white;
          }

          .kg-intro-billing-option:hover:not(.active) {
            color: var(--kg-text);
          }

          .kg-intro-billing-discount {
            font-size: 12px;
            color: #30d158;
            font-weight: 600;
            margin-left: 4px;
          }

          .kg-intro-pricing-card {
            background: var(--kg-bg-secondary);
            border-radius: 12px;
            padding: 1.5rem;
            text-align: center;
            border: 2px solid transparent;
            transition: all 0.3s;
          }

          .kg-intro-pricing-card:hover {
            border-color: var(--kg-amber);
          }

          .kg-intro-pricing-card.popular {
            border-color: var(--kg-amber);
            background: linear-gradient(180deg, rgba(217, 119, 6, 0.05), transparent);
          }

          .kg-intro-pricing-card h4 {
            font-size: 18px;
            font-weight: 600;
            color: var(--kg-text);
            margin-bottom: 8px;
          }

          .kg-intro-pricing-card .price {
            font-size: 36px;
            font-weight: 700;
            color: var(--kg-text);
          }

          .kg-intro-pricing-card .period {
            font-size: 14px;
            color: var(--kg-text-muted);
            margin-left: 4px;
          }

          .kg-intro-pricing-card .yearly-price {
            font-size: 14px;
            color: var(--kg-text-secondary);
            margin-top: 4px;
            display: block;
          }

          .kg-intro-pricing-card .btn-primary {
            margin-top: 12px;
            width: 100%;
          }

          .kg-intro-pricing-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
            margin-bottom: 1.5rem;
          }

          .kg-purchase-loading {
            opacity: 0.7;
            pointer-events: none;
          }
        </style>

        <header class="kg-intro-header">
          <div class="kg-intro-logo">🧠</div>
          <h1 class="kg-intro-title">Knowledge Graph AI Pro</h1>
          <p class="kg-intro-subtitle">将你的聊天记录和文本转化为结构化知识</p>
          <span class="kg-intro-badge">免费版</span>
        </header>

        <section class="kg-intro-section">
          <h2 class="kg-intro-section-title">✨ 核心功能</h2>
          <ul class="kg-intro-features">
            <li>AI智能解析，自动提取实体和关系</li>
            <li>知识图谱可视化，探索知识连接</li>
            <li>时间线展示，回顾知识演进</li>
          </ul>
        </section>

        <div class="kg-intro-divider"></div>

        <section class="kg-intro-pro-section">
          <h2 class="kg-intro-section-title">⭐ Pro独家功能</h2>
          <ul class="kg-intro-features pro">
            <li>GPT-4/Gemini等外部AI支持</li>
            <li>实体智能融合，合并重复实体</li>
            <li>历史文档批量处理</li>
            <li>点击节点直达原文</li>
            <li>无限制文档处理</li>
            <li>Vault全文监听</li>
          </ul>
        </section>

        <div class="kg-intro-trial">
          <strong>📅 3天免费试用</strong> · 订阅时自动开启 · 需绑定信用卡
        </div>

        <div class="kg-intro-billing-toggle">
          <span class="kg-intro-billing-option active" id="kg-billing-monthly">月度</span>
          <span class="kg-intro-billing-option" id="kg-billing-yearly">年度</span>
          <span class="kg-intro-billing-discount" id="kg-billing-discount">省20%</span>
        </div>

        <div class="kg-intro-pricing-grid">
          <div class="kg-intro-pricing-card">
            <h4>月度订阅</h4>
            <span class="price" id="kg-price-monthly">¥68</span>
            <span class="period">/月</span>
            <button class="kg-intro-btn kg-intro-btn-primary" id="kg-btn-monthly">
              立即订阅
            </button>
          </div>
          <div class="kg-intro-pricing-card popular">
            <h4>年度订阅</h4>
            <span class="price" id="kg-price-yearly">¥588</span>
            <span class="period">/年</span>
            <span class="yearly-price" id="kg-price-save">相当于 ¥49/月</span>
            <button class="kg-intro-btn kg-intro-btn-primary" id="kg-btn-yearly">
              立即订阅
            </button>
          </div>
        </div>

        <footer class="kg-intro-footer">
          <p>版本 1.0.0 · © 2024 Knowledge Graph AI</p>
        </footer>
      </div>
    `;
  }

  private attachEventListeners(): void {
    const monthlyBtn = this.container.querySelector('#kg-btn-monthly');
    const yearlyBtn = this.container.querySelector('#kg-btn-yearly');
    const billingMonthly = this.container.querySelector('#kg-billing-monthly');
    const billingYearly = this.container.querySelector('#kg-billing-yearly');

    const handlePurchase = async (plan: 'monthly' | 'yearly') => {
      window.open('https://api.leenchat.com', '_blank');
    };

    if (monthlyBtn) {
      monthlyBtn.addEventListener('click', () => {
        handlePurchase('monthly');
      });
    }

    if (yearlyBtn) {
      yearlyBtn.addEventListener('click', () => {
        handlePurchase('yearly');
      });
    }

    const updateBillingUI = (period: 'monthly' | 'yearly') => {
      if (billingMonthly && billingYearly) {
        if (period === 'monthly') {
          billingMonthly.classList.add('active');
          billingYearly.classList.remove('active');
        } else {
          billingYearly.classList.add('active');
          billingMonthly.classList.remove('active');
        }
      }
    };

    if (billingMonthly) {
      billingMonthly.addEventListener('click', () => {
        updateBillingUI('monthly');
      });
    }

    if (billingYearly) {
      billingYearly.addEventListener('click', () => {
        updateBillingUI('yearly');
      });
    }
  }
}

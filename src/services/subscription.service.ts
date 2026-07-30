import { SubscriptionModel } from '../models/subscription.js';

export interface LemonSqueezyConfig {
  storeId: string;
  productId: string;
  apiKey: string;
  webhookSecret: string;
}

export interface SubscriptionStatus {
  plan: 'free' | 'pro';
  status: 'active' | 'expired' | 'cancelled' | 'trial';
  trialEndDate?: number;
  purchaseDate?: number;
  expirationDate?: number;
}

export interface LemonSqueezyWebhookPayload {
  meta: {
    event_name: string;
    custom_data?: {
      accountId?: string;
    };
  };
  data: {
    id: string;
    attributes: {
      status: string;
      ends_at: string | null;
      trial_ends_at: string | null;
      created_at: string;
    };
  };
}

export interface SubscriptionService {
  initiatePurchase(): Promise<void>;
  handleWebhook(payload: string, signature: string): Promise<void>;
  checkSubscriptionStatus(): Promise<SubscriptionStatus>;
  activateDomesticLicense(encryptedData: string): Promise<boolean>;
  verifyDomesticLicense(): Promise<boolean>;
  startTrial(): Promise<boolean>;
  isTrialActive(): boolean;
  getTrialDaysRemaining(): number;
  convertTrialToPro(encryptedData: string): Promise<boolean>;
}

const LEMON_SQUEEZY_CHECKOUT_URL = 'https://api.leenchat.com';
const DOMESTIC_LICENSE_PREFIX = 'KGL';

export class SubscriptionServiceImpl implements SubscriptionService {
  private subscriptionModel: SubscriptionModel;
  private accountId: string;
  private lemonSqueezyConfig: LemonSqueezyConfig | null = null;
  private localStorage: Map<string, string> = new Map();

  constructor(accountId: string, subscriptionModel: SubscriptionModel) {
    this.accountId = accountId;
    this.subscriptionModel = subscriptionModel;
  }

  configureLemonSqueezy(config: LemonSqueezyConfig): void {
    this.lemonSqueezyConfig = config;
  }

  async initiatePurchase(): Promise<void> {
    if (!this.lemonSqueezyConfig) {
      throw new Error('Lemon Squeezy configuration not set');
    }

    const checkoutUrl = `${LEMON_SQUEEZY_CHECKOUT_URL}/${this.lemonSqueezyConfig.productId}`;
    const params = new URLSearchParams({
     checkout: 'custom',
      'data[email]': this.accountId,
      'meta[custom_data][accountId]': this.accountId,
    });

    const fullUrl = `${checkoutUrl}?${params.toString()}`;
    window.open(fullUrl, '_blank');
  }

  async handleWebhook(payload: string, signature: string): Promise<void> {
    if (!this.lemonSqueezyConfig) {
      throw new Error('Lemon Squeezy configuration not set');
    }

    if (!this.verifyWebhookSignature(payload, signature)) {
      throw new Error('Invalid webhook signature');
    }

    const data: LemonSqueezyWebhookPayload = JSON.parse(payload);
    const { event_name, custom_data } = data.meta;
    const accountId = custom_data?.accountId || this.accountId;

    switch (event_name) {
      case 'subscription_created':
      case 'subscription_updated':
        await this.handleSubscriptionCreatedOrUpdated(data.data, accountId);
        break;
      case 'subscription_cancelled':
        await this.handleSubscriptionCancelled(accountId);
        break;
      default:
        console.warn(`Unknown webhook event: ${event_name}`);
    }
  }

  private verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.lemonSqueezyConfig) {
      return false;
    }

    const secret = this.lemonSqueezyConfig.webhookSecret;

    // Fallback hash for environments without Web Crypto API
    const str = payload + secret;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }

    const expectedSignature = Math.abs(hash).toString(16);
    return signature === expectedSignature;
  }

  private async handleSubscriptionCreatedOrUpdated(
    subscriptionData: LemonSqueezyWebhookPayload['data'],
    accountId: string
  ): Promise<void> {
    const attributes = subscriptionData.attributes;
    const status = this.mapLemonSqueezyStatus(attributes.status);

    let subscription = this.subscriptionModel.getByAccountId(accountId);
    if (!subscription) {
      subscription = this.subscriptionModel.create({
        accountId,
        plan: 'pro',
        status,
        verificationData: subscriptionData.id,
      });
    } else {
      this.subscriptionModel.update(accountId, {
        plan: 'pro',
        status,
        verificationData: subscriptionData.id,
      });
    }

    if (attributes.ends_at) {
      const endTime = new Date(attributes.ends_at).getTime();
      this.subscriptionModel.update(accountId, { endTime });
    }

    if (attributes.trial_ends_at) {
      const trialEndTime = new Date(attributes.trial_ends_at).getTime();
      this.saveTrialEndDate(trialEndTime);
    }

    await this.persistSubscriptionData();
  }

  private async handleSubscriptionCancelled(accountId: string): Promise<void> {
    this.subscriptionModel.update(accountId, {
      status: 'cancelled',
    });
    await this.persistSubscriptionData();
  }

  private mapLemonSqueezyStatus(lsStatus: string): 'active' | 'expired' | 'cancelled' | 'trial' {
    switch (lsStatus) {
      case 'active':
        return 'active';
      case 'past_due':
        return 'expired';
      case 'cancelled':
      case 'expired':
        return 'cancelled';
      case 'trial':
        return 'trial';
      default:
        return 'active';
    }
  }

  async checkSubscriptionStatus(): Promise<SubscriptionStatus> {
    const subscription = this.subscriptionModel.getByAccountId(this.accountId);

    if (!subscription) {
      return {
        plan: 'free',
        status: 'expired',
      };
    }

    const now = Date.now();
    const trialEndDate = this.getTrialEndDate();

    if (subscription.plan === 'free' && trialEndDate && trialEndDate > now) {
      return {
        plan: 'free',
        status: 'trial',
        trialEndDate,
      };
    }

    if (subscription.plan === 'pro' && subscription.status === 'active') {
      if (subscription.endTime > now) {
        return {
          plan: 'pro',
          status: 'active',
          purchaseDate: subscription.startTime,
          expirationDate: subscription.endTime,
        };
      } else {
        this.subscriptionModel.update(this.accountId, { status: 'expired' });
        return {
          plan: 'pro',
          status: 'expired',
          purchaseDate: subscription.startTime,
          expirationDate: subscription.endTime,
        };
      }
    }

    return {
      plan: subscription.plan,
      status: subscription.status,
    };
  }

  async activateDomesticLicense(encryptedData: string): Promise<boolean> {
    const decoded = this.decodeDomesticLicense(encryptedData);

    if (!decoded) {
      return false;
    }

    if (decoded.type !== 'PRO' && decoded.type !== 'TRIAL') {
      return false;
    }

    const now = Date.now();
    const endTime = decoded.expiration || now + 365 * 24 * 60 * 60 * 1000;

    let subscription = this.subscriptionModel.getByAccountId(this.accountId);
    if (!subscription) {
      subscription = this.subscriptionModel.create({
        accountId: this.accountId,
        plan: 'pro',
        startTime: now,
        endTime,
        status: 'active',
        verificationData: encryptedData,
      });
    } else {
      this.subscriptionModel.update(this.accountId, {
        plan: 'pro',
        startTime: now,
        endTime,
        status: 'active',
        verificationData: encryptedData,
      });
    }

    await this.persistSubscriptionData();
    return true;
  }

  async verifyDomesticLicense(): Promise<boolean> {
    const subscription = this.subscriptionModel.getByAccountId(this.accountId);

    if (!subscription) {
      return false;
    }

    if (subscription.plan !== 'pro' || subscription.status !== 'active') {
      return false;
    }

    if (subscription.verificationData.startsWith(DOMESTIC_LICENSE_PREFIX)) {
      const decoded = this.decodeDomesticLicense(subscription.verificationData);
      if (!decoded) {
        return false;
      }

      if (decoded.expiration && decoded.expiration < Date.now()) {
        this.subscriptionModel.update(this.accountId, { status: 'expired' });
        return false;
      }
    }

    return subscription.endTime > Date.now();
  }

  private decodeDomesticLicense(encryptedData: string): {
    type: string;
    expiration?: number;
    accountId?: string;
  } | null {
    if (!encryptedData.startsWith(DOMESTIC_LICENSE_PREFIX)) {
      return null;
    }

    try {
      const data = encryptedData.substring(DOMESTIC_LICENSE_PREFIX.length);
      const decoded = atob(data);
      const parts = decoded.split(':');

      if (parts.length < 2) {
        return null;
      }

      const type = parts[0];
      const expiration = parts[1] ? parseInt(parts[1], 10) : undefined;
      const accountId = parts[2] || undefined;

      return { type, expiration, accountId };
    } catch {
      return null;
    }
  }

  async startTrial(): Promise<boolean> {
    await this.initiatePurchase();
    return true;
  }

  isTrialActive(): boolean {
    const subscription = this.subscriptionModel.getByAccountId(this.accountId);
    const trialEndDate = this.getTrialEndDate();

    if (!trialEndDate) {
      return false;
    }

    const now = Date.now();
    const hasActiveSubscription = subscription?.status === 'active';
    const withinTrialPeriod = trialEndDate > now;

    return hasActiveSubscription && withinTrialPeriod;
  }

  getTrialDaysRemaining(): number {
    const trialEndDate = this.getTrialEndDate();

    if (!trialEndDate) {
      return 0;
    }

    const now = Date.now();
    const remaining = trialEndDate - now;

    if (remaining <= 0) {
      return 0;
    }

    return Math.ceil(remaining / (1000 * 60 * 60 * 24));
  }

  async convertTrialToPro(encryptedData: string): Promise<boolean> {
    const subscription = this.subscriptionModel.getByAccountId(this.accountId);

    if (!subscription) {
      return false;
    }

    if (!this.isTrialActive()) {
      return false;
    }

    return await this.activateDomesticLicense(encryptedData);
  }

  private saveTrialEndDate(trialEndDate: number): void {
    this.localStorage.set(`trial_end_date_${this.accountId}`, trialEndDate.toString());
    this.saveToPersistentStorage();
  }

  private getTrialEndDate(): number | null {
    const stored = this.localStorage.get(`trial_end_date_${this.accountId}`);
    if (stored) {
      return parseInt(stored, 10);
    }
    return null;
  }

  private async persistSubscriptionData(): Promise<void> {
    const subscription = this.subscriptionModel.getByAccountId(this.accountId);
    if (subscription) {
      this.localStorage.set(`subscription_${this.accountId}`, JSON.stringify(subscription));
      this.saveToPersistentStorage();
    }
  }

  private saveToPersistentStorage(): void {
    try {
      const data: Record<string, string> = {};
      this.localStorage.forEach((value, key) => {
        data[key] = value;
      });
      localStorage.setItem('kg_subscription_data', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to persist subscription data:', error);
    }
  }

  loadFromPersistentStorage(): void {
    try {
      const stored = localStorage.getItem('kg_subscription_data');
      if (stored) {
        const data = JSON.parse(stored);
        Object.entries(data).forEach(([key, value]) => {
          this.localStorage.set(key, value as string);
        });
      }
    } catch (error) {
      console.error('Failed to load subscription data:', error);
    }
  }
}

let globalService: SubscriptionService | null = null;

export async function createSubscriptionService(
  accountId: string,
  subscriptionModel: SubscriptionModel,
  config?: LemonSqueezyConfig
): Promise<SubscriptionService> {
  const service = new SubscriptionServiceImpl(accountId, subscriptionModel);
  service.loadFromPersistentStorage();

  if (config) {
    service.configureLemonSqueezy(config);
  }

  globalService = service;
  return service;
}

export function getSubscriptionService(): SubscriptionService | null {
  return globalService;
}

export function generateDomesticLicense(
  accountId: string,
  type: 'PRO' | 'TRIAL',
  expirationDays?: number
): string {
  const now = Date.now();
  const expiration = expirationDays
    ? now + expirationDays * 24 * 60 * 60 * 1000
    : undefined;

  const data = `${type}:${expiration || ''}:${accountId}`;
  const encoded = btoa(data);

  return `${DOMESTIC_LICENSE_PREFIX}${encoded}`;
}

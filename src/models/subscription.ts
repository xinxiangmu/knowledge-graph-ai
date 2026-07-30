export interface Subscription {
  accountId: string;
  plan: 'free' | 'pro';
  startTime: number;
  endTime: number;
  deviceCount: number;
  maxDevices: number;
  trialUsed: boolean;
  status: 'active' | 'expired' | 'cancelled' | 'trial';
  verificationData: string;
}

export class SubscriptionModel {
  private subscriptions: Map<string, Subscription> = new Map();

  create(data: Partial<Subscription> & { accountId: string }): Subscription {
    if (!data.accountId) {
      throw new Error('缺少必需字段');
    }

    const now = Date.now();
    const subscription: Subscription = {
      accountId: data.accountId,
      plan: data.plan || 'free',
      startTime: data.startTime || now,
      endTime: data.endTime || now,
      deviceCount: data.deviceCount ?? 0,
      maxDevices: data.maxDevices ?? 3,
      trialUsed: data.trialUsed ?? false,
      status: data.status || 'active',
      verificationData: data.verificationData || '',
    };

    this.subscriptions.set(subscription.accountId, subscription);
    return subscription;
  }

  getByAccountId(accountId: string): Subscription | null {
    return this.subscriptions.get(accountId) || null;
  }

  update(accountId: string, data: Partial<Subscription>): Subscription | null {
    const existing = this.subscriptions.get(accountId);
    if (!existing) {
      return null;
    }

    const updated: Subscription = {
      ...existing,
      ...data,
      accountId: existing.accountId,
    };

    this.subscriptions.set(accountId, updated);
    return updated;
  }

  delete(accountId: string): boolean {
    return this.subscriptions.delete(accountId);
  }

  isActive(accountId: string): boolean {
    const subscription = this.subscriptions.get(accountId);
    if (!subscription) {
      return false;
    }
    return subscription.status === 'active' && subscription.endTime > Date.now();
  }

  isTrialUsed(accountId: string): boolean {
    const subscription = this.subscriptions.get(accountId);
    return subscription?.trialUsed ?? false;
  }

  canAddDevice(accountId: string): boolean {
    const subscription = this.subscriptions.get(accountId);
    if (!subscription) {
      return false;
    }
    return subscription.deviceCount < subscription.maxDevices;
  }

  isPro(accountId: string): boolean {
    const subscription = this.subscriptions.get(accountId);
    return subscription?.plan === 'pro';
  }

  getRemainingDays(accountId: string): number {
    const subscription = this.subscriptions.get(accountId);
    if (!subscription) {
      return 0;
    }
    const remaining = subscription.endTime - Date.now();
    return remaining > 0 ? Math.ceil(remaining / (1000 * 60 * 60 * 24)) : 0;
  }
}
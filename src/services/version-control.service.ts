import { GraphStorageService } from './graph-storage.service.js';

export const FREE_DOC_LIMIT = 50;
export const WARNING_THRESHOLD = 45;
export const PRO_PRICE = '$9.9';

export const PRO_FEATURES = [
  'external-ai',
  'entity-fusion',
  'history-processing',
  'unlimited-docs',
  'full-watch',
] as const;

export const FREE_FEATURES = [
  'local-ai',
  'basic-graph',
  'timeline',
  'limited-docs',
  'plugin-only-watch',
] as const;

export type ProFeature = typeof PRO_FEATURES[number];
export type FreeFeature = typeof FREE_FEATURES[number];
export type FeatureName = ProFeature | FreeFeature;

export interface UpgradePromptOptions {
  title: string;
  message: string;
  featureName: string;
}

export interface VersionControlService {
  getDocumentCount(): Promise<number>;
  isOverLimit(): Promise<boolean>;
  canCreateDocument(): Promise<boolean>;
  isApproachingLimit(): Promise<boolean>;
  getRemainingSlots(): Promise<number>;
}

export interface FeatureGate {
  isProFeature(feature: string): boolean;
  canUseFeature(feature: string): Promise<boolean>;
  getProFeatures(): string[];
  getFreeFeatures(): string[];
}

export interface UpgradePromptCallback {
  (options: UpgradePromptOptions): Promise<'upgrade' | 'later' | null>;
}

export class VersionControlServiceImpl implements VersionControlService {
  private graphStorage: GraphStorageService;
  private currentDocumentCount: number = 0;
  private upgradePromptCallback: UpgradePromptCallback | null = null;

  constructor(graphStorage: GraphStorageService) {
    this.graphStorage = graphStorage;
  }

  setUpgradePromptCallback(callback: UpgradePromptCallback): void {
    this.upgradePromptCallback = callback;
  }

  async getDocumentCount(): Promise<number> {
    this.currentDocumentCount = await this.graphStorage.getDocumentCount();
    return this.currentDocumentCount;
  }

  async isOverLimit(): Promise<boolean> {
    const count = await this.getDocumentCount();
    return count >= FREE_DOC_LIMIT;
  }

  async canCreateDocument(): Promise<boolean> {
    const count = await this.getDocumentCount();
    return count < FREE_DOC_LIMIT;
  }

  async isApproachingLimit(): Promise<boolean> {
    const count = await this.getDocumentCount();
    return count >= WARNING_THRESHOLD && count < FREE_DOC_LIMIT;
  }

  async getRemainingSlots(): Promise<number> {
    const count = await this.getDocumentCount();
    return Math.max(0, FREE_DOC_LIMIT - count);
  }

  async triggerUpgradePrompt(options: UpgradePromptOptions): Promise<'upgrade' | 'later' | null> {
    if (this.upgradePromptCallback) {
      return this.upgradePromptCallback(options);
    }
    return null;
  }
}

export class FeatureGateImpl implements FeatureGate {
  private subscriptionChecker: () => { isPro: boolean; accountId: string };

  constructor(subscriptionChecker: () => { isPro: boolean; accountId: string }) {
    this.subscriptionChecker = subscriptionChecker;
  }

  isProFeature(feature: string): boolean {
    return PRO_FEATURES.includes(feature as ProFeature);
  }

  async canUseFeature(feature: string): Promise<boolean> {
    if (!this.isProFeature(feature)) {
      return true;
    }
    const subscription = this.subscriptionChecker();
    return subscription.isPro;
  }

  getProFeatures(): string[] {
    return [...PRO_FEATURES];
  }

  getFreeFeatures(): string[] {
    return [...FREE_FEATURES];
  }
}

let globalVersionControlService: VersionControlService | null = null;
let globalFeatureGate: FeatureGate | null = null;

export function createVersionControlService(graphStorage: GraphStorageService): VersionControlService {
  const service = new VersionControlServiceImpl(graphStorage);
  globalVersionControlService = service;
  return service;
}

export function getVersionControlService(): VersionControlService | null {
  return globalVersionControlService;
}

export function createFeatureGate(subscriptionChecker: () => { isPro: boolean; accountId: string }): FeatureGate {
  const gate = new FeatureGateImpl(subscriptionChecker);
  globalFeatureGate = gate;
  return gate;
}

export function getFeatureGate(): FeatureGate | null {
  return globalFeatureGate;
}

export function createUpgradePromptOptions(featureName: string): UpgradePromptOptions {
  return {
    title: 'Upgrade to Pro',
    message: `"${featureName}" is a Pro feature. Your current free version does not support this feature. Upgrade to Pro to unlock all features with unlimited documents!`,
    featureName,
  };
}

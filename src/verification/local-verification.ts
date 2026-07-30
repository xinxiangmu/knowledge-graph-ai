import { getPlatform, getUserAgent } from '../utils/platform.js';

export interface VerificationResult {
  isValid: boolean;
  error?: string;
  accountId?: string;
  expiresAt?: number;
  deviceCount?: number;
  plan?: 'free' | 'pro';
}

interface AccountData {
  accountId: string;
  timestamp: number;
  deviceCount: number;
  plan: 'free' | 'pro';
}

interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  registeredAt: number;
}

export class LocalVerificationModule {
  private publicKey: CryptoKey | null = null;
  private publicKeyString: string = '';
  private accounts: Map<string, AccountData> = new Map();
  private devices: Map<string, DeviceInfo[]> = new Map();
  private currentDeviceId: string = '';
  private maxDevices: number = 3;

  constructor() {
    this.currentDeviceId = this.generateDeviceFingerprint();
  }

  async setPublicKey(key: string): Promise<void> {
    if (!key || key.trim() === '') {
      throw new Error('无效的公钥格式');
    }
    this.publicKeyString = key;
    try {
      const keyData = this.base64ToArrayBuffer(key);
      this.publicKey = await crypto.subtle.importKey(
        'spki',
        keyData,
        {
          name: 'RSA-PKCS1-v1_5',
          hash: 'SHA-256',
        },
        true,
        ['verify']
      );
    } catch {
      throw new Error('无效的公钥格式');
    }
  }

  async verify(encryptedData: string): Promise<VerificationResult> {
    if (!this.publicKey) {
      return {
        isValid: false,
        error: '公钥未设置，请先调用 setPublicKey',
      };
    }

    try {
      const decoded = this.decodeAccountId(encryptedData);
      if (!decoded) {
        return {
          isValid: false,
          error: '无效的账户ID格式',
        };
      }

      const { content, signature } = decoded;
      const dataBuffer = new TextEncoder().encode(content);

      const signatureValid = await crypto.subtle.verify(
        'RSA-PKCS1-v1_5',
        this.publicKey,
        this.base64ToArrayBuffer(signature),
        dataBuffer
      );

      if (!signatureValid) {
        return {
          isValid: false,
          error: '签名验证失败，数据可能被篡改',
        };
      }

      const accountData = JSON.parse(content) as AccountData;

      if (accountData.timestamp + 3 * 24 * 60 * 60 * 1000 < Date.now()) {
        return {
          isValid: false,
          error: '验证数据已过期',
          accountId: accountData.accountId,
        };
      }

      this.accounts.set(accountData.accountId, accountData);

      return {
        isValid: true,
        accountId: accountData.accountId,
        expiresAt: accountData.timestamp + 3 * 24 * 60 * 60 * 1000,
        deviceCount: accountData.deviceCount,
        plan: accountData.plan,
      };
    } catch (error) {
      return {
        isValid: false,
        error: `验证过程出错: ${error instanceof Error ? error.message : '未知错误'}`,
      };
    }
  }

  async registerDevice(): Promise<boolean> {
    const accountId = this.getPrimaryAccountId();
    if (!accountId) {
      return false;
    }

    const devices = this.devices.get(accountId) || [];
    const existingDevice = devices.find(d => d.deviceId === this.currentDeviceId);

    if (existingDevice) {
      return true;
    }

    if (devices.length >= this.maxDevices) {
      return false;
    }

    const deviceInfo: DeviceInfo = {
      deviceId: this.currentDeviceId,
      deviceName: this.getDeviceName(),
      registeredAt: Date.now(),
    };

    devices.push(deviceInfo);
    this.devices.set(accountId, devices);

    const account = this.accounts.get(accountId);
    if (account) {
      account.deviceCount = devices.length;
    }

    return true;
  }

  getDeviceCount(): number {
    const accountId = this.getPrimaryAccountId();
    if (!accountId) {
      return 0;
    }
    const devices = this.devices.get(accountId) || [];
    return devices.length;
  }

  isDeviceLimitReached(): boolean {
    return this.getDeviceCount() >= this.maxDevices;
  }

  generateVerificationData(
    accountId: string,
    plan: 'free' | 'pro' = 'free',
    deviceCount: number = 1
  ): string {
    const timestamp = Date.now();
    const accountData: AccountData = {
      accountId,
      timestamp,
      deviceCount,
      plan,
    };

    const content = JSON.stringify(accountData);
    const contentBase64 = this.arrayBufferToBase64(new TextEncoder().encode(content));
    return `kg${contentBase64}`;
  }

  setVerificationSignature(encryptedData: string, signature: string): string {
    return `${encryptedData}:${signature}`;
  }

  private decodeAccountId(encoded: string): { content: string; signature: string } | null {
    if (!encoded.startsWith('kg')) {
      return null;
    }

    const parts = encoded.split(':');
    if (parts.length !== 2) {
      const contentBase64 = encoded.slice(2);
      const content = this.base64Decode(contentBase64);
      return { content, signature: '' };
    }

    const contentBase64 = parts[0].slice(2);
    const content = this.base64Decode(contentBase64);
    const signature = parts[1];

    return { content, signature };
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64Decode(base64: string): string {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  }

  private generateDeviceFingerprint(): string {
    const seed = `${getUserAgent()}-${navigator.language}-${screen.width}x${screen.height}-${new Date().getTimezoneOffset()}`;
    return this.hashString(seed);
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(16, '0');
  }

  private getDeviceName(): string {
    const platform = getPlatform();
    const userAgent = getUserAgent();
    const match = userAgent.match(/Chrome\/[\d.]+/);
    const browser = match ? match[0] : 'Unknown Browser';
    return `${platform} - ${browser}`;
  }

  private getPrimaryAccountId(): string | null {
    if (this.accounts.size === 0) {
      return null;
    }
    const firstAccount = this.accounts.values().next().value;
    return firstAccount?.accountId || null;
  }

  setMaxDevices(max: number): void {
    this.maxDevices = max;
  }

  getAccounts(): Map<string, AccountData> {
    return new Map(this.accounts);
  }

  getDevices(): Map<string, DeviceInfo[]> {
    return new Map(this.devices);
  }

  getCurrentDeviceId(): string {
    return this.currentDeviceId;
  }

  clear(): void {
    this.accounts.clear();
    this.devices.clear();
    this.publicKey = null;
    this.publicKeyString = '';
  }

  importKey(key: CryptoKey): void {
    this.publicKey = key;
  }

  exportKey(): string {
    return this.publicKeyString;
  }
}

export function createLocalVerificationModule(): LocalVerificationModule {
  return new LocalVerificationModule();
}

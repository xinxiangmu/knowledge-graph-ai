import { getPlatform, getUserAgent } from './platform.js';

const SIGNATURE_SECRET='knowledge-graph-signature-secret';

// Embedded public key - must match server's public_key.pem
const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAo0/y8ElRXhX5kiptsEzN
7DwwjJiIhTO0stAJUHxhyo7IBraXiQKnA9Pe7rqKEngstEK2uYSGtvINAUGqrOOa
XR5WczHTAkVZALvTHISxD84uufkvFHpBaC6ja1MSP8O39V1vVguaLYfRp8QB691F
bTPQM9pIv/ls3YSmrPbKrpIQGQeuc8Ou/sljHppPNJ+Bw5mNOv/vOv/zHT2xwtLf
u130y761nAhbmCGSqhz+/CyTiGOCq1ABhcFBi9zgCeOAQ9ujEwVpolc4W81L0HMA
Uqsl+rkmRMES6lzm+uuX8Hox/TdMvaQ0WFIeMVOywEfTwgPAAkoGt/WavXNGvNyv
3QIDAQAB
-----END PUBLIC KEY-----`;

export interface SignedPayload {
  code: string;
  email: string;
  plan_type: string;
  expires_at: string;
  max_devices: number;
  issued_at: string;
}

async function importPublicKey(pem: string): Promise<CryptoKey> {
  const cleaned = pem.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\n/g, '');
  const binary = Uint8Array.from(atob(cleaned), c => c.charCodeAt(0));
  return window.crypto.subtle.importKey(
    'spki',
    binary,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256'
    },
    true,
    ['verify']
  );
}

/**
 * 验证服务端返回的签名令牌（私钥签名，公钥验证）
 * @param signedToken base64 编码的签名令牌
 * @returns 验证成功返回 payload 对象，失败返回 null
 */
export async function verifySignedToken(signedToken: string): Promise<SignedPayload | null> {
  try {
    const decoded = atob(signedToken);
    const data = JSON.parse(decoded);
    const payloadJson: string = data.payload;
    const signature: string = data.signature;

    // base64 -> ArrayBuffer
    const sigBinary = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
    const publicKey = await importPublicKey(PUBLIC_KEY_PEM);
    const dataBuffer = new TextEncoder().encode(payloadJson);

    const valid = await window.crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      publicKey,
      sigBinary.buffer,
      dataBuffer.buffer
    );

    if (!valid) return null;

    return JSON.parse(payloadJson) as SignedPayload;
  } catch (e) {
    console.error('[Crypto] verifySignedToken error:', e);
    return null;
  }
}

export async function generateSignature(data: string): Promise<string> {
  const combined = data + SIGNATURE_SECRET;
  const bytes = new TextEncoder().encode(combined);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function generateDeviceId(): string {
  let fingerprint = '';
  
  fingerprint += getUserAgent();
  if (screen) {
    fingerprint += `${screen.width}x${screen.height}x${screen.colorDepth}`;
  }
  if (navigator.language) {
    fingerprint += navigator.language;
  }
  fingerprint += getPlatform();
  if (navigator.hardwareConcurrency) {
    fingerprint += navigator.hardwareConcurrency;
  }
  if (window.screen.orientation) {
    fingerprint += window.screen.orientation.type;
  }
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, 0, 1, 1);
    fingerprint += canvas.toDataURL();
  }
  
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  
  return `dev_${Math.abs(hash).toString(36).padStart(12, '0')}_${timestamp}_${random}`;
}

export function generateDeviceFingerprint(): string {
  return `${getUserAgent()}-${navigator.language}-${screen.width}x${screen.height}-${new Date().getTimezoneOffset()}`;
}

export function generateUniqueId(): string {
  const fingerprint = generateDeviceFingerprint();
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    hash = ((hash << 5) - hash) + fingerprint.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).padStart(20, '0');
}

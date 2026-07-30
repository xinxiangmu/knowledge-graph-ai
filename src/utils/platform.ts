let platformInfo: {
  isMac: boolean;
  isWin: boolean;
  isLinux: boolean;
  isMobile: boolean;
  platform: string;
  userAgent: string;
} = {
  isMac: false,
  isWin: false,
  isLinux: false,
  isMobile: false,
  platform: 'Unknown',
  userAgent: 'Unknown'
};

export function setPlatformInfo(info: typeof platformInfo): void {
  platformInfo = info;
}

export function getPlatform(): string {
  if (platformInfo.isMac) return 'MacIntel';
  if (platformInfo.isWin) return 'Win32';
  if (platformInfo.isLinux) return 'Linux';
  if (platformInfo.isMobile) return 'Mobile';
  return platformInfo.platform;
}

export function getUserAgent(): string {
  return platformInfo.userAgent;
}

export function getPlatformInfo(): typeof platformInfo {
  return platformInfo;
}
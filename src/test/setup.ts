import 'fake-indexeddb/auto';

const mockContext = {
  scale: () => {},
  clearRect: () => {},
  beginPath: () => {},
  arc: () => {},
  fill: () => {},
  stroke: () => {},
  closePath: () => {},
  moveTo: () => {},
  lineTo: () => {},
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 0,
  font: '',
  textAlign: '',
  textBaseline: '',
  measureText: () => ({ width: 100 }),
  save: () => {},
  restore: () => {},
  translate: () => {},
  rotate: () => {},
  globalAlpha: 1,
  shadowColor: '',
  shadowBlur: 0,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  fillRect: () => {},
  strokeRect: () => {},
  fillText: () => {},
  getExtension: () => null,
};

HTMLCanvasElement.prototype.getContext = function() {
  return mockContext;
};

if (!(globalThis as any).crypto?.randomUUID) {
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      randomUUID: () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
    },
    writable: true,
    configurable: true,
  });
}

if (!globalThis.requestAnimationFrame) {
  globalThis.requestAnimationFrame = (callback: (timestamp: number) => void) => {
    return globalThis.setTimeout(() => callback(Date.now()), 0) as unknown as number;
  };
}

if (!globalThis.cancelAnimationFrame) {
  globalThis.cancelAnimationFrame = (id: number) => {
    globalThis.clearTimeout(id);
  };
}
import { DocumentModel } from '../models/document.js';

export type FileEventType = 'create' | 'delete' | 'rename' | 'modify';

export interface FileEvent {
  type: FileEventType;
  filePath: string;
  oldFilePath?: string;
  timestamp: number;
}

export interface FileWatcherService {
  start(): void;
  stop(): void;
  onFileChange(callback: (event: FileEvent) => void): void;
  setMonitoringScope(scope: 'plugin-only' | 'all'): void;
  isPluginGenerated(filePath: string): boolean;
}

export interface PluginMetadata {
  isPro: boolean;
  pluginId: string;
}

export class FileWatcherServiceImpl implements FileWatcherService {
  private vault: any;
  private pluginMetadata: PluginMetadata;
  private documentModel: DocumentModel;
  private callbacks: Set<(event: FileEvent) => void> = new Set();
  private scope: 'plugin-only' | 'all' = 'plugin-only';
  private isRunning: boolean = false;
  private debounceTimer: Map<string, number> = new Map();
  private debounceDelay: number = 500;
  private pendingEvents: Map<string, FileEvent> = new Map();
  private lastProcessed: Map<string, number> = new Map();

  constructor(vault: any, pluginMetadata: PluginMetadata, documentModel: DocumentModel) {
    this.vault = vault;
    this.pluginMetadata = pluginMetadata;
    this.documentModel = documentModel;
  }

  start(): void {
    if (this.isRunning) {
      return;
    }
    this.isRunning = true;

    this.vault.on('create', this.handleCreate.bind(this));
    this.vault.on('modify', this.handleModify.bind(this));
    this.vault.on('delete', this.handleDelete.bind(this));
    this.vault.on('rename', this.handleRename.bind(this));
  }

  stop(): void {
    if (!this.isRunning) {
      return;
    }
    this.isRunning = false;

    this.vault.off('create', this.handleCreate.bind(this));
    this.vault.off('modify', this.handleModify.bind(this));
    this.vault.off('delete', this.handleDelete.bind(this));
    this.vault.off('rename', this.handleRename.bind(this));

    this.debounceTimer.forEach((timer) => window.clearTimeout(timer));
    this.debounceTimer.clear();
    this.pendingEvents.clear();
  }

  onFileChange(callback: (event: FileEvent) => void): void {
    this.callbacks.add(callback);
  }

  setMonitoringScope(scope: 'plugin-only' | 'all'): void {
    this.scope = scope;
  }

  isPluginGenerated(filePath: string): boolean {
    const document = this.documentModel.getByFilePath(filePath);
    return document !== null;
  }

  private shouldProcess(filePath: string): boolean {
    if (!filePath.endsWith('.md')) {
      return false;
    }

    if (this.scope === 'all') {
      return true;
    }

    return this.isPluginGenerated(filePath);
  }

  private handleCreate(file: any): void {
    const filePath = file.path;
    if (!this.shouldProcess(filePath)) {
      return;
    }

    this.scheduleDebouncedEvent({
      type: 'create',
      filePath,
      timestamp: Date.now(),
    });
  }

  private handleModify(file: any): void {
    const filePath = file.path;
    if (!this.shouldProcess(filePath)) {
      return;
    }

    this.scheduleDebouncedEvent({
      type: 'modify',
      filePath,
      timestamp: Date.now(),
    });
  }

  private handleDelete(file: any): void {
    const filePath = file.path;
    if (!filePath.endsWith('.md')) {
      return;
    }

    if (this.scope === 'plugin-only' && !this.isPluginGenerated(filePath)) {
      return;
    }

    const existingDoc = this.documentModel.getByFilePath(filePath);
    if (!existingDoc) {
      return;
    }

    this.emitEvent({
      type: 'delete',
      filePath,
      timestamp: Date.now(),
    });
  }

  private handleRename(file: any, oldFilePath: string): void {
    const newFilePath = file.path;
    if (!newFilePath.endsWith('.md')) {
      return;
    }

    if (this.scope === 'plugin-only' && !this.isPluginGenerated(oldFilePath)) {
      return;
    }

    const existingDoc = this.documentModel.getByFilePath(oldFilePath);
    if (!existingDoc) {
      if (this.scope === 'all') {
        this.emitEvent({
          type: 'rename',
          filePath: newFilePath,
          oldFilePath,
          timestamp: Date.now(),
        });
      }
      return;
    }

    this.documentModel.update(existingDoc.id, { filePath: newFilePath });

    this.emitEvent({
      type: 'rename',
      filePath: newFilePath,
      oldFilePath,
      timestamp: Date.now(),
    });
  }

  private scheduleDebouncedEvent(event: FileEvent): void {
    const key = event.filePath;

    this.pendingEvents.set(key, event);

    const existingTimer = this.debounceTimer.get(key);
    if (existingTimer) {
      window.clearTimeout(existingTimer);
    }

    const timer = window.setTimeout(() => {
      this.debounceTimer.delete(key);
      const pendingEvent = this.pendingEvents.get(key);
      this.pendingEvents.delete(key);

      if (pendingEvent) {
        const lastTime = this.lastProcessed.get(key) || 0;
        if (pendingEvent.timestamp - lastTime >= this.debounceDelay) {
          this.emitEvent(pendingEvent);
          this.lastProcessed.set(key, pendingEvent.timestamp);
        }
      }
    }, this.debounceDelay);

    this.debounceTimer.set(key, timer);
  }

  private emitEvent(event: FileEvent): void {
    this.callbacks.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in file change callback:', error);
      }
    });
  }
}

export function createFileWatcherService(
  vault: any,
  pluginMetadata: PluginMetadata,
  documentModel: DocumentModel
): FileWatcherService {
  return new FileWatcherServiceImpl(vault, pluginMetadata, documentModel);
}

export interface GraphNode {
  id: string;
  name: string;
  filePath?: string;
  docId: string;
}

export interface NavigationService {
  jumpToFile(filePath: string): Promise<void>;
  openDocument(docId: string): Promise<void>;
  revealInExplorer(filePath: string): Promise<void>;
}

export class NavigationServiceImpl implements NavigationService {
  private app: any;
  private documentResolver?: (docId: string) => Promise<string | null>;

  constructor(app: any, documentResolver?: (docId: string) => Promise<string | null>) {
    this.app = app;
    this.documentResolver = documentResolver;
  }

  async jumpToFile(filePath: string): Promise<void> {
    if (!filePath) {
      throw new NavigationError('INVALID_PATH', '文件路径不能为空');
    }

    try {
      const file = this.app.vault.getFileByPath(filePath);

      if (!file) {
        throw new NavigationError('FILE_NOT_FOUND', `文件不存在或已被移动/删除: ${filePath}`);
      }

      const leaf = this.app.workspace.getLeaf(true);
      await leaf.openFile(file);
    } catch (error) {
      if (error instanceof NavigationError) {
        throw error;
      }

      if ((error as any)?.message?.includes('Permission')) {
        throw new NavigationError('PERMISSION_ERROR', `无法访问文件: ${filePath}`, error);
      }

      throw new NavigationError('UNKNOWN_ERROR', `跳转到文件失败: ${filePath}`, error);
    }
  }

  async openDocument(docId: string): Promise<void> {
    if (!docId) {
      throw new NavigationError('INVALID_DOC_ID', '文档ID不能为空');
    }

    if (!this.documentResolver) {
      throw new NavigationError('NO_RESOLVER', '未配置文档解析器，无法通过docId打开文档');
    }

    const filePath = await this.documentResolver(docId);

    if (!filePath) {
      throw new NavigationError('DOC_NOT_FOUND', `无法找到文档: ${docId}`);
    }

    await this.jumpToFile(filePath);
  }

  async revealInExplorer(filePath: string): Promise<void> {
    if (!filePath) {
      throw new NavigationError('INVALID_PATH', '文件路径不能为空');
    }

    try {
      const file = this.app.vault.getFileByPath(filePath);

      if (!file) {
        throw new NavigationError('FILE_NOT_FOUND', `文件不存在或已被移动/删除: ${filePath}`);
      }

      if (this.app.fileManager) {
        this.app.fileManager.revealInFileExplorer(file);
      } else {
        throw new NavigationError('FEATURE_UNAVAILABLE', '文件管理器不可用');
      }
    } catch (error) {
      if (error instanceof NavigationError) {
        throw error;
      }

      if ((error as any)?.message?.includes('Permission')) {
        throw new NavigationError('PERMISSION_ERROR', `无法访问文件: ${filePath}`, error);
      }

      throw new NavigationError('UNKNOWN_ERROR', `在文件管理器中显示失败: ${filePath}`, error);
    }
  }
}

export class NavigationError extends Error {
  constructor(
    public readonly code: NavigationErrorCode,
    message: string,
    public readonly cause?: any
  ) {
    super(message);
    this.name = 'NavigationError';
  }
}

export type NavigationErrorCode =
  | 'FILE_NOT_FOUND'
  | 'DOC_NOT_FOUND'
  | 'INVALID_PATH'
  | 'INVALID_DOC_ID'
  | 'PERMISSION_ERROR'
  | 'NO_RESOLVER'
  | 'FEATURE_UNAVAILABLE'
  | 'UNKNOWN_ERROR';

export function onNodeClick(node: GraphNode, navigationService: NavigationService): void {
  if (node.filePath) {
    navigationService.jumpToFile(node.filePath).catch((error) => {
      console.error(`[NavigationService] 节点点击跳转失败: ${error.message}`);
    });
  } else {
    navigationService.openDocument(node.docId).catch((error) => {
      console.error(`[NavigationService] 节点点击打开文档失败: ${error.message}`);
    });
  }
}

let globalService: NavigationService | null = null;

export function createNavigationService(
  app: any,
  documentResolver?: (docId: string) => Promise<string | null>
): NavigationService {
  const service = new NavigationServiceImpl(app, documentResolver);
  globalService = service;
  return service;
}

export function getNavigationService(): NavigationService | null {
  return globalService;
}
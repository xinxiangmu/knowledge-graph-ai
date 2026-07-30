# Knowledge Graph AI

> 🇨🇳 AI 驱动的 Obsidian 知识图谱插件

![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/xinxiangmu/knowledge-graph-ai)
![Obsidian Downloads](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fobsidianmd%2Fobsidian-releases%2Fmaster%2Fcommunity-plugins.json&query=%24%5B%3F(%40.id%20%3D%3D%20'knowledge-graph-ai')%5D.downloads&label=Downloads)
![License](https://img.shields.io/github/license/xinxiangmu/knowledge-graph-ai)

---

## 主要功能

- **AI 文档解析**: 智能提取实体、关系和标签
- **交互式知识图谱**: 可视化展示知识连接，支持节点拖拽和缩放
- **智能实体管理**: 自动融合重复实体，跨文档关联
- **时间轴视图**: 按时间顺序展示知识节点演变
- **层级视图**: 树状结构展示知识分类
- **智能搜索**: 多维度过滤和搜索实体

---

## 安装方式

### 从 Obsidian 社区插件安装

1. 打开 Obsidian → 设置 → 社区插件
2. 搜索 **Knowledge Graph AI**
3. 点击 **安装** → **启用**
4. 点击侧边栏 🧠 图标打开面板

### 手动安装

1. 下载最新版本: [GitHub Releases](https://github.com/xinxiangmu/knowledge-graph-ai/releases)
2. 解压到 `.obsidian/plugins/knowledge-graph-ai/` 目录
3. 在 Obsidian 设置中启用插件

---

## 配置说明

### 本地模型 (Ollama)

1. 安装 [Ollama](https://ollama.ai/)
2. 拉取模型: `ollama pull llama2`
3. 插件配置:
   - API 地址: `http://localhost`
   - 端口: `11434`
   - 模型: `llama2`

### 外部 AI 服务

支持多种 AI 提供商：
- **OpenAI 兼容**: API Key + 模型名
- **Anthropic**: API Key + 模型名
- **Ollama 本地**: 无需 API Key

---

## 隐私保护

- 所有知识图谱数据存储在你的 Obsidian 库中
- 不收集任何笔记内容
- 订阅信息本地存储
- 使用本地模型时完全离线可用

---

## 系统要求

- **Obsidian**: v1.5.0 或更高版本
- **平台**: 桌面版 (Windows, macOS, Linux)
- **本地模型**: 需要 Ollama 或兼容的本地模型服务

---

## 联系方式

- 📧 邮箱: `myzerool@outlook.com`
- 🐛 Bug 报告: [GitHub Issues](https://github.com/xinxiangmu/knowledge-graph-ai/issues)

---

## 许可证

MIT License

---

如果你觉得这个插件对你有帮助，请给它一个 Star！⭐

> *连接知识，增长智慧* 🌱
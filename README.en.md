# Knowledge Graph AI

> AI-Powered Knowledge Graph Plugin for Obsidian

![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/xinxiangmu/knowledge-graph-ai)
![Obsidian Downloads](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fobsidianmd%2Fobsidian-releases%2Fmaster%2Fcommunity-plugins.json&query=%24%5B%3F(%40.id%20%3D%3D%20'knowledge-graph-ai')%5D.downloads&label=Downloads)
![License](https://img.shields.io/github/license/xinxiangmu/knowledge-graph-ai)

---

## Key Features

- **AI Document Parsing**: Automatically extract entities, relationships and tags from your notes
- **Interactive Knowledge Graph**: Visualize knowledge connections with drag & zoom support
- **Smart Entity Management**: Auto-merge duplicate entities and cross-document linking
- **Timeline View**: Display knowledge evolution in chronological order
- **Hierarchy View**: Tree-structured knowledge categories
- **Smart Search**: Multi-dimensional entity filtering and search
- **Import & Export**: Backup and migrate knowledge graph data

---

## Installation

### From Obsidian Community Plugins

1. Open Obsidian → Settings → Community Plugins
2. Search for **Knowledge Graph AI**
3. Click **Install** → **Enable**
4. Click the brain icon 🧠 in the sidebar to open the panel

### Manual Installation

1. Download the latest release from [GitHub Releases](https://github.com/xinxiangmu/knowledge-graph-ai/releases)
2. Extract files to `.obsidian/plugins/knowledge-graph-ai/`
3. Enable the plugin in Obsidian settings

---

## Configuration

### Local Model (Ollama)

1. Install [Ollama](https://ollama.ai/)
2. Pull a model: `ollama pull llama2`
3. Plugin configuration:
   - API Address: `http://localhost`
   - Port: `11434`
   - Model: `llama2`

### External AI Services

Supported providers:
- **OpenAI Compatible**: API Key + Model name
- **Anthropic**: API Key + Model name
- **Ollama Local**: No API Key required

---

## Privacy

- All knowledge graph data is stored in your Obsidian vault
- No note content is collected
- Subscription info is stored locally
- Fully offline when using local models

---

## System Requirements

- **Obsidian**: v1.5.0 or higher
- **Platform**: Desktop only (Windows, macOS, Linux)
- **Local Models**: Requires Ollama or compatible local model service

---

## Contact

- Email: `myzerool@outlook.com`
- Bug Reports: [GitHub Issues](https://github.com/xinxiangmu/knowledge-graph-ai/issues)

---

## License

MIT License

---

If you find this plugin helpful, please give it a Star! ⭐

> *Connect knowledge, grow wisdom* 🌱
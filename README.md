# SiYuan Knowledge Engine<br><sub><sup>A RAG-powered knowledge base plugin for SiYuan Note</sup></sub>

[![SiYuan](https://img.shields.io/badge/SiYuan-%E2%89%A53.0.0-green)](https://github.com/siyuan-note/siyuan)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A SiYuan Note plugin that turns your notes into a searchable knowledge base using Retrieval-Augmented Generation (RAG). Chat with your notes using local or cloud LLMs.

## Features

- **RAG Chat** — Ask questions and get answers grounded in your notes with source references
- **Multi-Provider LLM** — Ollama (local) or OpenAI-compatible APIs (DeepSeek, Qwen, etc.)
- **Flexible Embedding** — Remote API or local Transformers.js (ONNX runtime, fully offline)
- **Multi-Backend Vector Store** — ChromaDB or Milvus, config-switchable via factory pattern
- **Automatic Indexing** — Scheduled incremental sync detects changed blocks and updates embeddings
- **Index Recovery** — Hash-based state persistence, resume interrupted indexing on restart
- **Thinking Process** — Collapsible `\(think\)`  block display for reasoning models (DeepSeek-R1, QwQ)
- **Source Navigation** — Click reference sources to jump directly to the source block in SiYuan
- **Index Status Bar** — Real-time display of indexed block count and last sync time

## Prerequisites

| Component | How |
|-----------|-----|
| **SiYuan Note** | ≥ 3.0.0 |
| **Vector Database** | [ChromaDB](https://www.trychroma.com/) or [Milvus](https://milvus.io/) (Docker) |
| **LLM** | [Ollama](https://ollama.com/) (local) or any OpenAI-compatible API |
| **Node.js** | ≥ 18 (for local Transformers.js embedding) |

## Quick Start

### 1. Start Vector Database

**ChromaDB (recommended for quick setup):**
```bash
docker run -d --name chromadb -p 8000:8000 chromadb/chroma
```

**Milvus Standalone:**
```bash
docker run -d --name milvus -p 19530:19530 -p 9091:9091 milvusdb/milvus
```

### 2. Start LLM (Ollama example)
```bash
ollama serve
ollama pull qwen2.5:7b          # Chat model
ollama pull nomic-embed-text    # Embedding model
```

### 3. Install the Plugin

Clone or copy this repo into your SiYuan workspace:

```
{workspace}/data/plugins/siyuan-plugin-knowledge-base/
```

### 4. Configure

Open SiYuan → Settings → Knowledge Base tab:

| Setting | Default | Description |
|---------|---------|-------------|
| LLM Provider | Ollama | Ollama or OpenAI-compatible |
| LLM Base URL | `http://localhost:11434` | API endpoint |
| LLM Model | `qwen2.5:7b` | Model name |
| Embedding Mode | Remote | Remote API or local Transformers.js |
| Embedding Model | `nomic-embed-text` | Embedding model name |
| Vector DB Type | Chroma | ChromaDB or Milvus |
| Vector DB URL | `http://localhost:8000` | Vector database endpoint |

## Architecture

```
                    SiYuan Plugin
                         │
           ┌─────────────┴─────────────┐
           │                           │
        Chat UI                  Settings UI
           │                           │
           └─────────────┬─────────────┘
                         │
                 KnowledgeEngine
                         │
       ┌─────────────────┼──────────────────┐
       │                 │                  │
   Providers         Scheduler          Storage
       │                 │                  │
  LLM │ Embedding    Incremental        ChromaDB
       │             Hash Sync           Milvus
       │                 │                  │
       └────────Embedding──────────────────┘
```

```
src/
├── index.ts                 # Plugin entry point
├── core/
│   └── KnowledgeEngine.ts   # Core engine
├── providers/
│   ├── llm/                 # Ollama, OpenAI
│   └── embedding/           # Ollama, OpenAI, Local
├── storage/
│   ├── base.ts              # VectorStore interface
│   ├── factory.ts           # VectorStoreFactory
│   ├── chroma.ts            # ChromaDB client
│   └── milvus.ts            # Milvus client
├── scheduler/
│   └── IndexScheduler.ts    # Index scheduler
├── ui/                      # Chat UI components (Vue 3)
├── utils/                   # Hash, chunk, SiYuan API
└── types/                   # TypeScript types
```

## Supported Providers

### LLM
| Provider | Streaming | Notes |
|----------|-----------|-------|
| Ollama | Yes | Local, any GGUF model |
| OpenAI-compatible | Yes | Works with DeepSeek, Qwen, GLM, etc. |

### Embedding
| Provider | Dimensions | Notes |
|----------|------------|-------|
| Ollama | 768 | `nomic-embed-text` |
| OpenAI-compatible | 1536 | `text-embedding-3-small` |
| Local (Transformers.js) | 512 | `bge-small-zh-v1.5`, offline |

### Vector Store
| Backend | Connection |
|---------|------------|
| ChromaDB | HTTP API (`localhost:8000`) |
| Milvus | HTTP API (`localhost:19530`) |

## Development

```bash
# Install dependencies
pnpm install

# Development mode (watch)
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test

# Type check only
pnpm typecheck
```

### Testing

Vitest-powered unit tests covering:

| Module | Test File | Tests |
|--------|-----------|-------|
| Hash & Cache | `src/utils/hash.test.ts` | 9 |
| Text Chunking | `src/utils/chunk.test.ts` | 8 |
| Markdown Cleaning | `src/utils/siyuan.test.ts` | 9 |
| Storage Factory | `src/storage/factory.test.ts` | 4 |

### Build Output

```
dist/
├── index.js              # Plugin bundle (~21 KB)
├── style.css             # Chat UI styles (~3.5 KB)
└── transformers-*.js     # ONNX bundle (~839 KB)
```

## License

MIT

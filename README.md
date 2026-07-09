# 思源知识引擎<br><sub><sup>基于 RAG 的思源笔记知识库插件</sup></sub>

[![SiYuan](https://img.shields.io/badge/SiYuan-%E2%89%A53.0.0-green)](https://github.com/siyuan-note/siyuan)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

将思源笔记转化为可检索的知识库，支持 RAG（检索增强生成）。使用本地或云端大模型与你的笔记对话。

## 功能特性

- **RAG 对话** — 基于笔记内容回答问题，附带参考来源
- **多 Provider LLM** — 支持 Ollama（本地）或 OpenAI 兼容 API（DeepSeek、通义等）
- **灵活 Embedding** — 远程 API 或本地 Transformers.js（ONNX 运行时，完全离线）
- **多后端向量存储** — ChromaDB 或 Milvus，工厂模式可配置切换
- **自动索引** — 定时增量同步，检测变更块并更新向量
- **索引恢复** — 基于 Hash 的状态持久化，插件重启后从中断处恢复
- **思考过程** — 可折叠的 `\(think\)`  块展示（DeepSeek-R1、QwQ 等推理模型）
- **来源跳转** — 点击参考来源直接跳转到思源中的对应块
- **索引状态栏** — 实时显示已索引块数和最近同步时间

## 前置依赖

| 组件 | 方式 |
|------|------|
| **思源笔记** | ≥ 3.0.0 |
| **向量数据库** | [ChromaDB](https://www.trychroma.com/) 或 [Milvus](https://milvus.io/)（Docker） |
| **大模型** | [Ollama](https://ollama.com/)（本地）或任意 OpenAI 兼容 API |
| **Node.js** | ≥ 18（本地 Transformers.js Embedding 时需要） |

## 快速开始

### 1. 启动向量数据库

**ChromaDB（推荐，快速上手）：**
```bash
docker run -d --name chromadb -p 8000:8000 chromadb/chroma
```

**Milvus 单机版：**
```bash
docker run -d --name milvus -p 19530:19530 -p 9091:9091 milvusdb/milvus
```

### 2. 启动 LLM（以 Ollama 为例）
```bash
ollama serve
ollama pull qwen2.5:7b          # 对话模型
ollama pull nomic-embed-text    # Embedding 模型
```

### 3. 安装插件

将本仓库克隆或复制到思源工作区的插件目录：

```
{workspace}/data/plugins/siyuan-plugin-knowledge-base/
```

### 4. 配置插件

打开思源 → 设置 → 知识库标签页：

| 设置项 | 默认值 | 说明 |
|--------|--------|------|
| LLM 提供商 | Ollama | Ollama 或 OpenAI 兼容 |
| LLM Base URL | `http://localhost:11434` | API 地址 |
| LLM 模型 | `qwen2.5:7b` | 模型名称 |
| Embedding 模式 | 远程 | 远程 API 或本地 Transformers.js |
| Embedding 模型 | `nomic-embed-text` | Embedding 模型名称 |
| 向量数据库类型 | Chroma | ChromaDB 或 Milvus |
| 向量数据库 URL | `http://localhost:8000` | 向量数据库地址 |

## 架构

```
                    思源插件
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
 LLM │ Embedding    增量 Hash 同步     ChromaDB
     │                                    Milvus
     │                 │                  │
     └────────Embedding──────────────────┘
```

```
src/
├── index.ts                 # 插件入口
├── core/
│   └── KnowledgeEngine.ts   # 核心引擎
├── providers/
│   ├── llm/                 # Ollama、OpenAI 兼容
│   └── embedding/           # Ollama、OpenAI、本地
├── storage/
│   ├── base.ts              # VectorStore 接口
│   ├── factory.ts           # VectorStoreFactory
│   ├── chroma.ts            # ChromaDB 客户端
│   └── milvus.ts            # Milvus 客户端
├── scheduler/
│   └── IndexScheduler.ts    # 索引调度器
├── ui/                      # 聊天 UI 组件
├── utils/                   # Hash、分块、思源 API
└── types/                   # TypeScript 类型定义
```

## 支持的 Provider

### LLM
| 提供商 | 流式输出 | 说明 |
|--------|----------|------|
| Ollama | 支持 | 本地，任意 GGUF 模型 |
| OpenAI 兼容 | 支持 | 兼容 DeepSeek、通义千问、智谱 GLM 等 |

### Embedding
| 提供商 | 维度 | 说明 |
|--------|------|------|
| Ollama | 768 | `nomic-embed-text` |
| OpenAI 兼容 | 1536 | `text-embedding-3-small` |
| 本地（Transformers.js） | 512 | `bge-small-zh-v1.5`，离线可用 |

### 向量存储
| 后端 | 连接方式 |
|------|----------|
| ChromaDB | HTTP API（`localhost:8000`） |
| Milvus | HTTP API（`localhost:19530`） |

## 开发

```bash
# 安装依赖
pnpm install

# 开发模式（监听文件变化）
pnpm dev

# 生产构建
pnpm build

# 运行测试
pnpm test

# 仅类型检查
pnpm typecheck
```

### 测试覆盖

基于 Vitest 的单元测试：

| 模块 | 测试文件 | 用例数 |
|------|----------|--------|
| Hash 与缓存 | `src/utils/hash.test.ts` | 9 |
| 文本分块 | `src/utils/chunk.test.ts` | 8 |
| Markdown 清洗 | `src/utils/siyuan.test.ts` | 9 |
| 存储工厂 | `src/storage/factory.test.ts` | 4 |

### 构建产物

```
dist/
├── index.js              # 插件核心（~21 KB）
├── style.css             # 聊天 UI 样式（~3.5 KB）
└── transformers-*.js     # ONNX 运行时（~839 KB）
```

## 许可证

MIT

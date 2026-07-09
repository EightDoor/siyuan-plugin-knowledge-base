import { Plugin, Setting } from 'siyuan'
import type { PluginConfig } from './types'

const CONFIG_FILE = 'config.json'

const DEFAULT_CONFIG: PluginConfig = {
  llm: {
    provider: 'ollama',
    baseUrl: 'http://localhost:11434',
    model: 'qwen2.5:7b',
  },
  embedding: {
    mode: 'remote',
    provider: 'ollama',
    baseUrl: 'http://localhost:11434',
    model: 'nomic-embed-text',
  },
  vectorStore: {
    type: 'chroma',
    baseUrl: 'http://localhost:8000',
    collection: 'siyuan-knowledge',
  },
  chat: {
    topK: 5,
    temperature: 0.7,
  },
  index: {
    interval: 5,
    chunkSize: 500,
  },
}

export default class KnowledgeBasePlugin extends Plugin {
  private config: PluginConfig = DEFAULT_CONFIG

  async onload(): Promise<void> {
    const savedConfig = await this.loadData(CONFIG_FILE)
    if (savedConfig) {
      this.config = { ...DEFAULT_CONFIG, ...savedConfig }
    }
  }

  onLayoutReady(): void {
    /* engine start after layout ready */
  }

  onunload(): void {
    /* cleanup on disable */
  }

  uninstall(): void {
    this.removeData(CONFIG_FILE).catch((e: unknown) => {
      console.error(`[KnowledgeBase] remove config failed: ${e}`)
    })
  }
}

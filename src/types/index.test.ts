import { describe, it, expect } from 'vitest'
import type { EmbeddingConfig, PluginConfig } from './index'

describe('EmbeddingConfig', () => {
  it('should support provider, baseUrl, apiKey for remote mode', () => {
    const config: EmbeddingConfig = {
      mode: 'remote',
      provider: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      model: 'text-embedding-3-small',
      apiKey: 'sk-test-key',
    }
    expect(config.provider).toBe('openai')
    expect(config.baseUrl).toBe('https://api.openai.com/v1')
    expect(config.apiKey).toBe('sk-test-key')
    expect(config.mode).toBe('remote')
  })

  it('should support dimensions for custom embedding models', () => {
    const config: EmbeddingConfig = {
      mode: 'remote',
      provider: 'openai',
      baseUrl: 'http://localhost:11434/v1',
      model: 'bge-m3',
      dimensions: 1024,
    }
    expect(config.dimensions).toBe(1024)
  })

  it('should support localModel for local mode', () => {
    const config: EmbeddingConfig = {
      mode: 'local',
      localModel: 'Xenova/bge-small-zh-v1.5',
    }
    expect(config.mode).toBe('local')
    expect(config.localModel).toBe('Xenova/bge-small-zh-v1.5')
  })

  it('should allow all optional fields to be omitted', () => {
    const minimal: EmbeddingConfig = { mode: 'remote' }
    expect(minimal.mode).toBe('remote')
  })
})

describe('DEFAULT_CONFIG embedding (integration via PluginConfig)', () => {
  it('should accept a full embedding config in PluginConfig', () => {
    const fullConfig: PluginConfig = {
      llm: {
        provider: 'ollama',
        baseUrl: 'http://localhost:11434',
        model: 'qwen2.5:7b',
      },
      embedding: {
        mode: 'remote',
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        model: 'text-embedding-3-small',
        apiKey: 'sk-test',
      },
      vectorStore: {
        type: 'chroma',
        baseUrl: 'http://localhost:8000',
        collection: 'test',
      },
      chat: { topK: 5, temperature: 0.7 },
      index: { interval: 5, chunkSize: 500 },
    }
    expect(fullConfig.embedding.provider).toBe('openai')
    expect(fullConfig.embedding.apiKey).toBe('sk-test')
    expect(fullConfig.embedding.baseUrl).toBe('https://api.openai.com/v1')
  })
})
import type { EmbeddingConfig } from '../../types'
import { BaseEmbeddingProvider } from './base'

export class OllamaEmbeddingProvider extends BaseEmbeddingProvider {
  private baseUrl: string
  private model: string
  private dimensions: number

  constructor(config: EmbeddingConfig) {
    super()
    this.baseUrl = (config.baseUrl || 'http://localhost:11434').replace(/\/+$/, '')
    this.model = config.model || 'nomic-embed-text'
    this.dimensions = config.dimensions || 768
    console.log(`[OllamaEmbeddingProvider] initialized with model=${this.model} baseUrl=${this.baseUrl}`)
  }

  async embed(texts: string[]): Promise<number[][]> {
    const resp = await fetch(`${this.baseUrl}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, input: texts }),
    })

    if (!resp.ok) {
      const errText = await resp.text()
      throw new Error(`Ollama embedding failed: ${resp.status} ${errText}`)
    }

    const data = await resp.json()
    return data.embeddings
  }

  getDimensions(): number {
    return this.dimensions
  }
}

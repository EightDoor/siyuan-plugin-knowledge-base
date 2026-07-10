import type { EmbeddingConfig } from '../../types'
import { BaseEmbeddingProvider } from './base'

export class OpenAIEmbeddingProvider extends BaseEmbeddingProvider {
  private baseUrl: string
  private model: string
  private apiKey: string
  private dimensions: number

  constructor(config: EmbeddingConfig) {
    super()
    this.baseUrl = (config.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '')
    this.model = config.model || 'text-embedding-3-small'
    this.apiKey = config.apiKey || ''
    this.dimensions = config.dimensions || 1536
  }

  async embed(texts: string[]): Promise<number[][]> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`
    }
    const resp = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ model: this.model, input: texts }),
    })

    if (!resp.ok) {
      const errText = await resp.text()
      throw new Error(`OpenAI embedding failed: ${resp.status} ${errText}`)
    }

    const data = await resp.json()
    return data.data.map((item: any) => item.embedding)
  }

  getDimensions(): number {
    return this.dimensions
  }
}

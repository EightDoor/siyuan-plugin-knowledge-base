import type { VectorStoreConfig, SearchResult } from '../types'
import { BaseVectorStore } from './base'

export class ChromaStore extends BaseVectorStore {
  private baseUrl: string
  private apiKey: string | undefined
  private connected: boolean = false

  constructor(config: VectorStoreConfig) {
    super(config.collection)
    this.baseUrl = config.baseUrl.replace(/\/+$/, '')
    this.apiKey = config.apiKey
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`
    }
    return headers
  }

  private async ensureCollection(): Promise<void> {
    try {
      const resp = await fetch(`${this.baseUrl}/api/v1/collections/${this.collection}`, {
        headers: this.getHeaders(),
      })

      if (resp.status === 404) {
        await fetch(`${this.baseUrl}/api/v1/collections`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            name: this.collection,
            metadata: { 'hnsw:space': 'cosine' },
          }),
        })
      }

      if (resp.status !== 200 && resp.status !== 201) {
        const errText = await resp.text()
        throw new Error(`ensureCollection failed: ${resp.status} ${errText}`)
      }
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error(`ChromaDB 连接失败: ${this.baseUrl}`)
      }
      throw error
    }
  }

  async add(ids: string[], vectors: number[][], metadatas: Record<string, any>[]): Promise<void> {
    await this.ensureCollection()

    const resp = await fetch(`${this.baseUrl}/api/v1/collections/${this.collection}/add`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ ids, embeddings: vectors, metadatas }),
    })

    if (!resp.ok) {
      throw new Error(`add failed: ${resp.status} ${await resp.text()}`)
    }

    this.connected = true
  }

  async update(ids: string[], vectors: number[][], metadatas: Record<string, any>[]): Promise<void> {
    await this.ensureCollection()

    const resp = await fetch(`${this.baseUrl}/api/v1/collections/${this.collection}/update`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ ids, embeddings: vectors, metadatas }),
    })

    if (!resp.ok) {
      throw new Error(`update failed: ${resp.status} ${await resp.text()}`)
    }
  }

  async delete(ids: string[]): Promise<void> {
    await this.ensureCollection()

    const resp = await fetch(`${this.baseUrl}/api/v1/collections/${this.collection}/delete`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ ids }),
    })

    if (!resp.ok) {
      throw new Error(`delete failed: ${resp.status} ${await resp.text()}`)
    }
  }

  async search(vector: number[], topK: number): Promise<SearchResult[]> {
    await this.ensureCollection()

    const resp = await fetch(`${this.baseUrl}/api/v1/collections/${this.collection}/query`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ query_embeddings: [vector], n_results: topK }),
    })

    if (!resp.ok) {
      throw new Error(`search failed: ${resp.status} ${await resp.text()}`)
    }

    const data = await resp.json()
    const results: SearchResult[] = []

    if (data.ids?.[0]) {
      for (let i = 0; i < data.ids[0].length; i++) {
        results.push({
          id: data.ids[0][i],
          score: data.distances ? 1 - data.distances[0][i] : 0,
          metadata: data.metadatas?.[0]?.[i] ?? {},
        })
      }
    }

    return results
  }

  async clear(): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/api/v1/collections/${this.collection}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      })
    } catch {
      // 集合可能不存在，忽略
    }
    this.connected = false
  }

  async close(): Promise<void> {
    this.connected = false
  }

  isConnected(): boolean {
    return this.connected
  }
}

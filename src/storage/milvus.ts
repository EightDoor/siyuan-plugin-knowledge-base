import type { VectorStoreConfig, SearchResult } from '../types'
import { BaseVectorStore } from './base'

export class MilvusStore extends BaseVectorStore {
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

  async add(ids: string[], vectors: number[][], metadatas: Record<string, any>[]): Promise<void> {
    const entities = ids.map((id, i) => ({
      id,
      vector: vectors[i],
      metadata: JSON.stringify(metadatas[i]),
    }))

    const resp = await fetch(`${this.baseUrl}/v2/vectordb/entities/insert`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ collectionName: this.collection, data: entities }),
    })

    if (!resp.ok) {
      throw new Error(`add failed: ${resp.status} ${await resp.text()}`)
    }

    this.connected = true
  }

  async update(ids: string[], vectors: number[][], metadatas: Record<string, any>[]): Promise<void> {
    await this.add(ids, vectors, metadatas)
  }

  async delete(ids: string[]): Promise<void> {
    const idList = ids.map(id => `"${id}"`).join(',')
    const resp = await fetch(`${this.baseUrl}/v2/vectordb/entities/delete`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        collectionName: this.collection,
        filter: `id in [${idList}]`,
      }),
    })

    if (!resp.ok) {
      throw new Error(`delete failed: ${resp.status} ${await resp.text()}`)
    }
  }

  async search(vector: number[], topK: number): Promise<SearchResult[]> {
    const resp = await fetch(`${this.baseUrl}/v2/vectordb/entities/search`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        collectionName: this.collection,
        vector,
        limit: topK,
        outputFields: ['metadata'],
      }),
    })

    if (!resp.ok) {
      throw new Error(`search failed: ${resp.status} ${await resp.text()}`)
    }

    const data = await resp.json()
    return (data.data || []).map((item: any) => ({
      id: item.id,
      score: item.distance,
      metadata: (() => {
        try {
          return JSON.parse(item.metadata || '{}')
        } catch {
          return {}
        }
      })(),
    }))
  }

  async clear(): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/v2/vectordb/collections/drop`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ collectionName: this.collection }),
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

import type { VectorStore, SearchResult } from '../types'

export abstract class BaseVectorStore implements VectorStore {
  protected collection: string

  constructor(collection: string) {
    this.collection = collection
  }

  abstract add(ids: string[], vectors: number[][], metadatas: Record<string, any>[]): Promise<void>
  abstract update(ids: string[], vectors: number[][], metadatas: Record<string, any>[]): Promise<void>
  abstract delete(ids: string[]): Promise<void>
  abstract search(vector: number[], topK: number): Promise<SearchResult[]>
  abstract clear(): Promise<void>
  abstract close(): Promise<void>
  abstract isConnected(): boolean
}

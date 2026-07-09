import type { VectorStoreConfig, VectorStore } from '../types'
import { ChromaStore } from './chroma'
import { MilvusStore } from './milvus'

export class VectorStoreFactory {
  static create(config: VectorStoreConfig): VectorStore {
    switch (config.type) {
      case 'chroma':
        return new ChromaStore(config)
      case 'milvus':
        return new MilvusStore(config)
      default:
        throw new Error(`Unknown vector store type: ${config.type}`)
    }
  }
}

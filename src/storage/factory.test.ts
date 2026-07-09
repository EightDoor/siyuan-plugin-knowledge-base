import { describe, it, expect } from 'vitest'
import { VectorStoreFactory } from './factory'
import type { VectorStoreConfig } from '../types'

describe('VectorStoreFactory', () => {
  const baseConfig: VectorStoreConfig = {
    type: 'chroma',
    baseUrl: 'http://localhost:8000',
    collection: 'test-collection',
  }

  it('should create ChromaStore', () => {
    const store = VectorStoreFactory.create(baseConfig)
    expect(store).toBeDefined()
    expect(store.constructor.name).toBe('ChromaStore')
  })

  it('should create MilvusStore', () => {
    const store = VectorStoreFactory.create({ ...baseConfig, type: 'milvus' })
    expect(store).toBeDefined()
    expect(store.constructor.name).toBe('MilvusStore')
  })

  it('should throw for unknown type', () => {
    expect(() =>
      VectorStoreFactory.create({ ...baseConfig, type: 'unknown' as any }),
    ).toThrow('Unknown vector store type')
  })

  it('should pass collection name to store', () => {
    const store = VectorStoreFactory.create({ ...baseConfig, collection: 'my-collection' })
    expect((store as any).collection).toBe('my-collection')
  })
})

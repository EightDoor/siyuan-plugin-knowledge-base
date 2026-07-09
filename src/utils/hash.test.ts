import { describe, it, expect } from 'vitest'
import { computeHash, HashCache } from './hash'

describe('computeHash', () => {
  it('should return consistent hash for same content', async () => {
    const a = await computeHash('hello world')
    const b = await computeHash('hello world')
    expect(a).toBe(b)
  })

  it('should return different hashes for different content', async () => {
    const a = await computeHash('hello world')
    const b = await computeHash('hello world!')
    expect(a).not.toBe(b)
  })

  it('should return 64-char hex string', async () => {
    const hash = await computeHash('test')
    expect(hash).toHaveLength(64)
    expect(hash).toMatch(/^[0-9a-f]+$/)
  })

  it('should handle empty string', async () => {
    const hash = await computeHash('')
    expect(hash).toHaveLength(64)
  })
})

describe('HashCache', () => {
  it('should detect unchanged content', async () => {
    const cache = new HashCache()
    const changed1 = await cache.hasChanged('id1', 'content')
    expect(changed1).toBe(true)

    const changed2 = await cache.hasChanged('id1', 'content')
    expect(changed2).toBe(false)
  })

  it('should detect changed content', async () => {
    const cache = new HashCache()
    await cache.hasChanged('id1', 'old content')
    const changed = await cache.hasChanged('id1', 'new content')
    expect(changed).toBe(true)
  })

  it('should track cache size', async () => {
    const cache = new HashCache()
    await cache.hasChanged('a', '1')
    await cache.hasChanged('b', '2')
    expect(cache.size()).toBe(2)
  })

  it('should clear cache', async () => {
    const cache = new HashCache()
    await cache.hasChanged('a', '1')
    cache.clear()
    expect(cache.size()).toBe(0)
  })

  it('should serialize and deserialize', async () => {
    const cache = new HashCache()
    await cache.hasChanged('a', '1')
    await cache.hasChanged('b', '2')

    const json = cache.toJSON()
    const cache2 = new HashCache()
    cache2.fromJSON(json)

    const changed = await cache2.hasChanged('a', '1')
    expect(changed).toBe(false)
    expect(cache2.size()).toBe(2)
  })
})

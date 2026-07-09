import type { PluginConfig, IndexStatus } from '../types'
import type { VectorStore } from '../types'
import type { EmbeddingProvider } from '../types'
import { HashCache } from '../utils/hash'
import { chunkByBlock } from '../utils/chunk'
import { querySQL } from '../utils/siyuan'

export class IndexScheduler {
  private config: PluginConfig
  private vectorStore: VectorStore
  private embeddingProvider: EmbeddingProvider
  private hashCache: HashCache
  private syncTimer: ReturnType<typeof setInterval> | null = null
  private status: IndexStatus = {
    totalBlocks: 0,
    indexedBlocks: 0,
    lastSyncTime: 0,
    isSyncing: false,
  }

  constructor(config: PluginConfig, vectorStore: VectorStore, embeddingProvider: EmbeddingProvider) {
    this.config = config
    this.vectorStore = vectorStore
    this.embeddingProvider = embeddingProvider
    this.hashCache = new HashCache()
  }

  start(): void {
    this.sync()

    this.syncTimer = setInterval(() => {
      this.sync()
    }, this.config.index.interval * 60 * 1000)
  }

  destroy(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer)
      this.syncTimer = null
    }
  }

  getStatus(): IndexStatus {
    return { ...this.status }
  }

  async sync(): Promise<void> {
    if (this.status.isSyncing) {
      return
    }

    this.status.isSyncing = true

    try {
      const blocks = await querySQL(`
        SELECT b.id, b.content, b.updated, d.content as docTitle
        FROM blocks b
        LEFT JOIN blocks d ON b.root_id = d.id
        WHERE b.type NOT IN ('d', 'b', 'l', 'i', 's', 'callout')
        AND b.content IS NOT NULL
        AND b.content != ''
      `)

      this.status.totalBlocks = blocks.length

      const changedBlocks: Array<{ id: string; content: string; docTitle: string; updated: string }> = []

      for (const block of blocks) {
        if (await this.hashCache.hasChanged(block.id, block.content)) {
          changedBlocks.push({
            id: block.id,
            content: block.content,
            docTitle: block.docTitle || '',
            updated: block.updated,
          })
        }
      }

      if (changedBlocks.length === 0) {
        this.status.lastSyncTime = Date.now()
        return
      }

      const chunks = chunkByBlock(changedBlocks)
      const texts = chunks.map(c => c.content)

      if (texts.length === 0) {
        this.status.lastSyncTime = Date.now()
        return
      }

      const vectors = await this.embeddingProvider.embed(texts)

      const ids = changedBlocks.map(b => b.id)
      const metadatas = changedBlocks.map(b => ({
        blockId: b.id,
        docTitle: b.docTitle,
        content: b.content,
        updated: b.updated,
      }))

      await this.vectorStore.update(ids, vectors, metadatas)

      this.status.indexedBlocks += changedBlocks.length
      this.status.lastSyncTime = Date.now()
    } catch (error) {
      console.error('[IndexScheduler] sync failed:', error)
    } finally {
      this.status.isSyncing = false
    }
  }

  async rebuild(): Promise<void> {
    this.hashCache.clear()
    await this.vectorStore.clear()
    this.status.indexedBlocks = 0
    await this.sync()
  }

  async clearIndex(): Promise<void> {
    this.hashCache.clear()
    await this.vectorStore.clear()
    this.status.indexedBlocks = 0
  }
}

import type { PluginConfig, IndexStatus } from '../types'
import type { VectorStore } from '../types'
import type { EmbeddingProvider } from '../types'
import { HashCache } from '../utils/hash'
import { chunkByBlock } from '../utils/chunk'
import { querySQL } from '../utils/siyuan'

export interface SchedulerState {
  hashCache: Record<string, string>
  indexedBlocks: number
  lastSyncTime: number
}

export class IndexScheduler {
  private config: PluginConfig
  private vectorStore: VectorStore
  private embeddingProvider: EmbeddingProvider
  private hashCache: HashCache
  private syncTimer: ReturnType<typeof setInterval> | null = null
  private saveState: (state: SchedulerState) => Promise<void>
  private loadState: () => Promise<SchedulerState | null>
  private saveDebounceTimer: ReturnType<typeof setTimeout> | null = null

  private status: IndexStatus = {
    totalBlocks: 0,
    indexedBlocks: 0,
    lastSyncTime: 0,
    isSyncing: false,
  }

  constructor(
    config: PluginConfig,
    vectorStore: VectorStore,
    embeddingProvider: EmbeddingProvider,
    saveState: (state: SchedulerState) => Promise<void>,
    loadState: () => Promise<SchedulerState | null>,
  ) {
    this.config = config
    this.vectorStore = vectorStore
    this.embeddingProvider = embeddingProvider
    this.hashCache = new HashCache()
    this.saveState = saveState
    this.loadState = loadState
  }

  async restore(): Promise<void> {
    try {
      const saved = await this.loadState()
      if (saved && saved.hashCache && Object.keys(saved.hashCache).length > 0) {
        this.hashCache.fromJSON(saved.hashCache)
        this.status.indexedBlocks = saved.indexedBlocks || 0
        this.status.lastSyncTime = saved.lastSyncTime || 0
        console.info(`[IndexScheduler] restored state: ${this.hashCache.size()} hashed, ${this.status.indexedBlocks} indexed`)
      }
    } catch (error) {
      console.warn('[IndexScheduler] failed to restore state:', error)
    }
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
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer)
      this.saveDebounceTimer = null
    }
    this.flushState()
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
        AND b.updated IS NOT NULL
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

      this.debounceSaveState()
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
    this.flushState()
  }

  async clearIndex(): Promise<void> {
    this.hashCache.clear()
    await this.vectorStore.clear()
    this.status.indexedBlocks = 0
    this.flushState()
  }

  private debounceSaveState(): void {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer)
    }
    this.saveDebounceTimer = setTimeout(() => {
      this.flushState()
    }, 2000)
  }

  private flushState(): void {
    const state: SchedulerState = {
      hashCache: this.hashCache.toJSON(),
      indexedBlocks: this.status.indexedBlocks,
      lastSyncTime: this.status.lastSyncTime,
    }
    this.saveState(state).catch(err => {
      console.warn('[IndexScheduler] failed to save state:', err)
    })
  }
}

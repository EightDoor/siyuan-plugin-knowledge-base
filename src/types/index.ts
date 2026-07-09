export interface PluginConfig {
  llm: LLMConfig
  embedding: EmbeddingConfig
  vectorStore: VectorStoreConfig
  chat: ChatConfig
  index: IndexConfig
}

export interface LLMConfig {
  provider: 'ollama' | 'openai'
  baseUrl: string
  model: string
  apiKey?: string
}

export interface EmbeddingConfig {
  mode: 'remote' | 'local'
  provider?: 'ollama' | 'openai'
  baseUrl?: string
  model?: string
  apiKey?: string
  localModel?: string
}

export interface VectorStoreConfig {
  type: 'chroma' | 'milvus'
  baseUrl: string
  collection: string
  apiKey?: string
}

export interface ChatConfig {
  topK: number
  temperature: number
}

export interface IndexConfig {
  interval: number
  chunkSize: number
}

export interface VectorStore {
  add(ids: string[], vectors: number[][], metadatas: Record<string, any>[]): Promise<void>
  update(ids: string[], vectors: number[][], metadatas: Record<string, any>[]): Promise<void>
  delete(ids: string[]): Promise<void>
  search(vector: number[], topK: number): Promise<SearchResult[]>
  clear(): Promise<void>
  close(): Promise<void>
}

export interface SearchResult {
  id: string
  score: number
  metadata: Record<string, any>
}

export interface EmbeddingProvider {
  embed(texts: string[]): Promise<number[][]>
  getDimensions(): number
}

export interface LLMProvider {
  chat(messages: Message[], options?: ChatOptions): AsyncIterable<string>
}

export interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatOptions {
  temperature?: number
  maxTokens?: number
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  thinking?: string
  sources?: SourceItem[]
  timestamp: number
}

export interface SourceItem {
  blockId: string
  docName: string
  score: number
  content: string
}

export interface IndexStatus {
  totalBlocks: number
  indexedBlocks: number
  lastSyncTime: number
  isSyncing: boolean
}

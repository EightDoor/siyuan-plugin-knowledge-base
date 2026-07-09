import type { App } from 'siyuan'
import type {
  PluginConfig,
  VectorStore,
  EmbeddingProvider,
  LLMProvider,
  ChatMessage,
  SourceItem,
  IndexStatus,
  Message,
} from '../types'
import { VectorStoreFactory } from '../storage/factory'
import { IndexScheduler } from '../scheduler/IndexScheduler'
import { OllamaEmbeddingProvider } from '../providers/embedding/ollama'
import { OpenAIEmbeddingProvider } from '../providers/embedding/openai'
import { LocalEmbeddingProvider } from '../providers/embedding/local'
import { OllamaLLMProvider } from '../providers/llm/ollama'
import { OpenAILLMProvider } from '../providers/llm/openai'

export class KnowledgeEngine {
  private config: PluginConfig
  private app: App
  private vectorStore: VectorStore
  private embeddingProvider: EmbeddingProvider
  private llmProvider: LLMProvider
  private scheduler: IndexScheduler

  constructor(config: PluginConfig, app: App) {
    this.config = config
    this.app = app

    this.vectorStore = VectorStoreFactory.create(config.vectorStore)
    this.embeddingProvider = this.createEmbeddingProvider(config.embedding)
    this.llmProvider = this.createLLMProvider(config.llm)
    this.scheduler = new IndexScheduler(config, this.vectorStore, this.embeddingProvider)
  }

  private createEmbeddingProvider(ec: PluginConfig['embedding']): EmbeddingProvider {
    if (ec.mode === 'local') {
      return new LocalEmbeddingProvider(ec)
    }
    switch (ec.provider) {
      case 'ollama':
        return new OllamaEmbeddingProvider(ec)
      case 'openai':
        return new OpenAIEmbeddingProvider(ec)
      default:
        throw new Error(`Unknown embedding provider: ${ec.provider}`)
    }
  }

  private createLLMProvider(lc: PluginConfig['llm']): LLMProvider {
    switch (lc.provider) {
      case 'ollama':
        return new OllamaLLMProvider(lc)
      case 'openai':
        return new OpenAILLMProvider(lc)
      default:
        throw new Error(`Unknown LLM provider: ${lc.provider}`)
    }
  }

  updateConfig(config: PluginConfig): void {
    this.scheduler.destroy()
    this.vectorStore.close()

    this.config = config
    this.vectorStore = VectorStoreFactory.create(config.vectorStore)
    this.embeddingProvider = this.createEmbeddingProvider(config.embedding)
    this.llmProvider = this.createLLMProvider(config.llm)
    this.scheduler = new IndexScheduler(config, this.vectorStore, this.embeddingProvider)
    this.scheduler.start()
  }

  start(): void {
    this.scheduler.start()
  }

  destroy(): void {
    this.scheduler.destroy()
    this.vectorStore.close()
  }

  getIndexStatus(): IndexStatus {
    return this.scheduler.getStatus()
  }

  async sync(): Promise<void> {
    await this.scheduler.sync()
  }

  async rebuild(): Promise<void> {
    await this.scheduler.rebuild()
  }

  async clearIndex(): Promise<void> {
    await this.scheduler.clearIndex()
  }

  async chat(question: string): Promise<AsyncIterable<ChatMessage>> {
    const queryVector = (await this.embeddingProvider.embed([question]))[0]
    const results = await this.vectorStore.search(queryVector, this.config.chat.topK)

    const sources: SourceItem[] = results.map(r => ({
      blockId: r.metadata.blockId || r.id,
      docName: r.metadata.docTitle || 'unknown',
      score: r.score,
      content: (r.metadata.content || '').slice(0, 200),
    }))

    const context = sources.map((s, i) => `[${i + 1}] ${s.content}`).join('\n\n')

    const systemPrompt = [
      '你是知识库助手。基于参考资料回答。如资料无相关信息，请说明不确定。',
      '',
      `参考资料：\n${context}`,
    ].join('\n')

    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question },
    ]

    const llmStream = this.llmProvider.chat(messages, {
      temperature: this.config.chat.temperature,
    })

    return this.wrapChatResponse(llmStream, sources)
  }

  private async *wrapChatResponse(
    llmStream: AsyncIterable<string>,
    sources: SourceItem[],
  ): AsyncIterable<ChatMessage> {
    let content = ''
    let thinking = ''
    let inThinking = false

    yield {
      role: 'assistant',
      content: '',
      sources,
      timestamp: Date.now(),
    }

    for await (const chunk of llmStream) {
      if (chunk.includes('<think>')) {
        inThinking = true
        const parts = chunk.split('<think>')
        content += parts[0]
        thinking += parts[1] || ''
      } else if (chunk.includes('</think>')) {
        inThinking = false
        const parts = chunk.split('</think>')
        thinking += parts[0]
        content += parts[1] || ''
      } else if (inThinking) {
        thinking += chunk
      } else {
        content += chunk
      }

      yield {
        role: 'assistant',
        content,
        thinking: thinking || undefined,
        sources,
        timestamp: Date.now(),
      }
    }
  }
}

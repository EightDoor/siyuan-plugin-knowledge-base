import type { LLMConfig, Message, ChatOptions } from '../../types'
import { BaseLLMProvider } from './base'

export class OllamaLLMProvider extends BaseLLMProvider {
  private baseUrl: string
  private model: string

  constructor(config: LLMConfig) {
    super()
    this.baseUrl = (config.baseUrl || 'http://localhost:11434').replace(/\/+$/, '')
    this.model = config.model || 'qwen2.5:7b'
  }

  async *chat(messages: Message[], options?: ChatOptions): AsyncIterable<string> {
    const resp = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: true,
        options: { temperature: options?.temperature ?? 0.7 },
      }),
    })

    if (!resp.ok) {
      const errText = await resp.text()
      throw new Error(`Ollama chat failed: ${resp.status} ${errText}`)
    }

    const reader = resp.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue
        try {
          const data = JSON.parse(trimmed)
          if (data.message?.content) {
            yield data.message.content
          }
        } catch {
          // 忽略 JSON 解析错误
        }
      }
    }
  }
}

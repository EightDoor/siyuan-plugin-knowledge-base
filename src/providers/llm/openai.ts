import type { LLMConfig, Message, ChatOptions } from '../../types'
import { BaseLLMProvider } from './base'

export class OpenAILLMProvider extends BaseLLMProvider {
  private baseUrl: string
  private model: string
  private apiKey: string

  constructor(config: LLMConfig) {
    super()
    this.baseUrl = (config.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '')
    this.model = config.model || 'gpt-4o-mini'
    this.apiKey = config.apiKey || ''
  }

  async *chat(messages: Message[], options?: ChatOptions): AsyncIterable<string> {
    const resp = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: true,
        temperature: options?.temperature ?? 0.7,
      }),
    })

    if (!resp.ok) {
      const errText = await resp.text()
      throw new Error(`OpenAI chat failed: ${resp.status} ${errText}`)
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
        if (!trimmed || !trimmed.startsWith('data: ')) continue

        const json = trimmed.slice(6)
        if (json === '[DONE]') return

        try {
          const parsed = JSON.parse(json)
          const content = parsed.choices?.[0]?.delta?.content
          if (content) {
            yield content
          }
        } catch {
          // 忽略 JSON 解析错误
        }
      }
    }
  }
}

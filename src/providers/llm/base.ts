import type { LLMProvider, Message, ChatOptions } from '../../types'

export abstract class BaseLLMProvider implements LLMProvider {
  abstract chat(messages: Message[], options?: ChatOptions): AsyncIterable<string>
}

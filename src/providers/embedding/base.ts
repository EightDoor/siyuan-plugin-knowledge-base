import type { EmbeddingProvider } from '../../types'

export abstract class BaseEmbeddingProvider implements EmbeddingProvider {
  abstract embed(texts: string[]): Promise<number[][]>
  abstract getDimensions(): number
}

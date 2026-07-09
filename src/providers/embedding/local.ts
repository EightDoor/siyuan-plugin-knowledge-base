import type { EmbeddingConfig } from '../../types'
import { BaseEmbeddingProvider } from './base'

export class LocalEmbeddingProvider extends BaseEmbeddingProvider {
  private model: string
  private pipeline: any = null
  private dimensions: number

  constructor(config: EmbeddingConfig) {
    super()
    this.model = config.localModel || 'Xenova/bge-small-zh-v1.5'
    this.dimensions = 512
  }

  private async getPipeline(): Promise<any> {
    if (this.pipeline) return this.pipeline

    const { pipeline } = await import('@xenova/transformers')
    this.pipeline = await pipeline('feature-extraction', this.model)
    return this.pipeline
  }

  async embed(texts: string[]): Promise<number[][]> {
    const pipe = await this.getPipeline()
    const results: number[][] = []

    for (const text of texts) {
      const output = await pipe(text, { pooling: 'mean', normalize: true })
      results.push(Array.from(output.data))
    }

    return results
  }

  getDimensions(): number {
    return this.dimensions
  }
}

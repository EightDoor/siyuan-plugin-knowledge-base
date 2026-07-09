import { extractPlainText } from './siyuan'

export interface ChunkOptions {
  maxSize: number
  overlap: number
  separators: string[]
}

export interface Chunk {
  content: string
  index: number
  start: number
  end: number
}

const DEFAULT_OPTIONS: ChunkOptions = {
  maxSize: 500,
  overlap: 50,
  separators: ['\n\n', '\n', '。', '！', '？', '.', '!', '?', '；', ';', '，', ','],
}

export function chunkByBlock(blocks: Array<{ id: string; content: string }>): Chunk[] {
  return blocks
    .map((block, index) => ({
      content: extractPlainText(block.content || ''),
      index,
      start: 0,
      end: (block.content || '').length,
    }))
    .filter(chunk => chunk.content.length > 0)
}

export function chunkByText(text: string, options: Partial<ChunkOptions> = {}): Chunk[] {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const chunks: Chunk[] = []

  if (text.length <= opts.maxSize) {
    return [{ content: text, index: 0, start: 0, end: text.length }]
  }

  let start = 0
  let index = 0

  while (start < text.length) {
    let end = Math.min(start + opts.maxSize, text.length)

    if (end < text.length) {
      let bestBreak = -1
      for (const sep of opts.separators) {
        const pos = text.lastIndexOf(sep, end)
        if (pos > bestBreak && pos > start + opts.maxSize * 0.3) {
          bestBreak = pos + sep.length
        }
      }
      if (bestBreak > 0) {
        end = bestBreak
      }
    }

    chunks.push({
      content: text.slice(start, end).trim(),
      index,
      start,
      end,
    })

    start = end - opts.overlap
    index++
  }

  return chunks.filter(chunk => chunk.content.length > 0)
}

export function chunkByHeading(markdown: string): Chunk[] {
  const headingRegex = /^(#{1,6})\s+(.+)$/gm
  const sections: Chunk[] = []
  let lastIndex = 0
  let index = 0

  const matches = [...markdown.matchAll(headingRegex)]

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i]
    const matchStart = match.index!
    const matchEnd = i + 1 < matches.length ? matches[i + 1].index! : markdown.length

    if (matchStart > lastIndex) {
      sections.push({
        content: markdown.slice(lastIndex, matchStart).trim(),
        index: index++,
        start: lastIndex,
        end: matchStart,
      })
    }

    sections.push({
      content: markdown.slice(matchStart, matchEnd).trim(),
      index: index++,
      start: matchStart,
      end: matchEnd,
    })

    lastIndex = matchEnd
  }

  if (lastIndex < markdown.length) {
    sections.push({
      content: markdown.slice(lastIndex).trim(),
      index: index++,
      start: lastIndex,
      end: markdown.length,
    })
  }

  return sections.filter(chunk => chunk.content.length > 0)
}

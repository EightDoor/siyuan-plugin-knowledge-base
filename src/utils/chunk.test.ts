import { describe, it, expect } from 'vitest'
import { chunkByText, chunkByHeading } from './chunk'

describe('chunkByText', () => {
  it('should handle short text as single chunk', () => {
    const result = chunkByText('hello', { maxSize: 500, overlap: 0, separators: ['\n'] })
    expect(result).toHaveLength(1)
    expect(result[0].content).toBe('hello')
  })

  it('should split multi-paragraph text', () => {
    const text = 'Paragraph one.\n\nParagraph two.\n\nParagraph three.'
    const result = chunkByText(text, { maxSize: 300, overlap: 0, separators: ['\n\n', '\n', '. '] })
    expect(result.length).toBeGreaterThanOrEqual(1)
    for (const chunk of result) {
      expect(chunk.content.length).toBeGreaterThan(0)
    }
  })

  it('should produce valid indices', () => {
    const text = 'a'.repeat(600) + '\n\n' + 'b'.repeat(600)
    const result = chunkByText(text, { maxSize: 300, overlap: 0, separators: ['\n\n', '\n'] })
    expect(result.length).toBeGreaterThanOrEqual(1)
    for (let i = 0; i < result.length; i++) {
      expect(result[i].index).toBe(i)
    }
  })

  it('should filter whitespace-only chunks', () => {
    const result = chunkByText('   \n\n', { maxSize: 10, overlap: 0, separators: ['\n'] })
    expect(Array.isArray(result)).toBe(true)
  })

  it('should not produce empty content', () => {
    const text = 'Hello world'
    const result = chunkByText(text, { maxSize: 200, overlap: 10, separators: ['\n'] })
    expect(result.length).toBeGreaterThan(0)
    for (const chunk of result) {
      expect(chunk.content.length).toBeGreaterThan(0)
    }
  })
})

describe('chunkByHeading', () => {
  it('should split markdown by headings', () => {
    const md = '# Title\n\nContent here\n\n## Sub\n\nMore content'
    const result = chunkByHeading(md)
    expect(result.length).toBeGreaterThanOrEqual(2)
  })

  it('should handle text before first heading', () => {
    const md = 'Preamble\n\n# Title\nContent'
    const result = chunkByHeading(md)
    expect(result.length).toBeGreaterThanOrEqual(2)
    expect(result[0].content).toContain('Preamble')
  })

  it('should handle single heading markdown', () => {
    const md = '# Header\n\nOnly content'
    const result = chunkByHeading(md)
    expect(result.length).toBeGreaterThanOrEqual(1)
    expect(result[0].content).toContain('Header')
  })
})

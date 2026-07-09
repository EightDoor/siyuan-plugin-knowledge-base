import { describe, it, expect } from 'vitest'
import { extractPlainText } from './siyuan'

describe('extractPlainText', () => {
  it('should strip markdown headings', () => {
    expect(extractPlainText('# Title')).toBe('Title')
    expect(extractPlainText('## Section')).toBe('Section')
  })

  it('should strip bold formatting', () => {
    expect(extractPlainText('hello **world**')).toBe('hello world')
  })

  it('should strip italic formatting', () => {
    expect(extractPlainText('hello *world* time')).toBe('hello world time')
  })

  it('should strip inline code markers keeping content', () => {
    expect(extractPlainText('use `const` keyword')).toBe('use const keyword')
  })

  it('should strip code blocks with content removed', () => {
    const md = 'before\n```\ncode here\n```\nafter'
    const result = extractPlainText(md)
    expect(result).toContain('before')
    expect(result).toContain('after')
  })

  it('should strip links keeping text', () => {
    expect(extractPlainText('[click here](https://example.com)')).toBe('click here')
  })

  it('should strip image syntax entirely', () => {
    const result = extractPlainText('see ![alt](img.png) photo')
    expect(result).toContain('see')
    expect(result).toContain('photo')
    expect(result).not.toContain('alt')
    expect(result).not.toContain('img.png')
  })

  it('should replace newlines with spaces', () => {
    expect(extractPlainText('line1\nline2\nline3')).toBe('line1 line2 line3')
  })

  it('should trim whitespace', () => {
    expect(extractPlainText('  \n text \n  ')).toBe('text')
  })
})

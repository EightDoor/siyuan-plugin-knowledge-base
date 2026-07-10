import { describe, it, expect, vi, afterEach } from 'vitest'
import { OpenAIEmbeddingProvider } from './openai'
import { OllamaEmbeddingProvider } from './ollama'

type FetchFn = typeof fetch

describe('OpenAIEmbeddingProvider', () => {
  const originalFetch: FetchFn = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('should omit Authorization header when apiKey is empty (Ollama compatibility)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ embedding: [0.1, 0.2, 0.3] }] }),
    })
    globalThis.fetch = fetchMock as unknown as FetchFn

    const provider = new OpenAIEmbeddingProvider({
      mode: 'remote',
      provider: 'openai',
      baseUrl: 'http://192.168.192.203:11434/v1',
      model: 'bge-m3',
      apiKey: '',
    })

    await provider.embed(['hello'])

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const callArgs = fetchMock.mock.calls[0]
    expect(callArgs[0]).toBe('http://192.168.192.203:11434/v1/embeddings')
    expect(callArgs[1].method).toBe('POST')
    expect(callArgs[1].headers).toEqual({ 'Content-Type': 'application/json' })
    expect(callArgs[1].headers.Authorization).toBeUndefined()
    expect(JSON.parse(callArgs[1].body)).toEqual({ model: 'bge-m3', input: ['hello'] })
  })

  it('should send Authorization header when apiKey is provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ embedding: [0.1] }] }),
    })
    globalThis.fetch = fetchMock as unknown as FetchFn

    const provider = new OpenAIEmbeddingProvider({
      mode: 'remote',
      provider: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      model: 'text-embedding-3-small',
      apiKey: 'sk-test-key',
    })

    await provider.embed(['hi'])

    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer sk-test-key')
  })

  it('should use configured dimensions when provided', () => {
    const provider = new OpenAIEmbeddingProvider({
      mode: 'remote',
      provider: 'openai',
      baseUrl: 'http://localhost:11434/v1',
      model: 'bge-m3',
      dimensions: 1024,
    })
    expect(provider.getDimensions()).toBe(1024)
  })

  it('should default dimensions to 1536 when not provided', () => {
    const provider = new OpenAIEmbeddingProvider({
      mode: 'remote',
      provider: 'openai',
    })
    expect(provider.getDimensions()).toBe(1536)
  })

  it('should strip trailing slashes from baseUrl', () => {
    const provider = new OpenAIEmbeddingProvider({
      mode: 'remote',
      provider: 'openai',
      baseUrl: 'http://localhost:11434/v1///',
    })
    expect((provider as unknown as { baseUrl: string }).baseUrl).toBe('http://localhost:11434/v1')
  })

  it('should throw when response is not ok', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'unauthorized',
    }) as unknown as FetchFn

    const provider = new OpenAIEmbeddingProvider({
      mode: 'remote',
      provider: 'openai',
      baseUrl: 'http://localhost:11434/v1',
      model: 'bge-m3',
    })

    await expect(provider.embed(['x'])).rejects.toThrow(/401/)
  })

  it('should map data array to embeddings array', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { embedding: [0.1, 0.2] },
          { embedding: [0.3, 0.4] },
        ],
      }),
    }) as unknown as FetchFn

    const provider = new OpenAIEmbeddingProvider({
      mode: 'remote',
      provider: 'openai',
      baseUrl: 'http://localhost:11434/v1',
      model: 'bge-m3',
    })

    const result = await provider.embed(['a', 'b'])
    expect(result).toEqual([
      [0.1, 0.2],
      [0.3, 0.4],
    ])
  })
})

describe('OllamaEmbeddingProvider', () => {
  const originalFetch: FetchFn = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('should use configured dimensions when provided', () => {
    const provider = new OllamaEmbeddingProvider({
      mode: 'remote',
      provider: 'ollama',
      baseUrl: 'http://localhost:11434',
      model: 'bge-m3',
      dimensions: 1024,
    })
    expect(provider.getDimensions()).toBe(1024)
  })

  it('should default dimensions to 768 when not provided', () => {
    const provider = new OllamaEmbeddingProvider({
      mode: 'remote',
      provider: 'ollama',
    })
    expect(provider.getDimensions()).toBe(768)
  })

  it('should hit /api/embed endpoint with native Ollama format', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ embeddings: [[0.1, 0.2, 0.3]] }),
    })
    globalThis.fetch = fetchMock as unknown as FetchFn

    const provider = new OllamaEmbeddingProvider({
      mode: 'remote',
      provider: 'ollama',
      baseUrl: 'http://localhost:11434',
      model: 'bge-m3',
    })

    await provider.embed(['hello'])

    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:11434/api/embed')
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body).toEqual({ model: 'bge-m3', input: ['hello'] })
  })
})
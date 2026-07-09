export async function computeHash(content: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(content)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export class HashCache {
  private cache: Map<string, string> = new Map()

  async hasChanged(id: string, content: string): Promise<boolean> {
    const newHash = await computeHash(content)
    const oldHash = this.cache.get(id)

    if (oldHash === newHash) {
      return false
    }

    this.cache.set(id, newHash)
    return true
  }

  set(id: string, hash: string): void {
    this.cache.set(id, hash)
  }

  delete(id: string): void {
    this.cache.delete(id)
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }

  toJSON(): Record<string, string> {
    return Object.fromEntries(this.cache)
  }

  fromJSON(data: Record<string, string>): void {
    this.cache = new Map(Object.entries(data))
  }
}

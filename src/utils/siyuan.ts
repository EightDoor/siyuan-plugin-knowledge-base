import { fetchSyncPost } from 'siyuan'

export async function querySQL(sql: string): Promise<any[]> {
  const response = await fetchSyncPost('/api/query/sql', { stmt: sql })
  if (response.code !== 0) {
    throw new Error(`SQL query failed: ${response.msg}`)
  }
  return response.data as any[]
}

export async function getAllDocumentBlocks(): Promise<any[]> {
  return querySQL(`
    SELECT * FROM blocks
    WHERE type = 'd'
    ORDER BY updated DESC
  `)
}

export async function getUpdatedBlocks(since: number): Promise<any[]> {
  const timestamp = Math.floor(since / 1000)
  return querySQL(`
    SELECT * FROM blocks
    WHERE updated > '${timestamp}'
    ORDER BY updated DESC
  `)
}

export async function getBlockContent(blockId: string): Promise<string> {
  const response = await fetchSyncPost('/api/block/getBlockDOM', { id: blockId })
  if (response.code !== 0) {
    throw new Error(`Get block content failed: ${response.msg}`)
  }
  return response.data as string
}

export async function getBlockInfo(blockId: string): Promise<any> {
  const response = await fetchSyncPost('/api/block/getBlockInfo', { id: blockId })
  if (response.code !== 0) {
    throw new Error(`Get block info failed: ${response.msg}`)
  }
  return response.data
}

export async function getNotebooks(): Promise<any[]> {
  const response = await fetchSyncPost('/api/notebook/lsNotebooks', {})
  if (response.code !== 0) {
    throw new Error(`Get notebooks failed: ${response.msg}`)
  }
  return response.data.notebooks as any[]
}

export function extractPlainText(markdown: string): string {
  return markdown
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/>\s+/gm, '')
    .replace(/\n+/g, ' ')
    .trim()
}

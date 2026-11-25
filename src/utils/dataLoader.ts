import type { Article, IssuesIndex, YearGroup } from '../types';

type ChunkKey = '2026' | '2025' | '2024' | 'archive';

const chunkCache = new Map<ChunkKey, Record<number, Article[]>>();
const chunkPromises = new Map<ChunkKey, Promise<Record<number, Article[]>>>();
let indexCache: IssuesIndex | null = null;

export function yearGroupToChunkKey(yg: YearGroup | string): ChunkKey {
  if (yg === '2026' || yg === '2025' || yg === '2024') return yg;
  return 'archive';
}

export async function fetchIssuesIndex(): Promise<IssuesIndex> {
  if (indexCache) return indexCache;
  const res = await fetch('/data/issues.json');
  if (!res.ok) throw new Error('无法加载周刊索引数据');
  indexCache = (await res.json()) as IssuesIndex;
  return indexCache;
}

export async function fetchChunk(key: ChunkKey): Promise<Record<number, Article[]>> {
  const cached = chunkCache.get(key);
  if (cached) return cached;

  let pending = chunkPromises.get(key);
  if (!pending) {
    pending = fetch(`/data/chunks/${key}.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`无法加载分片 ${key}`);
        return res.json() as Promise<Record<number, Article[]>>;
      })
      .then((data) => {
        chunkCache.set(key, data);
        chunkPromises.delete(key);
        return data;
      });
    chunkPromises.set(key, pending);
  }
  return pending;
}

export async function fetchIssueArticles(
  issueNumber: number,
  yearGroup: YearGroup
): Promise<Article[]> {
  const key = yearGroupToChunkKey(yearGroup);
  const chunk = await fetchChunk(key);
  return chunk[issueNumber] || [];
}

export async function fetchAllArticlesForSearch(): Promise<Article[]> {
  const keys: ChunkKey[] = ['2026', '2025', '2024', 'archive'];
  const chunks = await Promise.all(keys.map((k) => fetchChunk(k)));
  const all: Article[] = [];
  for (const chunk of chunks) {
    for (const list of Object.values(chunk)) {
      for (const art of list) {
        all.push(art);
      }
    }
  }
  return all;
}

export function extractSnippet(plainText: string, query: string, radius = 64): string {
  if (!query.trim()) return plainText.slice(0, 130) + (plainText.length > 130 ? '…' : '');
  const lower = plainText.toLowerCase();
  const q = query.trim().toLowerCase();
  const idx = lower.indexOf(q);
  if (idx === -1) return plainText.slice(0, 130) + (plainText.length > 130 ? '…' : '');
  const start = Math.max(0, idx - radius);
  const end = Math.min(plainText.length, idx + q.length + radius);
  return (start > 0 ? '…' : '') + plainText.slice(start, end) + (end < plainText.length ? '…' : '');
}

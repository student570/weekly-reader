import { openDB, type IDBPDatabase } from 'idb';
import type {
  Annotation,
  ArticlePersonalNote,
  Bookmark,
  BookmarkFolder,
  Category,
  CategoryOverride,
  ReadingProgress,
} from '../types';

const DB_NAME = 'weekly-knowledge-reader';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('bookmarks')) {
          const store = db.createObjectStore('bookmarks', { keyPath: 'articleId' });
          store.createIndex('folderId', 'folderId');
          store.createIndex('createdAt', 'createdAt');
        }
        if (!db.objectStoreNames.contains('folders')) {
          db.createObjectStore('folders', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('annotations')) {
          const store = db.createObjectStore('annotations', { keyPath: 'id' });
          store.createIndex('articleId', 'articleId');
        }
        if (!db.objectStoreNames.contains('articleNotes')) {
          db.createObjectStore('articleNotes', { keyPath: 'articleId' });
        }
        if (!db.objectStoreNames.contains('readingProgress')) {
          const store = db.createObjectStore('readingProgress', { keyPath: 'articleId' });
          store.createIndex('issueNumber', 'issueNumber');
          store.createIndex('lastReadAt', 'lastReadAt');
        }
        if (!db.objectStoreNames.contains('categoryOverrides')) {
          db.createObjectStore('categoryOverrides', { keyPath: 'articleId' });
        }
      },
    });
  }
  return dbPromise;
}

const DEFAULT_FOLDERS: BookmarkFolder[] = [
  { id: 'folder-ai-agent', name: 'AI Agent', createdAt: 1700000001000 },
  { id: 'folder-mcp', name: 'MCP', createdAt: 1700000002000 },
  { id: 'folder-projects', name: '感兴趣的项目', createdAt: 1700000003000 },
];

export async function loadAllPersonalData() {
  const db = await getDB();
  let folders = (await db.getAll('folders')) as BookmarkFolder[];
  if (folders.length === 0) {
    const tx = db.transaction('folders', 'readwrite');
    for (const f of DEFAULT_FOLDERS) {
      await tx.store.put(f);
    }
    await tx.done;
    folders = DEFAULT_FOLDERS;
  }

  const [bookmarks, annotations, articleNotes, readingProgress, categoryOverrides] =
    await Promise.all([
      db.getAll('bookmarks') as Promise<Bookmark[]>,
      db.getAll('annotations') as Promise<Annotation[]>,
      db.getAll('articleNotes') as Promise<ArticlePersonalNote[]>,
      db.getAll('readingProgress') as Promise<ReadingProgress[]>,
      db.getAll('categoryOverrides') as Promise<CategoryOverride[]>,
    ]);

  return {
    folders,
    bookmarks,
    annotations,
    articleNotes,
    readingProgress,
    categoryOverrides,
  };
}

export async function saveBookmark(bookmark: Bookmark) {
  const db = await getDB();
  await db.put('bookmarks', bookmark);
}

export async function deleteBookmark(articleId: string) {
  const db = await getDB();
  await db.delete('bookmarks', articleId);
}

export async function saveFolder(folder: BookmarkFolder) {
  const db = await getDB();
  await db.put('folders', folder);
}

export async function deleteFolder(folderId: string) {
  const db = await getDB();
  await db.delete('folders', folderId);
}

export async function saveAnnotation(annotation: Annotation) {
  const db = await getDB();
  await db.put('annotations', annotation);
}

export async function deleteAnnotation(id: string) {
  const db = await getDB();
  await db.delete('annotations', id);
}

export async function saveArticleNote(note: ArticlePersonalNote) {
  const db = await getDB();
  await db.put('articleNotes', note);
}

export async function saveReadingProgress(progress: ReadingProgress) {
  const db = await getDB();
  await db.put('readingProgress', progress);
}

export async function saveCategoryOverride(articleId: string, category: Category) {
  const db = await getDB();
  await db.put('categoryOverrides', {
    articleId,
    category,
    updatedAt: Date.now(),
  });
}

export async function exportPersonalData(): Promise<string> {
  const data = await loadAllPersonalData();
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      version: 1,
      ...data,
    },
    null,
    2
  );
}

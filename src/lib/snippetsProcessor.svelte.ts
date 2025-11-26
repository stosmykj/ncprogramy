import { readTextFile, writeTextFile, exists, mkdir, BaseDirectory } from '@tauri-apps/plugin-fs';
import { type Snippet, DEFAULT_SNIPPETS } from '../models/snippet';
import { logger } from './logger';

const SNIPPETS_FOLDER = 'snippets';
const SNIPPETS_FILE = 'snippets.json';

export const SNIPPETS = $state<Snippet[]>([]);

async function ensureSnippetsDirectoryExists(): Promise<void> {
  const dirExists = await exists(SNIPPETS_FOLDER, { baseDir: BaseDirectory.AppData });
  if (!dirExists) {
    await mkdir(SNIPPETS_FOLDER, { baseDir: BaseDirectory.AppData, recursive: true });
  }
}

export async function loadSnippets(): Promise<void> {
  try {
    await ensureSnippetsDirectoryExists();

    const filePath = `${SNIPPETS_FOLDER}/${SNIPPETS_FILE}`;
    const fileExists = await exists(filePath, { baseDir: BaseDirectory.AppData });

    if (!fileExists) {
      // Initialize with defaults
      SNIPPETS.length = 0;
      SNIPPETS.push(...DEFAULT_SNIPPETS);
      await saveSnippets();
      return;
    }

    const content = await readTextFile(filePath, { baseDir: BaseDirectory.AppData });
    const parsed = JSON.parse(content) as Snippet[];

    SNIPPETS.length = 0;
    SNIPPETS.push(...parsed.sort((a, b) => a.order - b.order));

    logger.info(`Loaded ${SNIPPETS.length} snippets`);
  } catch (error) {
    logger.error('Failed to load snippets', error);
    // Fall back to defaults
    SNIPPETS.length = 0;
    SNIPPETS.push(...DEFAULT_SNIPPETS);
  }
}

export async function saveSnippets(): Promise<void> {
  try {
    await ensureSnippetsDirectoryExists();

    const filePath = `${SNIPPETS_FOLDER}/${SNIPPETS_FILE}`;
    const content = JSON.stringify(SNIPPETS, null, 2);

    await writeTextFile(filePath, content, { baseDir: BaseDirectory.AppData });
    logger.info(`Saved ${SNIPPETS.length} snippets`);
  } catch (error) {
    logger.error('Failed to save snippets', error);
  }
}

export function generateSnippetId(): string {
  return `snippet-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export async function addSnippet(snippet: Omit<Snippet, 'id' | 'order'>): Promise<Snippet> {
  const newSnippet: Snippet = {
    ...snippet,
    id: generateSnippetId(),
    order: SNIPPETS.length,
  };

  SNIPPETS.push(newSnippet);
  await saveSnippets();

  return newSnippet;
}

export async function updateSnippet(id: string, updates: Partial<Omit<Snippet, 'id'>>): Promise<void> {
  const index = SNIPPETS.findIndex((s) => s.id === id);
  if (index === -1) {
    logger.warn(`Snippet not found: ${id}`);
    return;
  }

  SNIPPETS[index] = { ...SNIPPETS[index], ...updates };
  await saveSnippets();
}

export async function deleteSnippet(id: string): Promise<void> {
  const index = SNIPPETS.findIndex((s) => s.id === id);
  if (index === -1) {
    logger.warn(`Snippet not found: ${id}`);
    return;
  }

  SNIPPETS.splice(index, 1);

  // Reorder remaining snippets
  SNIPPETS.forEach((snippet, i) => {
    snippet.order = i;
  });

  await saveSnippets();
}

export async function reorderSnippets(fromIndex: number, toIndex: number): Promise<void> {
  if (fromIndex < 0 || fromIndex >= SNIPPETS.length || toIndex < 0 || toIndex >= SNIPPETS.length) {
    return;
  }

  const [moved] = SNIPPETS.splice(fromIndex, 1);
  SNIPPETS.splice(toIndex, 0, moved);

  // Update order values
  SNIPPETS.forEach((snippet, i) => {
    snippet.order = i;
  });

  await saveSnippets();
}

export async function resetToDefaults(): Promise<void> {
  SNIPPETS.length = 0;
  SNIPPETS.push(...DEFAULT_SNIPPETS);
  await saveSnippets();
  logger.info('Reset snippets to defaults');
}

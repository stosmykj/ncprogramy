import { exists, copyFile, mkdir } from '@tauri-apps/plugin-fs';
import { appDataDir, join } from '@tauri-apps/api/path';
import { File } from '../models/file';

export async function getStoragePath(): Promise<string> {
  const appData = await appDataDir();
  return await join(appData, 'files');
}

export async function ensureDirectoryExists(path: string): Promise<void> {
  try {
    const dirExists = await exists(path);
    if (!dirExists) {
      await mkdir(path, { recursive: true });
    }
  } catch (error) {
    console.error(`Failed to create directory ${path}:`, error);
  }
}

export async function copyFileToStorage(sourceFile: File): Promise<File | null> {
  try {
    const sourceExists = await exists(sourceFile.Path);
    if (!sourceExists) {
      console.warn(`Source file does not exist: ${sourceFile.Path}`);
      return sourceFile;
    }

    const destDir = await getStoragePath();
    await ensureDirectoryExists(destDir);

    const destFileName = `${sourceFile.Name}`;
    const destPath = await join(destDir, destFileName);

    await copyFile(sourceFile.Path, destPath);

    return new File({
      extension: sourceFile.Extension,
      name: sourceFile.Name,
      path: destPath,
    });
  } catch (error) {
    console.error(`Failed to copy file ${sourceFile.Path}:`, error);
    return sourceFile;
  }
}

export async function copyFileToStorageIfNeeded(
  currentFile: File | undefined
): Promise<File | undefined> {
  if (!currentFile) return undefined;

  const storagePath = await getStoragePath();
  const isAlreadyInStorage = currentFile.Path.startsWith(storagePath);

  if (!isAlreadyInStorage) {
    const copiedFile = await copyFileToStorage(currentFile);
    return copiedFile ?? currentFile;
  }

  return currentFile;
}

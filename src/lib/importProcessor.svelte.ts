import { open } from '@tauri-apps/plugin-dialog';
import { readTextFile, exists, copyFile, mkdir } from '@tauri-apps/plugin-fs';
import { appDataDir, join } from '@tauri-apps/api/path';
import { Program } from '../models/program';
import { File, type FileExtension } from '../models/file';
import { addPrograms } from './dataProcessor.svelte';

export interface ImportProgram {
  Id: string | null;
  TimeCreated: Date;
  TimeEdited: Date;
  dalsiCas: string | null;
  dorazilo: Date | null;
  hotovo: Date | null;
  ks: number | null;
  nakres: ImportFile | null;
  nazev: string | null;
  obrab: number | null;
  poznamka: string | null;
  pripr: number | null;
  prog: number | null;
  program: string;
  termin: Date | null;
  upnuti: ImportFile | null;
  vykresc: ImportFile | null;
  zakazkac: string | null;
}

export interface ImportFile {
  ext: FileExtension;
  name: string;
  path: string;
}

interface ImportVariables {
  dialog: boolean;
}

export const IMPORT_VARS: ImportVariables = $state({ dialog: false });

export async function loadImport(filename: string): Promise<Array<Program>> {
  const data = await readTextFile(filename);
  const jsonData = JSON.parse(data, extendParse) as {
    items: Array<ImportProgram>;
    counter: number;
  };
  const programs: Array<Program> = [];
  for (const item of jsonData.items) {
    programs.push(Program.fromImport(item));
  }
  return programs;
}

export async function openPrograms(): Promise<string | null> {
  const filename = await open({
    title: 'Načíst programy',
    filters: [{ name: 'Programy', extensions: ['pnc'] }],
  });
  return filename;
}

export async function processImport(programs: Array<Program>) {
  for (const program of programs) {
    await copyProgramFiles(program);
  }

  await addPrograms(programs);
}

async function getStoragePath(): Promise<string> {
  const appData = await appDataDir();
  return await join(appData, 'files');
}

async function ensureDirectoryExists(path: string): Promise<void> {
  try {
    const dirExists = await exists(path);
    if (!dirExists) {
      await mkdir(path, { recursive: true });
    }
  } catch (error) {
    console.error(`Failed to create directory ${path}:`, error);
  }
}

async function copyFileToStorage(sourceFile: File): Promise<File | null> {
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

    const destExists = await exists(destPath);
    if (!destExists) {
      await copyFile(sourceFile.Path, destPath);
    }

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

async function copyProgramFiles(program: Program): Promise<void> {
  if (program.Design) {
    const copiedDesign = await copyFileToStorage(program.Design);
    if (copiedDesign) {
      program.Design = copiedDesign;
    }
  }

  if (program.Drawing) {
    const copiedDrawing = await copyFileToStorage(program.Drawing);
    if (copiedDrawing) {
      program.Drawing = copiedDrawing;
    }
  }

  if (program.Clamping) {
    const copiedClamping = await copyFileToStorage(program.Clamping);
    if (copiedClamping) {
      program.Clamping = copiedClamping;
    }
  }
}

function extendParse(key: keyof ImportProgram | string, value: any) {
  try {
    switch (key) {
      case 'TimeCreated':
      case 'TimeEdited':
        return value ? new Date(value) : new Date();
      case 'dorazilo':
      case 'hotovo':
      case 'termin':
        return value ? new Date(value) : null;
      case 'ks':
      case 'obrab':
      case 'prog':
      case 'pripr':
        return value ? Number.parseFloat(value) : null;
      case 'nakres':
      case 'vykres':
      case 'upnuti':
        return value.path === '' ? null : value;
      default:
        return value;
    }
  } catch (_: any) {
    return null;
  }
}

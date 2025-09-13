import { open } from '@tauri-apps/plugin-dialog';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { Program } from '../models/program';
import type { FileExtension } from '../models/file';
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
  await addPrograms(programs);
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

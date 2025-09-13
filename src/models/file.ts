import type { ImportFile } from '$lib/importProcessor.svelte';

export type FileExtension =
  | 'PDF'
  | 'pdf'
  | 'DOCX'
  | 'docx'
  | 'DOC'
  | 'doc'
  | 'TXT'
  | 'txt'
  | 'ODG'
  | 'odg'
  | 'JPG'
  | 'jpg'
  | 'JPEG'
  | 'jpeg'
  | 'PNG'
  | 'png'
  | 'GIF'
  | 'gif'
  | 'BMP'
  | 'bmp'
  | 'MP4'
  | 'mp4'
  | 'AVI'
  | 'avi'
  | 'MKV'
  | 'mkv'
  | 'MOV'
  | 'mov'
  | 'WMV'
  | 'wmv'
  | 'ZIP'
  | 'zip'
  | 'RAR'
  | 'rar'
  | '7Z'
  | '7z'
  | 'XLSX'
  | 'xlsx'
  | 'XLS'
  | 'xls'
  | 'CSV'
  | 'csv';

export class File {
  private extension: FileExtension;
  private name: string;
  private path: string;

  constructor({ extension, name, path }: { extension: FileExtension; name: string; path: string }) {
    this.extension = extension;
    this.name = name;
    this.path = path;
  }

  get Extension(): FileExtension {
    return this.extension;
  }

  set Extension(value: FileExtension) {
    this.extension = value;
  }

  get Name(): string {
    return this.name;
  }

  set Name(value: string) {
    this.name = value;
  }

  get Path(): string {
    return this.path;
  }

  set Path(value: string) {
    this.path = value;
  }

  toString(): string {
    return JSON.stringify(this);
  }

  static fromImportFile(file: ImportFile): File {
    return new File({
      extension: file.ext,
      name: file.name,
      path: file.path,
    });
  }
}

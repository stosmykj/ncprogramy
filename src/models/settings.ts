import type { DbSettings } from './dbSettings';

export class Settings {
  private id?: number;
  private createdAt?: Date;
  private updatedAt?: Date;
  private key: string;
  private type: string;
  private value?: string;

  constructor({ id, createdAt, updatedAt, key, type, value }: DbSettings) {
    this.id = id;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.key = key;
    this.type = type;
    this.value = value;
  }

  public get Id(): number | undefined {
    return this.id;
  }

  public set Id(id: number) {
    this.id = id;
  }

  public get CreatedAt(): Date | undefined {
    return this.createdAt;
  }

  public set CreatedAt(createdAt: Date) {
    this.createdAt = createdAt;
  }

  public get UpdatedAt(): Date | undefined {
    return this.updatedAt;
  }

  public set UpdatedAt(updatedAt: Date) {
    this.updatedAt = updatedAt;
  }

  public get Key(): string {
    return this.key;
  }

  public set Key(key: string) {
    this.key = key;
  }

  public get Type(): string {
    return this.type;
  }

  public set Type(type: string) {
    this.type = type;
  }

  public get Value(): string | undefined {
    return this.value;
  }

  public set Value(value: string) {
    this.value = value;
  }

  toSqlInsert(): string {
    return `INSERT INTO settings (
    key, type, value
    ) VALUES (
      $1, $2, $3
    )`;
  }

  toSqlUpdate(): string {
    return `UPDATE settings SET 
      updatedAt = CURRENT_TIMESTAMP,
      value = $3,
    WHERE id=$4;`;
  }

  toArray(): Array<any> {
    return [this.key, this.type, this.value?.toString(), this.id];
  }
}

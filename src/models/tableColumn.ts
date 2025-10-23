import type { DbTableColumn } from './dbTableColumn';
import type { Program } from './program';

export type ColumnKeys = keyof Program | 'totalTime' | 'actions';
export type ColumnWidth = number | 'auto';
export type ColumnType = 'string' | 'number' | 'datetime' | 'date' | 'file' | 'computed';

export class TableColumn {
  private key: ColumnKeys;
  private createdAt: Date;
  private updatedAt: Date;
  private type: ColumnType;
  private position: number;
  private sort: 0 | -1 | 1;
  private sortPosition: number;
  private visible: boolean = true;
  private width: ColumnWidth = 'auto';
  private align: string = 'left';
  private filter?: string;
  private computeExpression?: string;
  private archived: boolean = false;
  private label?: string;

  constructor({
    key,
    createdAt,
    updatedAt,
    type,
    position,
    sort,
    sortPosition,
    visible,
    width,
    align,
    filter,
    computeExpression,
    archived,
    label,
  }: DbTableColumn) {
    this.key = key;
    this.createdAt = createdAt ? new Date(createdAt) : new Date();
    this.updatedAt = updatedAt ? new Date(updatedAt) : new Date();
    this.type = type;
    this.position = position;
    this.sort = sort;
    this.sortPosition = sortPosition;
    this.visible = visible ?? true;
    this.width = width ?? 'auto';
    this.align = align ?? 'left';
    this.filter = filter ?? undefined;
    this.computeExpression = computeExpression ?? undefined;
    this.archived = archived ?? false;
    this.label = label ?? undefined;
  }

  get Key(): ColumnKeys {
    return this.key;
  }

  set Key(value: ColumnKeys) {
    this.key = value;
  }

  get CreatedAt(): Date {
    return this.createdAt;
  }

  set CreatedAt(value: Date) {
    this.createdAt = value;
  }

  get UpdatedAt(): Date {
    return this.updatedAt;
  }

  set UpdatedAt(value: Date) {
    this.updatedAt = value;
  }

  get Type(): ColumnType {
    return this.type;
  }

  set Type(value: ColumnType) {
    this.type = value;
  }

  get Position(): number {
    return this.position;
  }

  set Position(value: number) {
    this.position = value;
  }

  get Sort(): 0 | -1 | 1 {
    return this.sort;
  }

  set Sort(value: 0 | -1 | 1) {
    this.sort = value;
  }

  get SortPosition(): number {
    return this.sortPosition;
  }

  set SortPosition(value: number) {
    this.sortPosition = value;
  }

  get Visible(): boolean {
    return this.visible;
  }

  set Visible(value: boolean) {
    this.visible = value;
  }

  get Width(): ColumnWidth {
    return this.width;
  }

  set Width(value: ColumnWidth) {
    this.width = value;
  }

  get Align(): string {
    return this.align;
  }

  set Align(value: string) {
    this.align = value;
  }

  get Filter(): string | undefined {
    return this.filter;
  }

  set Filter(value: string | undefined) {
    this.filter = value;
  }

  get ComputeExpression(): string | undefined {
    return this.computeExpression;
  }

  set ComputeExpression(value: string | undefined) {
    this.computeExpression = value;
  }

  get Archived(): boolean {
    return this.archived;
  }

  set Archived(value: boolean) {
    this.archived = value;
  }

  get Label(): string | undefined {
    return this.label;
  }

  set Label(value: string | undefined) {
    this.label = value;
  }

  toSqlUpdate(): string {
    return `UPDATE table_columns SET
      updatedAt = CURRENT_TIMESTAMP,
      type = $2,
      position = $3,
      sort = $4,
      sortPosition = $5,
      visible = $6,
      width = $7,
      align = $8,
      filter = $9,
      computeExpression = $10,
      archived = $11,
      label = $12
    WHERE key=$1;`;
  }

  toArray(): Array<any> {
    return [
      this.key,
      this.type,
      this.position,
      this.sort,
      this.sortPosition,
      this.visible,
      this.width,
      this.align,
      this.filter,
      this.computeExpression,
      this.archived,
      this.label,
    ];
  }
}

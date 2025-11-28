import type { DbTableColumn } from './dbTableColumn';

export type ColumnWidth = number | 'auto';
export type ColumnType = 'string' | 'number' | 'datetime' | 'date' | 'file' | 'gcode' | 'computed' | 'incremental';

export class TableColumn {
  private key: string;
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
  private sortable: boolean = true;
  private dateFormat?: string;
  private copyable: boolean = true;
  private inlineEditable: boolean = true;
  private incrementalPattern?: string;
  private incrementalRewritable: boolean = false;

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
    sortable,
    dateFormat,
    copyable,
    inlineEditable,
    incrementalPattern,
    incrementalRewritable,
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
    this.sortable = sortable ?? true;
    this.dateFormat = dateFormat ?? undefined;
    this.copyable = copyable ?? true;
    this.inlineEditable = inlineEditable ?? true;
    this.incrementalPattern = incrementalPattern ?? undefined;
    this.incrementalRewritable = incrementalRewritable ?? false;
  }

  get Key(): string {
    return this.key;
  }

  set Key(value: string) {
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

  get Sortable(): boolean {
    return this.sortable;
  }

  set Sortable(value: boolean) {
    this.sortable = value;
  }

  get DateFormat(): string | undefined {
    return this.dateFormat;
  }

  set DateFormat(value: string | undefined) {
    this.dateFormat = value;
  }

  get Copyable(): boolean {
    return this.copyable;
  }

  set Copyable(value: boolean) {
    this.copyable = value;
  }

  get InlineEditable(): boolean {
    return this.inlineEditable;
  }

  set InlineEditable(value: boolean) {
    this.inlineEditable = value;
  }

  get IncrementalPattern(): string | undefined {
    return this.incrementalPattern;
  }

  set IncrementalPattern(value: string | undefined) {
    this.incrementalPattern = value;
  }

  get IncrementalRewritable(): boolean {
    return this.incrementalRewritable;
  }

  set IncrementalRewritable(value: boolean) {
    this.incrementalRewritable = value;
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
      label = $12,
      sortable = $13,
      dateFormat = $14,
      copyable = $15,
      inlineEditable = $16,
      incrementalPattern = $17,
      incrementalRewritable = $18
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
      this.sortable,
      this.dateFormat,
      this.copyable,
      this.inlineEditable,
      this.incrementalPattern,
      this.incrementalRewritable,
    ];
  }
}

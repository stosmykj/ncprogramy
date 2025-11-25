import type { ColumnType, ColumnWidth } from './tableColumn';

export interface DbTableColumn {
  key: string;
  createdAt: Date;
  updatedAt: Date;
  type: ColumnType;
  position: number;
  sort: 0 | -1 | 1;
  sortPosition: number;
  visible: boolean;
  width: ColumnWidth;
  align: string;
  filter?: string;
  computeExpression?: string;
  archived?: boolean;
  label?: string;
}

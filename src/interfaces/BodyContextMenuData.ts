export interface BodyContextMenuData {
  opened: boolean;
  key: string|null,
  row: number,
  column: number,
  cursorPosition: {x: number, y: number}
}
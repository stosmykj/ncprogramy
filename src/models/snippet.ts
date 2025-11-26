export interface Snippet {
  id: string;
  name: string;
  code: string;
  description: string;
  order: number;
}

export const DEFAULT_SNIPPETS: Snippet[] = [
  {
    id: 'default-program-start',
    name: 'program-start',
    code: `(Program Name)
G21 (mm)
G90 (absolutní)
G17 (rovina XY)
G54 (souřadný systém)
G49 (zrušit korekci délky)
G40 (zrušit korekci rádiusu)`,
    description: 'Vloží standardní hlavičku programu',
    order: 0,
  },
  {
    id: 'default-drilling-cycle',
    name: 'drilling-cycle',
    code: `G81 X0 Y0 Z-10 R2 F100
X10
Y10
X20
G80 (zrušit cyklus)`,
    description: 'Vrtací cyklus s více pozicemi',
    order: 1,
  },
  {
    id: 'default-tool-change',
    name: 'tool-change',
    code: `M05 (stop vřetena)
G28 G91 Z0 (návrat Z)
G90
M06 T01
G43 H01 Z50
M03 S1500
M08 (chlazení)`,
    description: 'Bezpečná výměna nástroje',
    order: 2,
  },
];

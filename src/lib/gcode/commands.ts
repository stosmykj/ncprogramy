/**
 * G-code Command Definitions
 * Based on MIKROPROG control system for FCM 28 CNC machine
 */

export interface GCodeCommand {
  code: string;
  description: string;
  category: 'motion' | 'coordinate' | 'compensation' | 'cycles' | 'other';
  parameters?: CommandParameter[];
  example?: string;
  mikroprog?: boolean; // MIKROPROG-specific command
}

export interface CommandParameter {
  name: string;
  description: string;
  required: boolean;
  type: 'number' | 'integer' | 'axis' | 'string';
  min?: number;
  max?: number;
}

export interface MCodeCommand {
  code: string;
  description: string;
  category: 'program' | 'spindle' | 'coolant' | 'tool' | 'other';
  parameters?: CommandParameter[];
  example?: string;
  mikroprog?: boolean;
}

// G-code commands database
export const G_CODES: Record<string, GCodeCommand> = {
  G00: {
    code: 'G00',
    description: 'Rychloposuv (Rapid positioning)',
    category: 'motion',
    parameters: [
      {
        name: 'X',
        description: 'Cílová pozice v ose X [mm]',
        required: false,
        type: 'axis',
      },
      {
        name: 'Y',
        description: 'Cílová pozice v ose Y [mm]',
        required: false,
        type: 'axis',
      },
      {
        name: 'Z',
        description: 'Cílová pozice v ose Z [mm]',
        required: false,
        type: 'axis',
      },
      {
        name: 'A',
        description: 'Úhel rotační osy A [°]',
        required: false,
        type: 'axis',
      },
      {
        name: 'B',
        description: 'Úhel rotační osy B [°]',
        required: false,
        type: 'axis',
      },
    ],
    example: 'G00 X100 Y50 Z10',
  },
  G01: {
    code: 'G01',
    description: 'Lineární interpolace - pracovní posuv v přímce s definovanou rychlostí',
    category: 'motion',
    parameters: [
      {
        name: 'X',
        description: 'Cílová pozice v ose X [mm]',
        required: false,
        type: 'axis',
      },
      {
        name: 'Y',
        description: 'Cílová pozice v ose Y [mm]',
        required: false,
        type: 'axis',
      },
      {
        name: 'Z',
        description: 'Cílová pozice v ose Z [mm]',
        required: false,
        type: 'axis',
      },
      {
        name: 'F',
        description: 'Rychlost posuvu [mm/min] - definuje rychlost obrábění',
        required: false,
        type: 'number',
        min: 0,
      },
    ],
    example: 'G01 X100 Y50 F300',
  },
  G02: {
    code: 'G02',
    description: 'Kruhová interpolace CW - oblouk ve směru hodinových ručiček',
    category: 'motion',
    parameters: [
      {
        name: 'X',
        description: 'Koncová pozice oblouku v ose X [mm]',
        required: false,
        type: 'axis',
      },
      {
        name: 'Y',
        description: 'Koncová pozice oblouku v ose Y [mm]',
        required: false,
        type: 'axis',
      },
      {
        name: 'I',
        description: 'Inkrementální vzdálenost středu oblouku od startovní pozice v ose X [mm]',
        required: false,
        type: 'number',
      },
      {
        name: 'J',
        description: 'Inkrementální vzdálenost středu oblouku od startovní pozice v ose Y [mm]',
        required: false,
        type: 'number',
      },
      {
        name: 'R',
        description: 'Poloměr oblouku [mm] - alternativa k I/J pro oblouky ≤180°',
        required: false,
        type: 'number',
      },
      {
        name: 'F',
        description: 'Rychlost posuvu [mm/min]',
        required: false,
        type: 'number',
      },
    ],
    example: 'G02 X50 Y50 I25 J0 F200',
  },
  G03: {
    code: 'G03',
    description: 'Kruhová interpolace CCW - oblouk proti směru hodinových ručiček',
    category: 'motion',
    parameters: [
      {
        name: 'X',
        description: 'Koncová pozice oblouku v ose X [mm]',
        required: false,
        type: 'axis',
      },
      {
        name: 'Y',
        description: 'Koncová pozice oblouku v ose Y [mm]',
        required: false,
        type: 'axis',
      },
      {
        name: 'I',
        description: 'Inkrementální vzdálenost středu oblouku od startovní pozice v ose X [mm]',
        required: false,
        type: 'number',
      },
      {
        name: 'J',
        description: 'Inkrementální vzdálenost středu oblouku od startovní pozice v ose Y [mm]',
        required: false,
        type: 'number',
      },
      {
        name: 'R',
        description: 'Poloměr oblouku [mm] - alternativa k I/J pro oblouky ≤180°',
        required: false,
        type: 'number',
      },
      {
        name: 'F',
        description: 'Rychlost posuvu [mm/min]',
        required: false,
        type: 'number',
      },
    ],
    example: 'G03 X50 Y50 I0 J25 F200',
  },
  G04: {
    code: 'G04',
    description: 'Časová prodleva (Dwell) - pozastavení pohybu na definovanou dobu',
    category: 'other',
    parameters: [
      {
        name: 'P',
        description: 'Doba prodlevy [ms] - např. P1000 = 1 sekunda',
        required: false,
        type: 'integer',
        min: 0,
      },
      {
        name: 'X',
        description: 'Doba prodlevy [s] - alternativní formát, např. X1.5 = 1.5 sekundy',
        required: false,
        type: 'number',
        min: 0,
      },
    ],
    example: 'G04 P500 (prodleva 500ms)',
  },
  G17: {
    code: 'G17',
    description: 'Výběr roviny XY - kruhová interpolace a korekce nástroje pracují v rovině XY',
    category: 'coordinate',
    example: 'G17',
  },
  G18: {
    code: 'G18',
    description: 'Výběr roviny XZ - kruhová interpolace a korekce nástroje pracují v rovině XZ',
    category: 'coordinate',
    example: 'G18',
  },
  G19: {
    code: 'G19',
    description: 'Výběr roviny YZ - kruhová interpolace a korekce nástroje pracují v rovině YZ',
    category: 'coordinate',
    example: 'G19',
  },
  G20: {
    code: 'G20',
    description: 'Programování v palcích (Inch mode) - všechny rozměry jsou v palcích',
    category: 'coordinate',
    example: 'G20',
  },
  G21: {
    code: 'G21',
    description: 'Programování v milimetrech (Metric mode) - všechny rozměry jsou v mm',
    category: 'coordinate',
    example: 'G21',
  },
  G28: {
    code: 'G28',
    description: 'Návrat do referenčního bodu stroje přes mezipolohu',
    category: 'motion',
    parameters: [
      {
        name: 'X',
        description: 'Mezipoloha v ose X před návratem do reference',
        required: false,
        type: 'axis',
      },
      {
        name: 'Y',
        description: 'Mezipoloha v ose Y před návratem do reference',
        required: false,
        type: 'axis',
      },
      {
        name: 'Z',
        description: 'Mezipoloha v ose Z před návratem do reference',
        required: false,
        type: 'axis',
      },
    ],
    example: 'G28 G91 Z0',
  },
  G40: {
    code: 'G40',
    description: 'Zrušení korekce rádiusu nástroje - vypne G41/G42',
    category: 'compensation',
    example: 'G40',
  },
  G41: {
    code: 'G41',
    description:
      'Korekce rádiusu nástroje vlevo - nástroj jede vlevo od programované dráhy (pohled ve směru pohybu)',
    category: 'compensation',
    parameters: [
      {
        name: 'D',
        description: 'Číslo korekce rádiusu (1-99) - odkazuje na tabulku korekcí nástrojů',
        required: true,
        type: 'integer',
      },
    ],
    example: 'G41 D1',
  },
  G42: {
    code: 'G42',
    description:
      'Korekce rádiusu nástroje vpravo - nástroj jede vpravo od programované dráhy (pohled ve směru pohybu)',
    category: 'compensation',
    parameters: [
      {
        name: 'D',
        description: 'Číslo korekce rádiusu (1-99) - odkazuje na tabulku korekcí nástrojů',
        required: true,
        type: 'integer',
      },
    ],
    example: 'G42 D1',
  },
  G43: {
    code: 'G43',
    description: 'Korekce délky nástroje + (Tool length compensation) - aktivuje kompenzaci délky',
    category: 'compensation',
    parameters: [
      {
        name: 'H',
        description: 'Číslo korekce délky (1-99) - odkazuje na tabulku korekcí nástrojů',
        required: true,
        type: 'integer',
      },
      {
        name: 'Z',
        description: 'Cílová pozice Z po aktivaci korekce [mm]',
        required: false,
        type: 'axis',
      },
    ],
    example: 'G43 H1 Z10',
  },
  G49: {
    code: 'G49',
    description: 'Zrušení korekce délky nástroje - vypne G43/G44',
    category: 'compensation',
    example: 'G49',
  },
  G54: {
    code: 'G54',
    description: 'Pracovní souřadný systém 1 (Work offset 1) - nejčastěji používaný nulový bod',
    category: 'coordinate',
    example: 'G54',
  },
  G55: {
    code: 'G55',
    description: 'Pracovní souřadný systém 2 (Work offset 2)',
    category: 'coordinate',
    example: 'G55',
  },
  G56: {
    code: 'G56',
    description: 'Pracovní souřadný systém 3 (Work offset 3)',
    category: 'coordinate',
    example: 'G56',
  },
  G57: {
    code: 'G57',
    description: 'Pracovní souřadný systém 4 (Work offset 4)',
    category: 'coordinate',
    example: 'G57',
  },
  G58: {
    code: 'G58',
    description: 'Pracovní souřadný systém 5 (Work offset 5)',
    category: 'coordinate',
    example: 'G58',
  },
  G59: {
    code: 'G59',
    description: 'Pracovní souřadný systém 6 (Work offset 6)',
    category: 'coordinate',
    example: 'G59',
  },
  G80: {
    code: 'G80',
    description: 'Zrušení pevného cyklu - ukončí aktivní vrtací/závitovací cyklus',
    category: 'cycles',
    example: 'G80',
  },
  G81: {
    code: 'G81',
    description: 'Vrtací cyklus - jednoduchý vrtací cyklus bez prodlevy a zpětného chodu',
    category: 'cycles',
    parameters: [
      {
        name: 'X',
        description: 'Pozice díry v ose X [mm]',
        required: false,
        type: 'axis',
      },
      {
        name: 'Y',
        description: 'Pozice díry v ose Y [mm]',
        required: false,
        type: 'axis',
      },
      {
        name: 'Z',
        description: 'Hloubka vrtání [mm] - konečná hloubka díry',
        required: true,
        type: 'axis',
      },
      {
        name: 'R',
        description: 'Rovina návratu [mm] - bezpečná výška nad obrobkem',
        required: true,
        type: 'number',
      },
      {
        name: 'F',
        description: 'Rychlost posuvu při vrtání [mm/min]',
        required: true,
        type: 'number',
      },
    ],
    example: 'G81 X50 Y50 Z-10 R2 F100',
  },
  G82: {
    code: 'G82',
    description: 'Vrtací cyklus s prodlevou - vrtání s časovou prodlevou na dně díry (zahlubování)',
    category: 'cycles',
    parameters: [
      {
        name: 'X',
        description: 'Pozice díry v ose X [mm]',
        required: false,
        type: 'axis',
      },
      {
        name: 'Y',
        description: 'Pozice díry v ose Y [mm]',
        required: false,
        type: 'axis',
      },
      {
        name: 'Z',
        description: 'Hloubka vrtání [mm] - konečná hloubka díry',
        required: true,
        type: 'axis',
      },
      {
        name: 'R',
        description: 'Rovina návratu [mm] - bezpečná výška nad obrobkem',
        required: true,
        type: 'number',
      },
      {
        name: 'P',
        description: 'Doba prodlevy na dně [ms] - pro vyčištění dna díry',
        required: true,
        type: 'integer',
      },
      {
        name: 'F',
        description: 'Rychlost posuvu při vrtání [mm/min]',
        required: true,
        type: 'number',
      },
    ],
    example: 'G82 X50 Y50 Z-10 R2 P500 F100',
  },
  G83: {
    code: 'G83',
    description:
      'Hluboké vrtání (Peck drilling) - vrtání s přerušovaným posuvem pro odvod třísek',
    category: 'cycles',
    parameters: [
      {
        name: 'X',
        description: 'Pozice díry v ose X [mm]',
        required: false,
        type: 'axis',
      },
      {
        name: 'Y',
        description: 'Pozice díry v ose Y [mm]',
        required: false,
        type: 'axis',
      },
      {
        name: 'Z',
        description: 'Konečná hloubka vrtání [mm]',
        required: true,
        type: 'axis',
      },
      {
        name: 'R',
        description: 'Rovina návratu [mm] - bezpečná výška nad obrobkem',
        required: true,
        type: 'number',
      },
      {
        name: 'Q',
        description: 'Hloubka jednoho záběru (peck) [mm] - vrták se po každém záběru vrací nahoru',
        required: true,
        type: 'number',
      },
      {
        name: 'F',
        description: 'Rychlost posuvu při vrtání [mm/min]',
        required: true,
        type: 'number',
      },
    ],
    example: 'G83 X50 Y50 Z-30 R2 Q5 F100',
  },
  G84: {
    code: 'G84',
    description:
      'Závitovací cyklus (Tapping) - synchronizované řezání závitu se zpětným chodem',
    category: 'cycles',
    parameters: [
      {
        name: 'X',
        description: 'Pozice závitu v ose X [mm]',
        required: false,
        type: 'axis',
      },
      {
        name: 'Y',
        description: 'Pozice závitu v ose Y [mm]',
        required: false,
        type: 'axis',
      },
      {
        name: 'Z',
        description: 'Hloubka závitu [mm]',
        required: true,
        type: 'axis',
      },
      {
        name: 'R',
        description: 'Rovina návratu [mm] - bezpečná výška nad obrobkem',
        required: true,
        type: 'number',
      },
      {
        name: 'F',
        description: 'Stoupání závitu [mm/ot] - např. M8 má stoupání 1.25mm',
        required: true,
        type: 'number',
      },
    ],
    example: 'G84 X50 Y50 Z-15 R2 F1.5',
  },
  G90: {
    code: 'G90',
    description: 'Absolutní programování - souřadnice jsou vztaženy k nulovému bodu',
    category: 'coordinate',
    example: 'G90',
  },
  G91: {
    code: 'G91',
    description: 'Přírůstkové programování (Incremental) - souřadnice jsou relativní k aktuální pozici',
    category: 'coordinate',
    example: 'G91',
  },
  G92: {
    code: 'G92',
    description: 'Nastavení pracovního offsetu - nastaví aktuální pozici jako definovanou hodnotu',
    category: 'coordinate',
    parameters: [
      {
        name: 'X',
        description: 'Nastavit aktuální X pozici na tuto hodnotu [mm]',
        required: false,
        type: 'number',
      },
      {
        name: 'Y',
        description: 'Nastavit aktuální Y pozici na tuto hodnotu [mm]',
        required: false,
        type: 'number',
      },
      {
        name: 'Z',
        description: 'Nastavit aktuální Z pozici na tuto hodnotu [mm]',
        required: false,
        type: 'number',
      },
    ],
    example: 'G92 X0 Y0 Z0',
  },
  G94: {
    code: 'G94',
    description: 'Posuv v mm/min (Feed per minute) - rychlost posuvu F je v mm za minutu',
    category: 'other',
    example: 'G94',
  },
  G95: {
    code: 'G95',
    description: 'Posuv v mm/otáčku (Feed per revolution) - rychlost posuvu F je v mm na otáčku vřetena',
    category: 'other',
    example: 'G95',
  },
};

// M-code commands database
export const M_CODES: Record<string, MCodeCommand> = {
  M00: {
    code: 'M00',
    description: 'Programové zastavení (Program stop) - pozastaví program, vyžaduje ruční restart operátorem',
    category: 'program',
    example: 'M00',
  },
  M01: {
    code: 'M01',
    description: 'Volitelné zastavení (Optional stop) - zastaví pouze pokud je aktivován přepínač na stroji',
    category: 'program',
    example: 'M01',
  },
  M02: {
    code: 'M02',
    description: 'Konec programu (Program end) - ukončí program bez návratu kurzoru na začátek',
    category: 'program',
    example: 'M02',
  },
  M03: {
    code: 'M03',
    description: 'Spuštění vřetena CW (Spindle on clockwise) - rotace ve směru hodinových ručiček',
    category: 'spindle',
    parameters: [
      {
        name: 'S',
        description: 'Rychlost vřetena [ot/min] - otáčky vřetena',
        required: true,
        type: 'integer',
        min: 0,
      },
    ],
    example: 'M03 S1500',
  },
  M04: {
    code: 'M04',
    description: 'Spuštění vřetena CCW (Spindle on counter-clockwise) - rotace proti směru hodinových ručiček',
    category: 'spindle',
    parameters: [
      {
        name: 'S',
        description: 'Rychlost vřetena [ot/min] - otáčky vřetena',
        required: true,
        type: 'integer',
        min: 0,
      },
    ],
    example: 'M04 S1500',
  },
  M05: {
    code: 'M05',
    description: 'Zastavení vřetena (Spindle stop) - vypne otáčení vřetena',
    category: 'spindle',
    example: 'M05',
  },
  M06: {
    code: 'M06',
    description: 'Výměna nástroje (Tool change) - provede automatickou výměnu nástroje dle T kódu',
    category: 'tool',
    parameters: [
      {
        name: 'T',
        description: 'Číslo nástroje (1-99) - identifikace nástroje v zásobníku',
        required: true,
        type: 'integer',
        min: 1,
        max: 99,
      },
    ],
    example: 'M06 T01',
  },
  M07: {
    code: 'M07',
    description: 'Chlazení mlhou (Mist coolant ON) - zapne chlazení rozprašovanou kapalinou',
    category: 'coolant',
    example: 'M07',
  },
  M08: {
    code: 'M08',
    description: 'Chlazení zapnuto (Flood coolant ON) - zapne hlavní přívod chladicí kapaliny',
    category: 'coolant',
    example: 'M08',
  },
  M09: {
    code: 'M09',
    description: 'Chlazení vypnuto (Coolant OFF) - vypne veškeré chlazení',
    category: 'coolant',
    example: 'M09',
  },
  M10: {
    code: 'M10',
    description: 'Upnutí obrobku (Clamp) - aktivuje upínací mechanismus',
    category: 'other',
    example: 'M10',
    mikroprog: true,
  },
  M11: {
    code: 'M11',
    description: 'Uvolnění obrobku (Unclamp) - uvolní upínací mechanismus',
    category: 'other',
    example: 'M11',
    mikroprog: true,
  },
  M19: {
    code: 'M19',
    description: 'Orientace vřetena (Spindle orientation) - zastaví vřeteno v definované úhlové poloze',
    category: 'spindle',
    example: 'M19',
  },
  M30: {
    code: 'M30',
    description: 'Konec programu (End program) - ukončí program a vrátí kurzor na začátek pro další cyklus',
    category: 'program',
    example: 'M30',
  },
  M98: {
    code: 'M98',
    description: 'Volání podprogramu (Subprogram call) - přeskočí na podprogram definovaný P číslem',
    category: 'program',
    parameters: [
      {
        name: 'P',
        description: 'Číslo podprogramu (Oxxxx) - identifikace volaného podprogramu',
        required: true,
        type: 'integer',
      },
      {
        name: 'L',
        description: 'Počet opakování - kolikrát se má podprogram provést (výchozí 1)',
        required: false,
        type: 'integer',
        min: 1,
      },
    ],
    example: 'M98 P1000',
  },
  M99: {
    code: 'M99',
    description: 'Návrat z podprogramu (Return from subprogram) - vrátí se zpět do hlavního programu',
    category: 'program',
    example: 'M99',
  },
};

// MIKROPROG-specific commands and extensions
export const MIKROPROG_EXTENSIONS = {
  G100: {
    code: 'G100',
    description: 'MIKROPROG - Automatické měření nástroje pomocí měřicí sondy na stroji',
    category: 'other',
    mikroprog: true,
    example: 'G100',
  },
  G101: {
    code: 'G101',
    description: 'MIKROPROG - Měření obrobku dotykovou sondou pro nastavení nulového bodu',
    category: 'other',
    mikroprog: true,
    example: 'G101 X50 Y50',
  },
  M50: {
    code: 'M50',
    description: 'MIKROPROG - Aktivace 4. osy (rotační osa A) pro víceoosé obrábění',
    category: 'other',
    mikroprog: true,
    example: 'M50',
  },
  M51: {
    code: 'M51',
    description: 'MIKROPROG - Aktivace 5. osy (rotační osa B) pro 5osé simultánní obrábění',
    category: 'other',
    mikroprog: true,
    example: 'M51',
  },
};

// Combine all commands for easy lookup
export const ALL_G_CODES = { ...G_CODES, ...MIKROPROG_EXTENSIONS };

// Function to get command info
export function getGCodeInfo(code: string): GCodeCommand | undefined {
  const upperCode = code.toUpperCase();
  return ALL_G_CODES[upperCode];
}

export function getMCodeInfo(code: string): MCodeCommand | undefined {
  const upperCode = code.toUpperCase();
  return M_CODES[upperCode];
}

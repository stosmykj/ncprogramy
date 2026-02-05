/**
 * Monaco Editor Configuration for G-code
 * Provides syntax highlighting, IntelliSense, and validation
 */

import type * as monaco from 'monaco-editor';
import { G_CODES, M_CODES, MIKROPROG_EXTENSIONS, type GCodeCommand } from './commands';
import { GCodeParser } from './parser';
import { GCodeValidator } from './validator';
import { SNIPPETS } from '../snippetsProcessor.svelte';

export const GCODE_LANGUAGE_ID = 'gcode';

// G-code language definition
export const gcodeLanguage: monaco.languages.IMonarchLanguage = {
  defaultToken: '',
  tokenPostfix: '.gcode',
  ignoreCase: true,

  keywords: [
    // Common G-codes
    'G00',
    'G01',
    'G02',
    'G03',
    'G04',
    'G17',
    'G18',
    'G19',
    'G20',
    'G21',
    'G28',
    'G40',
    'G41',
    'G42',
    'G43',
    'G49',
    'G54',
    'G55',
    'G56',
    'G57',
    'G58',
    'G59',
    'G80',
    'G81',
    'G82',
    'G83',
    'G84',
    'G90',
    'G91',
    'G92',
    'G94',
    'G95',
    // Common M-codes
    'M00',
    'M01',
    'M02',
    'M03',
    'M04',
    'M05',
    'M06',
    'M07',
    'M08',
    'M09',
    'M10',
    'M11',
    'M19',
    'M30',
    'M98',
    'M99',
    // MIKROPROG extensions
    'G100',
    'G101',
    'M50',
    'M51',
  ],

  operators: ['+', '-', '*', '/', '=', '<', '>', '[', ']'],

  // Regular expressions for tokens
  symbols: /[=><!~?:&|+\-*/^%]+/,
  escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
  digits: /\d+(_+\d+)*/,
  octaldigits: /[0-7]+(_+[0-7]+)*/,
  binarydigits: /[0-1]+(_+[0-1]+)*/,
  hexdigits: /[[0-9a-fA-F]+(_+[0-9a-fA-F]+)*/,

  tokenizer: {
    root: [
      // Comments
      [/\(.*?\)/, 'comment'],
      [/;.*$/, 'comment'],

      // Block numbers
      [/N\d+/, 'number.block'],

      // Program numbers
      [/O\d+/, 'number.program'],

      // G-codes
      [
        /G\d+(\.\d+)?/,
        {
          cases: {
            '@keywords': 'keyword.gcode',
            '@default': 'identifier.gcode',
          },
        },
      ],

      // M-codes
      [
        /M\d+/,
        {
          cases: {
            '@keywords': 'keyword.mcode',
            '@default': 'identifier.mcode',
          },
        },
      ],

      // Axis letters with values
      [/[XYZABCUVWIJKRHDPQL][+-]?\d*\.?\d*/, 'variable.axis'],

      // Feed rate
      [/F\d*\.?\d*/, 'variable.feedrate'],

      // Spindle speed
      [/S\d*\.?\d*/, 'variable.spindlespeed'],

      // Tool number
      [/T\d+/, 'variable.tool'],

      // Parameters
      [/#<[^>]+>/, 'variable.parameter'],
      [/#\d+/, 'variable.parameter'],

      // Numbers
      [/[+-]?\d*\.?\d+/, 'number'],

      // Operators
      [
        /@symbols/,
        {
          cases: {
            '@operators': 'operator',
            '@default': '',
          },
        },
      ],

      // Whitespace
      [/\s+/, 'white'],
    ],
  },
};

// Theme for G-code
export const gcodeTheme: monaco.editor.IStandaloneThemeData = {
  base: 'vs',
  inherit: true,
  rules: [
    { token: 'keyword.gcode', foreground: '0000FF', fontStyle: 'bold' },
    { token: 'keyword.mcode', foreground: 'FF0000', fontStyle: 'bold' },
    { token: 'identifier.gcode', foreground: '0066CC' },
    { token: 'identifier.mcode', foreground: 'CC0066' },
    { token: 'variable.axis', foreground: '008800' },
    { token: 'variable.feedrate', foreground: 'FF8800' },
    { token: 'variable.spindlespeed', foreground: 'FF00FF' },
    { token: 'variable.tool', foreground: '8800FF' },
    { token: 'variable.parameter', foreground: '006666' },
    { token: 'number', foreground: '098658' },
    { token: 'number.block', foreground: '666666', fontStyle: 'italic' },
    { token: 'number.program', foreground: '000080', fontStyle: 'bold' },
    { token: 'comment', foreground: '7CA668', fontStyle: 'italic' },
    { token: 'operator', foreground: '000000' },
  ],
  colors: {},
};

// Completion provider for IntelliSense
export function createCompletionProvider(
  monacoInstance: typeof monaco
): monaco.languages.CompletionItemProvider {
  return {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const suggestions: monaco.languages.CompletionItem[] = [];

      // Get the current line content up to the cursor
      const lineContent = model.getLineContent(position.lineNumber);
      const lineUntilCursor = lineContent.substring(0, position.column - 1);

      // Check if there's already a G-code or M-code on this line
      const gCodeMatch = lineUntilCursor.match(/G(\d+(\.\d+)?)/i);
      const mCodeMatch = lineUntilCursor.match(/M(\d+)/i);

      // If we have a G-code on the line, provide context-aware parameter suggestions
      if (gCodeMatch) {
        const gCodeNum = gCodeMatch[1];
        // Try multiple formats: G01, G1, G100 (with and without leading zero)
        const allGCodes = { ...G_CODES, ...MIKROPROG_EXTENSIONS } as Record<string, GCodeCommand>;
        const gCodeKeyPadded = `G${gCodeNum.includes('.') ? gCodeNum : gCodeNum.padStart(2, '0')}`;
        const gCodeKeyRaw = `G${gCodeNum}`;
        const gCode = allGCodes[gCodeKeyPadded] || allGCodes[gCodeKeyRaw];
        const gCodeKey = allGCodes[gCodeKeyPadded] ? gCodeKeyPadded : gCodeKeyRaw;

        if (gCode && gCode.parameters) {
          // Show only parameters relevant to this G-code
          for (const param of gCode.parameters) {
            const reqText = param.required ? '(povinný)' : '(volitelný)';
            suggestions.push({
              label: param.name,
              kind: monacoInstance.languages.CompletionItemKind.Variable,
              insertText: param.name,
              range,
              detail: `${param.description} ${reqText}`,
              documentation: {
                value: `**${param.name}** - ${param.description}\n\nPro: **${gCodeKey}** - ${gCode.description}`,
              },
              sortText: param.required ? '0' + param.name : '1' + param.name, // Required params first
            });
          }
          return { suggestions };
        }
      }

      // If we have an M-code on the line, provide context-aware parameter suggestions
      if (mCodeMatch) {
        const mCodeNum = mCodeMatch[1];
        const mCodeKey = `M${mCodeNum.toUpperCase().padStart(2, '0')}`;
        const mCode = M_CODES[mCodeKey];

        if (mCode && mCode.parameters) {
          // Show only parameters relevant to this M-code
          for (const param of mCode.parameters) {
            const reqText = param.required ? '(povinný)' : '(volitelný)';
            suggestions.push({
              label: param.name,
              kind: monacoInstance.languages.CompletionItemKind.Variable,
              insertText: param.name,
              range,
              detail: `${param.description} ${reqText}`,
              documentation: {
                value: `**${param.name}** - ${param.description}\n\nPro: **${mCodeKey}** - ${mCode.description}`,
              },
              sortText: param.required ? '0' + param.name : '1' + param.name,
            });
          }
          return { suggestions };
        }
      }

      // Add G-code suggestions
      for (const [code, info] of Object.entries({ ...G_CODES, ...MIKROPROG_EXTENSIONS })) {
        const gInfo = info as (typeof G_CODES)[keyof typeof G_CODES];
        let docValue = `**${code}** - ${gInfo.description}`;

        // Build parameter string for display (e.g., "X Y Z F")
        let paramDisplay = '';
        if (gInfo.parameters && gInfo.parameters.length > 0) {
          paramDisplay = gInfo.parameters.map((p) => p.name).join(' ');
          const paramLines = gInfo.parameters.map((p) => {
            const reqText = p.required ? '(povinný)' : '(volitelný)';
            return `- **${p.name}** ${reqText}: ${p.description}`;
          });
          docValue += `\n\n**Parametry:**\n${paramLines.join('\n')}`;
        }

        if (gInfo.example) {
          docValue += `\n\n**Příklad:**\n\`\`\`gcode\n${gInfo.example}\n\`\`\``;
        }

        suggestions.push({
          label: {
            label: code,
            detail: paramDisplay ? ` ${paramDisplay}` : '', // Parameters right after code
            description: gInfo.description, // Description on the far right
          },
          kind: monacoInstance.languages.CompletionItemKind.Function,
          documentation: { value: docValue },
          insertText: code,
          range,
        });
      }

      // Add M-code suggestions
      for (const [code, info] of Object.entries(M_CODES)) {
        let docValue = `**${code}** - ${info.description}`;

        // Build parameter string for display (e.g., "S" or "T")
        let paramDisplay = '';
        if (info.parameters && info.parameters.length > 0) {
          paramDisplay = info.parameters.map((p) => p.name).join(' ');
          const paramLines = info.parameters.map((p) => {
            const reqText = p.required ? '(povinný)' : '(volitelný)';
            return `- **${p.name}** ${reqText}: ${p.description}`;
          });
          docValue += `\n\n**Parametry:**\n${paramLines.join('\n')}`;
        }

        if (info.example) {
          docValue += `\n\n**Příklad:**\n\`\`\`gcode\n${info.example}\n\`\`\``;
        }

        suggestions.push({
          label: {
            label: code,
            detail: paramDisplay ? ` ${paramDisplay}` : '', // Parameters right after code
            description: info.description, // Description on the far right
          },
          kind: monacoInstance.languages.CompletionItemKind.Function,
          documentation: { value: docValue },
          insertText: code,
          range,
        });
      }

      // Add axis and parameter suggestions with detailed descriptions
      const axisParams = [
        { name: 'X', desc: 'Osa X - horizontální pohyb [mm]', doc: 'Horizontální pohyb v příčném směru. Používá se pro polohování nástroje.' },
        { name: 'Y', desc: 'Osa Y - horizontální pohyb [mm]', doc: 'Horizontální pohyb v podélném směru. Používá se pro polohování nástroje.' },
        { name: 'Z', desc: 'Osa Z - vertikální pohyb [mm]', doc: 'Vertikální pohyb (nahoru/dolů). Používá se pro hloubku řezu a bezpečné výšky.' },
        { name: 'A', desc: 'Rotační osa A [°]', doc: 'Rotace kolem osy X. Pro víceoosé obrábění.' },
        { name: 'B', desc: 'Rotační osa B [°]', doc: 'Rotace kolem osy Y. Pro víceoosé obrábění.' },
        { name: 'C', desc: 'Rotační osa C [°]', doc: 'Rotace kolem osy Z. Pro víceoosé obrábění.' },
        { name: 'I', desc: 'Vzdálenost středu oblouku v X [mm]', doc: 'Inkrementální vzdálenost středu oblouku od startovní pozice v ose X. Používá se s G02/G03.' },
        { name: 'J', desc: 'Vzdálenost středu oblouku v Y [mm]', doc: 'Inkrementální vzdálenost středu oblouku od startovní pozice v ose Y. Používá se s G02/G03.' },
        { name: 'K', desc: 'Vzdálenost středu oblouku v Z [mm]', doc: 'Inkrementální vzdálenost středu oblouku od startovní pozice v ose Z. Používá se s G02/G03.' },
        { name: 'R', desc: 'Poloměr oblouku nebo rovina návratu', doc: 'Poloměr oblouku [mm] pro G02/G03 (alternativa k I/J) nebo rovina návratu pro vrtací cykly G81-G84.' },
        { name: 'H', desc: 'Číslo korekce délky nástroje', doc: 'Číslo korekce délky (1-99). Odkazuje na tabulku korekcí nástrojů. Používá se s G43.' },
        { name: 'D', desc: 'Číslo korekce rádiusu nástroje', doc: 'Číslo korekce rádiusu (1-99). Odkazuje na tabulku korekcí nástrojů. Používá se s G41/G42.' },
        { name: 'P', desc: 'Časová prodleva nebo číslo podprogramu', doc: 'Časová prodleva [ms] pro G04/G82, nebo číslo podprogramu pro M98.' },
        { name: 'Q', desc: 'Hloubka záběru [mm]', doc: 'Hloubka jednoho záběru (peck) pro hluboké vrtání G83. Vrták se po každém záběru vrací nahoru.' },
        { name: 'L', desc: 'Počet opakování', doc: 'Počet provedení cyklu nebo podprogramu. Výchozí hodnota je 1.' },
      ];
      for (const param of axisParams) {
        suggestions.push({
          label: param.name,
          kind: monacoInstance.languages.CompletionItemKind.Variable,
          insertText: param.name,
          range,
          detail: param.desc,
          documentation: { value: `**${param.name}** - ${param.desc}\n\n${param.doc}` },
        });
      }

      // Add common parameters
      suggestions.push(
        {
          label: 'F',
          kind: monacoInstance.languages.CompletionItemKind.Variable,
          insertText: 'F',
          range,
          detail: 'Rychlost posuvu [mm/min] nebo [mm/ot]',
          documentation: { value: 'Definuje rychlost obrábění. V režimu G94 je v mm/min, v G95 v mm/ot.' },
        },
        {
          label: 'S',
          kind: monacoInstance.languages.CompletionItemKind.Variable,
          insertText: 'S',
          range,
          detail: 'Rychlost vřetena [ot/min]',
          documentation: { value: 'Nastavuje otáčky vřetena. Používá se s M03/M04.' },
        },
        {
          label: 'T',
          kind: monacoInstance.languages.CompletionItemKind.Variable,
          insertText: 'T',
          range,
          detail: 'Číslo nástroje (1-99)',
          documentation: { value: 'Identifikuje nástroj v zásobníku. Samotné T pouze vybere nástroj, pro výměnu použijte M06.' },
        },
        {
          label: 'M06',
          kind: monacoInstance.languages.CompletionItemKind.Snippet,
          insertText: 'M06 T${1:01}',
          insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
          detail: 'Výměna nástroje',
          documentation: { value: 'Provede automatickou výměnu nástroje na číslo uvedené v T.' },
        }
      );

      // Add user-defined snippets from snippets manager
      for (const snippet of SNIPPETS) {
        suggestions.push({
          label: {
            label: snippet.name,
            description: snippet.description,
          },
          kind: monacoInstance.languages.CompletionItemKind.Snippet,
          insertText: snippet.code,
          range,
          detail: snippet.description || 'Vlastní snippet',
          documentation: {
            value: `**${snippet.name}**${snippet.description ? ` - ${snippet.description}` : ''}\n\n\`\`\`gcode\n${snippet.code}\n\`\`\``,
          },
          sortText: `zzz${snippet.order.toString().padStart(3, '0')}`, // Sort after built-in suggestions
        });
      }

      return { suggestions };
    },
  };
}

// Hover provider for tooltips
export function createHoverProvider(): monaco.languages.HoverProvider {
  // Axis/parameter descriptions map
  const axisMap: Record<string, string> = {
    X: 'Osa X - horizontální pohyb v příčném směru [mm]',
    Y: 'Osa Y - horizontální pohyb v podélném směru [mm]',
    Z: 'Osa Z - vertikální pohyb (nahoru/dolů) [mm]',
    A: 'Rotační osa A - otáčení kolem osy X [°]',
    B: 'Rotační osa B - otáčení kolem osy Y [°]',
    C: 'Rotační osa C - otáčení kolem osy Z [°]',
    U: 'Sekundární osa U - paralelní k ose X [mm]',
    V: 'Sekundární osa V - paralelní k ose Y [mm]',
    W: 'Sekundární osa W - paralelní k ose Z [mm]',
    I: 'Inkrementální vzdálenost středu oblouku od startu v ose X [mm] (G02/G03)',
    J: 'Inkrementální vzdálenost středu oblouku od startu v ose Y [mm] (G02/G03)',
    K: 'Inkrementální vzdálenost středu oblouku od startu v ose Z [mm] (G02/G03)',
    R: 'Poloměr oblouku [mm] (G02/G03) nebo rovina návratu [mm] (vrtací cykly G81-G84)',
    F: 'Rychlost posuvu [mm/min] (G94) nebo [mm/ot] (G95) - určuje rychlost obrábění',
    S: 'Rychlost vřetena [ot/min] - otáčky vřetena pro M03/M04',
    T: 'Číslo nástroje (1-99) - identifikace nástroje v zásobníku',
    H: 'Číslo korekce délky nástroje (1-99) - používá se s G43 pro kompenzaci délky',
    D: 'Číslo korekce rádiusu nástroje (1-99) - používá se s G41/G42 pro kompenzaci rádiusu',
    P: 'Časová prodleva [ms] (G04, G82) nebo číslo podprogramu (M98)',
    Q: 'Hloubka jednoho záběru [mm] - používá se v cyklu hlubokého vrtání G83',
    N: 'Číslo bloku - volitelné označení řádku programu pro skoky a orientaci',
    O: 'Číslo programu/podprogramu - identifikace NC programu',
    L: 'Počet opakování - počet provedení cyklu nebo podprogramu',
  };

  return {
    provideHover: (model, position) => {
      const word = model.getWordAtPosition(position);
      if (!word) return null;

      const text = word.word.toUpperCase();

      // Check G-codes
      const gCode = { ...G_CODES, ...MIKROPROG_EXTENSIONS }[text] as
        | (typeof G_CODES)[keyof typeof G_CODES]
        | undefined;
      if (gCode) {
        const contents: monaco.IMarkdownString[] = [
          { value: `**${text}** - ${gCode.description}` },
        ];

        // Add parameters if available
        if (gCode.parameters && gCode.parameters.length > 0) {
          const paramLines = gCode.parameters.map((p) => {
            const reqText = p.required ? '(povinný)' : '(volitelný)';
            return `- **${p.name}** ${reqText}: ${p.description}`;
          });
          contents.push({ value: `\n**Parametry:**\n${paramLines.join('\n')}` });
        }

        // Add example
        if (gCode.example) {
          contents.push({ value: `\n**Příklad:**\n\`\`\`gcode\n${gCode.example}\n\`\`\`` });
        }

        return { contents };
      }

      // Check M-codes
      const mCode = M_CODES[text];
      if (mCode) {
        const contents: monaco.IMarkdownString[] = [
          { value: `**${text}** - ${mCode.description}` },
        ];

        // Add parameters if available
        if (mCode.parameters && mCode.parameters.length > 0) {
          const paramLines = mCode.parameters.map((p) => {
            const reqText = p.required ? '(povinný)' : '(volitelný)';
            return `- **${p.name}** ${reqText}: ${p.description}`;
          });
          contents.push({ value: `\n**Parametry:**\n${paramLines.join('\n')}` });
        }

        if (mCode.example) {
          contents.push({ value: `\n**Příklad:**\n\`\`\`gcode\n${mCode.example}\n\`\`\`` });
        }

        return { contents };
      }

      // Check for exact axis letter match
      if (axisMap[text]) {
        return {
          contents: [{ value: `**${text}** - ${axisMap[text]}` }],
        };
      }

      // Check for parameter with value (e.g., X100, Y50, H1, S1500)
      // Extract the first letter and check if it's a known parameter
      const paramMatch = text.match(/^([A-Z])([+-]?\d*\.?\d*)$/);
      if (paramMatch) {
        const letter = paramMatch[1];
        const value = paramMatch[2];
        if (axisMap[letter]) {
          return {
            contents: [
              { value: `**${letter}${value}** - ${axisMap[letter]}` },
              { value: `Hodnota: \`${value || '(prázdná)'}\`` },
            ],
          };
        }
      }

      return null;
    },
  };
}

// Create markers from validation issues
export function createMarkersFromValidation(
  monacoInstance: typeof monaco,
  model: monaco.editor.ITextModel,
  issues: ReturnType<GCodeValidator['validate']>
): monaco.editor.IMarkerData[] {
  const lineCount = model.getLineCount();
  return issues
    .filter((issue) => issue.line >= 1 && issue.line <= lineCount) // Filter invalid lines
    .map((issue) => ({
      severity:
        issue.severity === 'error'
          ? monacoInstance.MarkerSeverity.Error
          : issue.severity === 'warning'
            ? monacoInstance.MarkerSeverity.Warning
            : monacoInstance.MarkerSeverity.Info,
      startLineNumber: issue.line,
      startColumn: issue.column,
      endLineNumber: issue.line,
      endColumn: model.getLineMaxColumn(issue.line),
      message: issue.message,
      code: issue.code,
    }));
}

// Track if language is already registered to prevent duplicates
let isLanguageRegistered = false;

// Register G-code language with Monaco
export function registerGCodeLanguage(monacoInstance: typeof monaco): void {
  console.log('[monaco-config] registerGCodeLanguage started');

  // Prevent duplicate registration
  if (isLanguageRegistered) {
    console.log('[monaco-config] Language already registered, skipping');
    return;
  }

  // Register language
  console.log('[monaco-config] Registering language...');
  monacoInstance.languages.register({ id: GCODE_LANGUAGE_ID });
  isLanguageRegistered = true;

  // Set language configuration
  console.log('[monaco-config] Setting language configuration...');
  monacoInstance.languages.setLanguageConfiguration(GCODE_LANGUAGE_ID, {
    comments: {
      lineComment: ';',
      blockComment: ['(', ')'],
    },
    brackets: [['(', ')']],
    autoClosingPairs: [{ open: '(', close: ')' }],
  });

  // Set tokens provider
  console.log('[monaco-config] Setting tokens provider...');
  monacoInstance.languages.setMonarchTokensProvider(GCODE_LANGUAGE_ID, gcodeLanguage);

  // Define theme
  console.log('[monaco-config] Defining theme...');
  monacoInstance.editor.defineTheme('gcode-theme', gcodeTheme);

  // Register completion provider
  console.log('[monaco-config] Registering completion provider...');
  monacoInstance.languages.registerCompletionItemProvider(
    GCODE_LANGUAGE_ID,
    createCompletionProvider(monacoInstance)
  );

  // Register hover provider
  console.log('[monaco-config] Registering hover provider...');
  monacoInstance.languages.registerHoverProvider(GCODE_LANGUAGE_ID, createHoverProvider());

  // Register code validation
  console.log('[monaco-config] Setting up validation...');
  let validationTimeout: ReturnType<typeof setTimeout> | null = null;

  monacoInstance.editor.onDidCreateModel((model) => {
    console.log('[monaco-config] onDidCreateModel called, language:', model.getLanguageId());
    if (model.getLanguageId() === GCODE_LANGUAGE_ID) {
      console.log('[monaco-config] Setting up validation for G-code model');

      // Skip validation for very short content (loading placeholder)
      const shouldValidate = () => {
        const content = model.getValue();
        return content.length > 20 && !content.startsWith('; Načítání');
      };

      const validate = () => {
        console.log('[monaco-config] validate() called');
        if (!shouldValidate()) {
          console.log('[monaco-config] Skipping validation for placeholder content');
          return;
        }

        // Use setTimeout + requestAnimationFrame for maximum yielding
        setTimeout(() => {
          requestAnimationFrame(() => {
            console.log('[monaco-config] Validation requestAnimationFrame callback');
            try {
              console.log('[monaco-config] Parsing for validation...');
              const parser = new GCodeParser(model.getValue());
              const { ast, errors: parseErrors } = parser.parse();
              console.log('[monaco-config] Parsed, running validator...');

              const validator = new GCodeValidator();
              const validationIssues = validator.validate(ast);
              console.log('[monaco-config] Validation complete, issues:', validationIssues.length);

              // Combine parse errors and validation issues
              const allIssues = [
                ...parseErrors.map((e) => ({
                  message: e.message,
                  line: e.position.line,
                  column: e.position.column,
                  severity: e.severity,
                  code: 'PARSE_ERROR',
                })),
                ...validationIssues,
              ];

              const markers = createMarkersFromValidation(monacoInstance, model, allIssues);
              monacoInstance.editor.setModelMarkers(model, 'gcode-validator', markers);
              console.log('[monaco-config] Markers set');
            } catch (err) {
              console.error('[monaco-config] G-code validation error:', err);
            }
          });
        }, 100);
      };

      model.onDidChangeContent(() => {
        if (validationTimeout) {
          clearTimeout(validationTimeout);
        }
        validationTimeout = setTimeout(validate, 800);
      });

      // Initial validation - deferred longer
      console.log('[monaco-config] Scheduling initial validation in 1500ms');
      setTimeout(validate, 1500);
    }
  });
  console.log('[monaco-config] registerGCodeLanguage complete');
}

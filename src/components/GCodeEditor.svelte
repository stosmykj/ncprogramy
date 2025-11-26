<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type * as monaco from 'monaco-editor';
  import { registerGCodeLanguage, GCODE_LANGUAGE_ID } from '../lib/gcode/monaco-config';
  import { GCodeParser } from '../lib/gcode/parser';
  import { GCodeValidator } from '../lib/gcode/validator';
  import Icon from './Icon.svelte';

  let {
    code = $bindable(''),
    fileName = $bindable('untitled.nc'),
    onSave,
    onValidationErrors,
    readOnly = false,
    height = '600px',
  }: {
    code: string;
    fileName: string;
    onSave?: (code: string) => void;
    onValidationErrors?: (errors: Array<{ line: number; message: string; severity: 'error' | 'warning' | 'info' }>) => void;
    readOnly?: boolean;
    height?: string;
  } = $props();

  let editorContainer: HTMLDivElement;
  let editor: monaco.editor.IStandaloneCodeEditor | null = null;
  let monacoInstance: typeof monaco | null = null;
  let isLoading = $state(true);
  let isUpdatingFromCode = false; // Flag to prevent loops
  let errors = $state<
    Array<{ line: number; message: string; severity: 'error' | 'warning' | 'info' }>
  >([]);
  let currentLine = $state(1);
  let currentColumn = $state(1);
  let isModified = $state(false);
  let validationTimeout: ReturnType<typeof setTimeout> | null = null;
  let languageSwitchTimeout: ReturnType<typeof setTimeout> | null = null;

  // Debounced validation to prevent UI blocking
  function debouncedValidation(delay = 150): void {
    if (validationTimeout) {
      clearTimeout(validationTimeout);
    }
    validationTimeout = setTimeout(() => {
      validateCode();
    }, delay);
  }

  onMount(async () => {
    console.log('[GCodeEditor] onMount started');
    try {
      // Delay Monaco import to let UI render first
      console.log('[GCodeEditor] Waiting 100ms before Monaco import...');
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Dynamically import Monaco with proper worker setup for SvelteKit
      console.log('[GCodeEditor] Importing monaco-setup...');
      monacoInstance = (await import('../lib/gcode/monaco-setup')).default;
      console.log('[GCodeEditor] Monaco imported successfully');

      // Register G-code language
      console.log('[GCodeEditor] Registering G-code language...');
      registerGCodeLanguage(monacoInstance);
      console.log('[GCodeEditor] G-code language registered');

      // Use requestAnimationFrame to yield to browser before heavy editor creation
      console.log('[GCodeEditor] Scheduling editor creation via requestAnimationFrame...');
      requestAnimationFrame(() => {
        console.log('[GCodeEditor] requestAnimationFrame callback started');
        if (!monacoInstance || !editorContainer) {
          console.log('[GCodeEditor] Missing monacoInstance or editorContainer, aborting');
          return;
        }

        // Create editor with minimal features first to prevent blocking
        console.log('[GCodeEditor] Creating Monaco editor...');
        // Use plaintext initially to avoid heavy processing during load
        editor = monacoInstance.editor.create(editorContainer, {
          value: code,
          language: 'plaintext', // Start with plaintext, switch to gcode later
          theme: 'gcode-theme',
          automaticLayout: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 14,
          wordWrap: 'off',
          lineNumbers: 'on',
          renderLineHighlight: 'none', // Disable line highlight completely
          scrollbar: {
            vertical: 'auto',
            horizontal: 'auto',
          },
          readOnly,
          // Disable all features that might trigger heavy processing
          suggestOnTriggerCharacters: false,
          quickSuggestions: false,
          folding: false,
          contextmenu: false, // Disable context menu
          formatOnPaste: false,
          formatOnType: false,
          autoIndent: 'none',
          tabSize: 2,
          insertSpaces: true,
          renderValidationDecorations: 'off',
          glyphMargin: false,
          lineDecorationsWidth: 0,
          lineNumbersMinChars: 3,
          // Disable word-based features that use the worker
          wordBasedSuggestions: 'off',
          occurrencesHighlight: 'off',
          selectionHighlight: false,
          links: false,
          colorDecorators: false,
          // Disable bracket matching
          matchBrackets: 'never',
          // Simplify rendering
          renderWhitespace: 'none',
          guides: { indentation: false },
          cursorBlinking: 'solid',
          cursorSmoothCaretAnimation: 'off',
          smoothScrolling: false,
        });
        console.log('[GCodeEditor] Monaco editor created');

        // Handle content changes
        console.log('[GCodeEditor] Setting up event handlers...');
        editor.onDidChangeModelContent(() => {
          // Skip if we're programmatically updating from code prop
          if (isUpdatingFromCode) return;
          code = editor!.getValue();
          isModified = true;
          debouncedValidation();
        });

        // Handle cursor position changes
        editor.onDidChangeCursorPosition((e) => {
          currentLine = e.position.lineNumber;
          currentColumn = e.position.column;
        });

        // Add keyboard shortcuts
        editor.addCommand(monacoInstance!.KeyMod.CtrlCmd | monacoInstance!.KeyCode.KeyS, () => {
          handleSave();
        });

        // Format document shortcut
        editor.addCommand(
          monacoInstance!.KeyMod.CtrlCmd |
            monacoInstance!.KeyMod.Shift |
            monacoInstance!.KeyCode.KeyF,
          () => {
            editor?.getAction('editor.action.formatDocument')?.run();
          }
        );

        // Toggle comment shortcut
        editor.addCommand(monacoInstance!.KeyMod.CtrlCmd | monacoInstance!.KeyCode.Slash, () => {
          editor?.getAction('editor.action.commentLine')?.run();
        });
        console.log('[GCodeEditor] Event handlers set up');

        // Initial validation - deferred to allow UI to render first
        console.log('[GCodeEditor] Setting isLoading = false');
        isLoading = false;
        console.log('[GCodeEditor] Setup complete');

        // Switch to gcode language after a delay to avoid blocking
        console.log('[GCodeEditor] Scheduling language switch to gcode...');
        languageSwitchTimeout = setTimeout(() => {
          if (editor && monacoInstance) {
            console.log('[GCodeEditor] Switching to gcode language...');
            const model = editor.getModel();
            if (model) {
              monacoInstance.editor.setModelLanguage(model, GCODE_LANGUAGE_ID);
              console.log('[GCodeEditor] Language switched to gcode');
              // Now schedule validation
              debouncedValidation(500);
            }
          }
        }, 1500);
      });
    } catch (error) {
      console.error('[GCodeEditor] Failed to load Monaco Editor:', error);
      isLoading = false;
    }
  });

  onDestroy(() => {
    if (validationTimeout) {
      clearTimeout(validationTimeout);
    }
    if (languageSwitchTimeout) {
      clearTimeout(languageSwitchTimeout);
    }
    editor?.dispose();
  });

  function validateCode(): void {
    if (!editor || !monacoInstance) return;

    // Skip validation for placeholder content
    if (code.length < 20 || code.startsWith('; Načítání')) {
      errors = [];
      return;
    }

    const parser = new GCodeParser(code);
    const { ast, errors: parseErrors } = parser.parse();

    const validator = new GCodeValidator();
    const validationIssues = validator.validate(ast);

    // Combine and format errors
    errors = [
      ...parseErrors.map((e) => ({
        line: e.position.line,
        message: e.message,
        severity: e.severity,
      })),
      ...validationIssues.map((v) => ({
        line: v.line,
        message: v.message,
        severity: v.severity,
      })),
    ];

    // Set markers in editor
    const model = editor.getModel();
    if (model) {
      const lineCount = model.getLineCount();
      const markers = errors
        .filter((err) => err.line >= 1 && err.line <= lineCount) // Filter out invalid line numbers
        .map((err) => ({
          severity:
            err.severity === 'error'
              ? monacoInstance!.MarkerSeverity.Error
              : err.severity === 'warning'
                ? monacoInstance!.MarkerSeverity.Warning
                : monacoInstance!.MarkerSeverity.Info,
          startLineNumber: err.line,
          startColumn: 1,
          endLineNumber: err.line,
          endColumn: model.getLineMaxColumn(err.line),
          message: err.message,
        }));

      monacoInstance!.editor.setModelMarkers(model, 'gcode-validator', markers);
    }
  }

  function handleSave(): void {
    if (onSave && isModified) {
      onSave(code);
      isModified = false;
    }
  }

  function insertSnippet(snippet: string): void {
    if (!editor) return;

    const position = editor.getPosition();
    if (position) {
      editor.executeEdits('insert-snippet', [
        {
          range: {
            startLineNumber: position.lineNumber,
            startColumn: position.column,
            endLineNumber: position.lineNumber,
            endColumn: position.column,
          },
          text: snippet,
          forceMoveMarkers: true,
        },
      ]);
      editor.focus();
    }
  }

  function goToLine(): void {
    if (!editor) return;

    const lineNumber = prompt('Přejít na řádek:');
    if (lineNumber) {
      const line = parseInt(lineNumber);
      if (!isNaN(line)) {
        editor.revealLineInCenter(line);
        editor.setPosition({ lineNumber: line, column: 1 });
        editor.focus();
      }
    }
  }

  function toggleFullscreen(): void {
    const elem = editorContainer;
    if (!document.fullscreenElement) {
      elem.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  export function focus(): void {
    editor?.focus();
  }

  $effect(() => {
    // Track code changes and update editor
    const currentCode = code;
    if (editor) {
      const editorValue = editor.getValue();
      if (currentCode !== editorValue) {
        // Set flag to prevent loop with onDidChangeModelContent
        isUpdatingFromCode = true;
        try {
          editor.setValue(currentCode);
        } finally {
          isUpdatingFromCode = false;
        }
      }
    }
  });

  // Notify parent when validation errors change
  $effect(() => {
    onValidationErrors?.(errors);
  });
</script>

<div class="gcode-editor">
  <div class="editor-toolbar">
    <div class="toolbar-left">
      <span class="filename">
        <Icon name="mdiFileDocumentOutline" size={16} />
        {fileName}
        {#if isModified}
          <span class="modified-indicator">*</span>
        {/if}
      </span>
      <span class="position">
        Řádek {currentLine}, Sloupec {currentColumn}
      </span>
    </div>

    <div class="toolbar-actions">
      <div class="action-group">
        <button
          type="button"
          class="toolbar-btn"
          onclick={handleSave}
          disabled={!isModified || readOnly}
          title="Uložit (Ctrl+S)"
        >
          <Icon name="mdiContentSave" size={18} />
        </button>

        <button
          type="button"
          class="toolbar-btn"
          onclick={() => editor?.trigger('', 'undo', null)}
          disabled={readOnly}
          title="Zpět (Ctrl+Z)"
        >
          <Icon name="mdiUndo" size={18} />
        </button>

        <button
          type="button"
          class="toolbar-btn"
          onclick={() => editor?.trigger('', 'redo', null)}
          disabled={readOnly}
          title="Znovu (Ctrl+Y)"
        >
          <Icon name="mdiRedo" size={18} />
        </button>
      </div>

      <div class="action-group">
        <button
          type="button"
          class="toolbar-btn"
          onclick={() => editor?.trigger('', 'editor.action.formatDocument', null)}
          title="Formátovat dokument (Ctrl+Shift+F)"
        >
          <Icon name="mdiFormatAlignLeft" size={18} />
        </button>

        <button
          type="button"
          class="toolbar-btn"
          onclick={() => editor?.trigger('', 'editor.action.commentLine', null)}
          disabled={readOnly}
          title="Komentovat řádek (Ctrl+/)"
        >
          <Icon name="mdiCommentOutline" size={18} />
        </button>

        <button
          type="button"
          class="toolbar-btn"
          onclick={goToLine}
          title="Přejít na řádek (Ctrl+G)"
        >
          <Icon name="mdiArrowExpandDown" size={18} />
        </button>
      </div>

      <div class="action-group">
        <button type="button" class="toolbar-btn" onclick={toggleFullscreen} title="Celá obrazovka">
          <Icon name="mdiFullscreen" size={18} />
        </button>
      </div>

      <div class="action-group snippets">
        <button
          type="button"
          class="snippet-btn"
          onclick={() => insertSnippet('G00 X0 Y0 Z0')}
          disabled={readOnly}
          title="Rychloposuv"
        >
          G00
        </button>
        <button
          type="button"
          class="snippet-btn"
          onclick={() => insertSnippet('G01 X10 Y10 F300')}
          disabled={readOnly}
          title="Lineární interpolace"
        >
          G01
        </button>
        <button
          type="button"
          class="snippet-btn"
          onclick={() => insertSnippet('M06 T01')}
          disabled={readOnly}
          title="Výměna nástroje"
        >
          M06
        </button>
        <button
          type="button"
          class="snippet-btn"
          onclick={() => insertSnippet('G81 X0 Y0 Z-10 R2 F100')}
          disabled={readOnly}
          title="Vrtací cyklus"
        >
          G81
        </button>
      </div>
    </div>
  </div>

  <div class="editor-content" style="height: {height}">
    {#if isLoading}
      <div class="loading">
        <Icon name="mdiLoading" size={32} spin />
        <p>Načítání editoru...</p>
      </div>
    {/if}
    <div bind:this={editorContainer} class="monaco-container"></div>
  </div>
</div>

<style lang="scss">
  .gcode-editor {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #fff;
    border: 1px solid #dfe3e8;
    border-radius: 6px;
    overflow: hidden;
  }

  .editor-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: #f8f9fa;
    border-bottom: 1px solid #dfe3e8;

    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 16px;
      color: #333;
      font-size: 13px;

      .filename {
        display: flex;
        align-items: center;
        gap: 6px;
        font-weight: 500;
        color: #285597;

        .modified-indicator {
          color: #ff9800;
          font-size: 16px;
        }
      }

      .position {
        color: #666;
      }
    }

    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 12px;

      .action-group {
        display: flex;
        gap: 4px;
        padding: 0 8px;
        border-right: 1px solid #dfe3e8;

        &:last-child {
          border-right: none;
        }

        &.snippets {
          gap: 6px;
        }
      }

      .toolbar-btn,
      .snippet-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 4px 8px;
        background: transparent;
        border: 1px solid transparent;
        border-radius: 4px;
        color: #666;
        cursor: pointer;
        transition: all 0.15s ease;
        position: relative;

        &:hover:not(:disabled) {
          background: #e3f2fd;
          border-color: #285597;
          color: #285597;
        }

        &:active:not(:disabled) {
          transform: scale(0.95);
        }

        &.active {
          background: #285597;
          border-color: #285597;
          color: #fff;
        }

        &:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
      }

      .snippet-btn {
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 11px;
        font-weight: bold;
        padding: 4px 10px;
        background: #285597;
        border-color: #285597;
        color: #fff;

        &:hover:not(:disabled) {
          background: #1e3f6f;
          border-color: #1e3f6f;
        }
      }
    }
  }

  .editor-content {
    position: relative;
    flex: 1;
    min-height: 0;
    height: 100%;

    // Center line numbers in Monaco editor
    :global(.monaco-editor .lines-content .view-lines) {
      padding-left: 5px;
    }
    :global(.monaco-editor .margin-view-overlays .line-numbers) {
      text-align: center;
      padding-right: 0;
    }

    .loading {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      color: #666;
    }

    .monaco-container {
      width: 100%;
      height: 100%;
    }
  }

  :global(.gcode-editor .loading svg) {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
</style>

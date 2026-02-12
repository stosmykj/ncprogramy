<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type * as monaco from 'monaco-editor';
  import { registerGCodeLanguage, GCODE_LANGUAGE_ID } from '../lib/gcode/monaco-config';
  import { GCodeParser } from '../lib/gcode/parser';
  import { GCodeValidator } from '../lib/gcode/validator';
  import { SETTINGS_VARS } from '../lib/settingsProcessor.svelte';
  import { logger } from '../lib/logger';
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
  let editorWrapper: HTMLDivElement;
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
    logger.debug('[GCodeEditor] onMount started');
    try {
      // Delay Monaco import to let UI render first
      logger.debug('[GCodeEditor] Waiting 100ms before Monaco import...');
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Dynamically import Monaco with proper worker setup for SvelteKit
      logger.debug('[GCodeEditor] Importing monaco-setup...');
      monacoInstance = (await import('../lib/gcode/monaco-setup')).default;
      logger.debug('[GCodeEditor] Monaco imported successfully');

      // Register G-code language
      logger.debug('[GCodeEditor] Registering G-code language...');
      registerGCodeLanguage(monacoInstance);
      logger.debug('[GCodeEditor] G-code language registered');

      // Use requestAnimationFrame to yield to browser before heavy editor creation
      logger.debug('[GCodeEditor] Scheduling editor creation via requestAnimationFrame...');
      requestAnimationFrame(() => {
        logger.debug('[GCodeEditor] requestAnimationFrame callback started');
        if (!monacoInstance || !editorContainer) {
          logger.debug('[GCodeEditor] Missing monacoInstance or editorContainer, aborting');
          return;
        }

        // Create editor with minimal features first to prevent blocking
        logger.debug('[GCodeEditor] Creating Monaco editor...');
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
        logger.debug('[GCodeEditor] Monaco editor created');

        // Handle content changes
        logger.debug('[GCodeEditor] Setting up event handlers...');
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
        logger.debug('[GCodeEditor] Event handlers set up');

        // Initial validation - deferred to allow UI to render first
        logger.debug('[GCodeEditor] Setting isLoading = false');
        isLoading = false;
        logger.debug('[GCodeEditor] Setup complete');

        // Switch to gcode language after a delay to avoid blocking
        logger.debug('[GCodeEditor] Scheduling language switch to gcode...');
        languageSwitchTimeout = setTimeout(() => {
          if (editor && monacoInstance) {
            logger.debug('[GCodeEditor] Switching to gcode language...');
            const model = editor.getModel();
            if (model) {
              monacoInstance.editor.setModelLanguage(model, GCODE_LANGUAGE_ID);
              logger.debug('[GCodeEditor] Language switched to gcode');
              // Now schedule validation
              debouncedValidation(500);
            }
          }
        }, 1500);
      });
    } catch (error) {
      logger.error('[GCodeEditor] Failed to load Monaco Editor:', error);
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

  async function toggleFullscreen(): Promise<void> {
    if (!editorWrapper) return;
    try {
      if (!document.fullscreenElement) {
        await editorWrapper.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
      // Resize Monaco editor to fit new dimensions
      setTimeout(() => editor?.layout(), 100);
    } catch (error) {
      logger.warn('Fullscreen not available', error);
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

  // React to zoom level changes
  const BASE_FONT_SIZE = 14;
  $effect(() => {
    const zoomLevel = SETTINGS_VARS.textZoomLevel;
    if (editor) {
      const scaledFontSize = Math.round(BASE_FONT_SIZE * (zoomLevel / 100));
      editor.updateOptions({ fontSize: scaledFontSize });
    }
  });
</script>

<div bind:this={editorWrapper} class="gcode-editor">
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

      <div class="action-group">
        <button
          type="button"
          class="toolbar-btn"
          onclick={() => (SETTINGS_VARS.snippetsManagerOpened = true)}
          title="Spravovat snippety (dostupné v nabídce pomocí Ctrl+Space)"
        >
          <Icon name="mdiFileCodeOutline" size={18} />
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
    background: var(--color-bg);
    border: 1px solid var(--color-border-light);
    border-radius: var(--radius-md);

    &:fullscreen {
      .editor-content {
        height: 100% !important;
        flex: 1;
      }
    }
    overflow: hidden;
  }

  .editor-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-4) var(--space-6);
    background: var(--color-bg-subtle);
    border-bottom: 1px solid var(--color-border-light);

    .toolbar-left {
      display: flex;
      align-items: center;
      gap: var(--space-8);
      color: var(--color-text);
      font-size: var(--font-size-sm);

      .filename {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        font-weight: 500;
        color: var(--color-primary);

        .modified-indicator {
          color: var(--color-warning);
          font-size: var(--font-size-md);
        }
      }

      .position {
        color: var(--color-text-secondary);
      }
    }

    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: var(--space-6);

      .action-group {
        display: flex;
        gap: var(--space-2);
        padding: 0 var(--space-4);
        border-right: 1px solid var(--color-border-light);

        &:last-child {
          border-right: none;
        }
      }

      .toolbar-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: var(--space-2) var(--space-4);
        background: transparent;
        border: 1px solid transparent;
        border-radius: var(--radius-sm);
        color: var(--color-text-secondary);
        cursor: pointer;
        transition: all var(--transition-base);
        position: relative;

        &:hover:not(:disabled) {
          background: var(--color-primary-light);
          border-color: var(--color-primary);
          color: var(--color-primary);
        }

        &:active:not(:disabled) {
          transform: scale(0.95);
        }

        &:disabled {
          opacity: 0.4;
          cursor: not-allowed;
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
      padding-left: var(--space-3);
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
      gap: var(--space-6);
      color: var(--color-text-secondary);
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

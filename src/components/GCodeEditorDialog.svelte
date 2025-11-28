<script lang="ts">
  import { untrack } from 'svelte';
  import { SETTINGS_VARS } from '$lib/settingsProcessor.svelte';
  import Icon from './Icon.svelte';
  import Button from './Button.svelte';
  import { open, save } from '@tauri-apps/plugin-dialog';
  import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
  import { sendNotification } from '@tauri-apps/plugin-notification';

  // Lazy load heavy components
  let GCodeEditor: typeof import('./GCodeEditor.svelte').default | null = $state(null);
  let GCodePreview: typeof import('./GCodePreview.svelte').default | null = $state(null);
  let componentsLoaded = $state(false);
  let loadError = $state<string | null>(null);
  let loadingStatus = $state('Příprava...');

  function getDefaultExampleCode(): string {
    // Use a shorter example to reduce initial parsing load
    return `; NC Program - Ukázka
; Datum: ${new Date().toISOString().split('T')[0]}

G21 ; mm
G90 ; absolutní
G17 ; rovina XY
G54 ; souřadný systém

M06 T01
M03 S1500
M08

G00 X10 Y10
G01 Z-5 F100
G01 X50 F300
G01 Y50
G01 X10
G01 Y10
G00 Z10

M09
M05
M30`;
  }

  async function loadComponents() {
    console.log('[GCodeEditorDialog] loadComponents called, componentsLoaded:', componentsLoaded);
    if (componentsLoaded) {
      console.log('[GCodeEditorDialog] Components already loaded, skipping');
      return;
    }
    loadError = null;

    try {
      loadingStatus = 'Načítání G-code editoru...';
      console.log('[GCodeEditorDialog] Loading GCodeEditor module...');
      const editorModule = await import('./GCodeEditor.svelte');
      console.log('[GCodeEditorDialog] GCodeEditor module imported');
      GCodeEditor = editorModule.default;
      console.log('[GCodeEditorDialog] GCodeEditor assigned');

      loadingStatus = 'Načítání náhledu...';
      console.log('[GCodeEditorDialog] Loading GCodePreview module...');
      const previewModule = await import('./GCodePreview.svelte');
      console.log('[GCodeEditorDialog] GCodePreview module imported');
      GCodePreview = previewModule.default;
      console.log('[GCodeEditorDialog] GCodePreview assigned');

      loadingStatus = 'Hotovo';
      console.log('[GCodeEditorDialog] Setting componentsLoaded = true');
      componentsLoaded = true;
      console.log('[GCodeEditorDialog] All components loaded successfully');

      // Check if there's an external file to load
      const externalFile = SETTINGS_VARS.gcodeEditorFile;
      if (externalFile) {
        console.log('[GCodeEditorDialog] External file provided, loading:', externalFile.Path);
        await loadExternalFile();
      } else {
        // Load full example code AFTER components are ready with a delay
        // to prevent UI blocking - use requestIdleCallback for best scheduling
        console.log('[GCodeEditorDialog] Scheduling full example code load...');
        const loadCode = () => {
          console.log('[GCodeEditorDialog] Loading full example code');
          code = getDefaultExampleCode();
          console.log('[GCodeEditorDialog] Full example code set');
        };

        // Use requestIdleCallback if available, otherwise fall back to setTimeout
        if ('requestIdleCallback' in window) {
          console.log('[GCodeEditorDialog] Using requestIdleCallback');
          setTimeout(() => {
            (window as Window & { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(loadCode);
          }, 1000);
        } else {
          console.log('[GCodeEditorDialog] Using setTimeout fallback');
          setTimeout(loadCode, 1500);
        }
      }
    } catch (err) {
      console.error('[GCodeEditorDialog] Failed to load components:', err);
      loadError = err instanceof Error ? err.message : 'Nepodařilo se načíst editor';
    }
  }

  $effect(() => {
    // Only track gcodeEditorOpened - use untrack for other values to prevent unnecessary re-runs
    if (SETTINGS_VARS.gcodeEditorOpened) {
      const loaded = untrack(() => componentsLoaded);
      const error = untrack(() => loadError);
      console.log('[GCodeEditorDialog] $effect triggered, gcodeEditorOpened: true, componentsLoaded:', loaded, 'loadError:', error);
      if (!loaded && !error) {
        console.log('[GCodeEditorDialog] Triggering loadComponents');
        loadComponents();
      } else if (loaded) {
        // Components already loaded, check if we need to load an external file
        const externalFile = SETTINGS_VARS.gcodeEditorFile;
        if (externalFile) {
          console.log('[GCodeEditorDialog] Components already loaded, loading external file:', externalFile.Path);
          loadExternalFile();
        } else {
          // Reset to default state for new file
          code = getDefaultExampleCode();
          fileName = 'untitled.nc';
          currentFilePath = null;
          isSaved = true;
          isExternalFile = false;
        }
      }
    }
  });

  // Focus the editor after components are loaded
  $effect(() => {
    if (componentsLoaded && gcodeEditorRef) {
      // Delay focus to allow Monaco editor to fully initialize
      setTimeout(() => {
        gcodeEditorRef?.focus();
      }, 500);
    }
  });

  // Start with minimal code to prevent UI blocking during initial load
  let code = $state('; Načítání...');

  let fileName = $state('untitled.nc');
  let currentFilePath = $state<string | null>(null);
  let isSaved = $state(true);
  let showPreview = $state(true);
  let splitView = $state<'horizontal' | 'vertical'>('vertical');
  let previewError = $state<string | null>(null);
  let validationErrors = $state<Array<{ line: number; message: string; severity: 'error' | 'warning' | 'info' }>>([]);
  let isExternalFile = $state(false);
  let gcodeEditorRef: { focus: () => void } | null = $state(null);

  async function loadExternalFile(): Promise<void> {
    const externalFile = SETTINGS_VARS.gcodeEditorFile;
    if (!externalFile) return;

    try {
      // The file path is already absolute (from storage or original location)
      const filePath = externalFile.Path;
      console.log('[GCodeEditorDialog] Loading external file from:', filePath);

      const content = await readTextFile(filePath);
      code = content;
      currentFilePath = filePath;
      fileName = externalFile.Name;
      isSaved = true;
      isExternalFile = true;

      console.log('[GCodeEditorDialog] External file loaded successfully');
    } catch (error) {
      console.error('[GCodeEditorDialog] Error loading external file:', error);
      // Fall back to default example code
      code = getDefaultExampleCode();
      fileName = 'untitled.nc';
      currentFilePath = null;
      isExternalFile = false;

      await sendNotification({
        title: 'Chyba',
        body: 'Nepodařilo se načíst G-code soubor',
      });
    }
  }

  function handlePreviewError(error: string | null): void {
    previewError = error;
  }

  function handleValidationErrors(errors: Array<{ line: number; message: string; severity: 'error' | 'warning' | 'info' }>): void {
    validationErrors = errors;
  }

  async function copyErrors(): Promise<void> {
    const errorText = validationErrors
      .map(e => `Řádek ${e.line}: ${e.message}`)
      .join('\n');
    if (errorText) {
      await navigator.clipboard.writeText(errorText);
    }
  }

  const examplePrograms = [
    {
      name: 'Čtverec s dírami',
      code: `; Čtverec s dírami
G21 G90 G17 G54
M06 T01
G43 H01 Z50
M03 S1500
M08
G00 X10 Y10
G01 Z-5 F100
G01 X60 Y10 F300
G01 X60 Y60
G01 X10 Y60
G01 X10 Y10
G00 Z5
G81 X20 Y20 Z-10 R2 F80
X40 Y20
X40 Y40
X20 Y40
G80
M09
M05
G28 G91 Z0
G90
M30`,
    },
    {
      name: 'Kruhová kapsa',
      code: `; Kruhová kapsa
G21 G90 G17 G54
M06 T02
G43 H02 Z50
M03 S2000
M08
G00 X50 Y50
G00 Z2
G01 Z-5 F100
G02 X60 Y50 I5 J0 F200
G02 X50 Y50 I-5 J0
G00 Z25
M09
M05
G28 G91 Z0
G90
M30`,
    },
    {
      name: 'Kontura s oblouky',
      code: `; Kontura s oblouky
G21 G90 G17 G54
M06 T03
G43 H03 Z50
M03 S1800
M08
G00 X10 Y10
G01 Z-3 F100
G01 X40 Y10 F250
G03 X50 Y20 I0 J10
G01 Y40
G02 X40 Y50 I-10 J0
G01 X10
G01 Y10
G00 Z25
M09
M05
G28 G91 Z0
G90
M30`,
    },
    {
      name: 'Text gravírování',
      code: `; Gravírování textu "NC"
G21 G90 G17 G54
M06 T04
G43 H04 Z50
M03 S3000
M08
; Písmeno N
G00 X10 Y10
G01 Z-0.5 F50
G01 Y30 F150
G01 X20 Y10
G01 Y30
G00 Z2
; Písmeno C
G00 X30 Y30
G01 Z-0.5 F50
G03 X30 Y10 I0 J-10 F150
G00 Z25
M09
M05
G28 G91 Z0
G90
M30`,
    },
  ];

  async function openFile(): Promise<void> {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: 'G-code soubory',
            extensions: ['nc', 'cnc', 'gcode', 'ngc', 'tap', 'txt'],
          },
        ],
        directory: false,
      });

      if (selected) {
        const content = await readTextFile(selected);
        code = content;
        currentFilePath = selected;
        fileName = selected.split(/[\\/]/).pop() || 'untitled.nc';
        isSaved = true;

        await sendNotification({
          title: 'Soubor otevřen',
          body: `Soubor ${fileName} byl úspěšně načten`,
        });
      }
    } catch (error) {
      console.error('Chyba při otevírání souboru:', error);
      await sendNotification({
        title: 'Chyba',
        body: 'Nepodařilo se otevřít soubor',
      });
    }
  }

  async function saveFile(): Promise<void> {
    try {
      if (currentFilePath) {
        await writeTextFile(currentFilePath, code);
        isSaved = true;

        await sendNotification({
          title: 'Soubor uložen',
          body: `Soubor ${fileName} byl úspěšně uložen`,
        });
      } else {
        await saveFileAs();
      }
    } catch (error) {
      console.error('Chyba při ukládání souboru:', error);
      await sendNotification({
        title: 'Chyba',
        body: 'Nepodařilo se uložit soubor',
      });
    }
  }

  async function saveFileAs(): Promise<void> {
    try {
      const filePath = await save({
        defaultPath: fileName,
        filters: [
          {
            name: 'G-code soubory',
            extensions: ['nc', 'cnc', 'gcode', 'ngc', 'tap', 'txt'],
          },
        ],
      });

      if (filePath) {
        await writeTextFile(filePath, code);
        currentFilePath = filePath;
        fileName = filePath.split(/[\\/]/).pop() || 'untitled.nc';
        isSaved = true;

        await sendNotification({
          title: 'Soubor uložen',
          body: `Soubor ${fileName} byl úspěšně uložen`,
        });
      }
    } catch (error) {
      console.error('Chyba při ukládání souboru:', error);
      await sendNotification({
        title: 'Chyba',
        body: 'Nepodařilo se uložit soubor',
      });
    }
  }

  function newFile(): void {
    if (!isSaved && code.trim()) {
      if (!confirm('Máte neuložené změny. Chcete pokračovat?')) {
        return;
      }
    }

    code = `; Nový NC program
; Datum: ${new Date().toISOString().split('T')[0]}

G21 ; mm
G90 ; absolutní
G17 ; rovina XY
G54 ; souřadný systém

; Zde začněte psát váš program

M30 ; konec programu`;
    fileName = 'untitled.nc';
    currentFilePath = null;
    isSaved = true;
  }

  function loadExample(example: (typeof examplePrograms)[0]): void {
    code = example.code;
    fileName = `${example.name.toLowerCase().replace(/\s+/g, '-')}.nc`;
    currentFilePath = null;
    isSaved = false;
  }

  function handleCodeChange(newCode: string): void {
    code = newCode;
    isSaved = false;
  }

  function toggleSplitView(): void {
    splitView = splitView === 'horizontal' ? 'vertical' : 'horizontal';
  }

  function close(): void {
    SETTINGS_VARS.gcodeEditorOpened = false;
    // Clear external file state
    SETTINGS_VARS.gcodeEditorFile = null;
    SETTINGS_VARS.gcodeEditorProgramId = null;
    SETTINGS_VARS.gcodeEditorColumnKey = null;
    isExternalFile = false;
  }

  // Click outside handling removed - dialog should only close via close button

  $effect(() => {
    if (SETTINGS_VARS.gcodeEditorOpened) {
      const handleKeydown = (event: KeyboardEvent) => {
        // ESC key handling removed - dialog should only close via close button
        if (event.ctrlKey || event.metaKey) {
          switch (event.key) {
            case 'n':
              event.preventDefault();
              newFile();
              break;
            case 'o':
              event.preventDefault();
              openFile();
              break;
            case 's':
              event.preventDefault();
              if (event.shiftKey) {
                saveFileAs();
              } else {
                saveFile();
              }
              break;
          }
        }
      };
      window.addEventListener('keydown', handleKeydown, true);
      return () => {
        window.removeEventListener('keydown', handleKeydown, true);
      };
    }
  });
</script>

{#if SETTINGS_VARS.gcodeEditorOpened}
  <div
    class="dialog-backdrop"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <div class="dialog-content">
      <div class="dialog-header">
        <div class="header-left">
          <Icon name="mdiFileCodeOutline" size={20} />
          <span class="title">G-code Editor</span>
          <span class="subtitle">Editor s IntelliSense a validací pro MIKROPROG FCM 28</span>
        </div>
        <div class="header-actions">
          <button type="button" class="btn btn-icon" onclick={newFile} title="Nový soubor (Ctrl+N)">
            <Icon name="mdiFilePlus" size={16} />
          </button>
          <button
            type="button"
            class="btn btn-icon"
            onclick={openFile}
            title="Otevřít soubor (Ctrl+O)"
          >
            <Icon name="mdiFolderOpen" size={16} />
          </button>
          <button type="button" class="btn btn-icon" onclick={saveFile} title="Uložit (Ctrl+S)">
            <Icon name="mdiContentSave" size={16} />
          </button>
          <button
            type="button"
            class="btn btn-icon"
            onclick={saveFileAs}
            title="Uložit jako... (Ctrl+Shift+S)"
          >
            <Icon name="mdiContentSaveAll" size={16} />
          </button>

          <div class="separator"></div>

          <button
            type="button"
            class="btn btn-icon"
            class:active={showPreview}
            onclick={() => (showPreview = !showPreview)}
            title="Zobrazit/skrýt náhled"
          >
            <Icon name={showPreview ? 'mdiEyeOutline' : 'mdiEyeOffOutline'} size={16} />
          </button>

          {#if showPreview}
            <button
              type="button"
              class="btn btn-icon"
              onclick={toggleSplitView}
              title="Přepnout orientaci"
            >
              <Icon
                name={splitView === 'horizontal'
                  ? 'mdiArrowSplitVertical'
                  : 'mdiArrowSplitHorizontal'}
                size={16}
              />
            </button>
          {/if}

          <div class="separator"></div>

          <Button icon="mdiClose" onClick={close} onlyIcon />
        </div>
      </div>

      <div class="examples-bar">
        <span class="examples-label">Příklady:</span>
        {#each examplePrograms as example}
          <button type="button" class="example-btn" onclick={() => loadExample(example)}>
            {example.name}
          </button>
        {/each}
      </div>

      <div
        class="dialog-body"
        class:split={showPreview}
        class:horizontal={splitView === 'horizontal'}
        class:vertical={splitView === 'vertical'}
      >
        {#if componentsLoaded && GCodeEditor && GCodePreview}
          <div class="editor-pane">
            <GCodeEditor
              bind:this={gcodeEditorRef}
              bind:code
              bind:fileName
              onSave={handleCodeChange}
              onValidationErrors={handleValidationErrors}
              height={showPreview && splitView === 'horizontal' ? '350px' : '100%'}
            />
            {#if validationErrors.length > 0 || previewError}
              <div class="error-card">
                <div class="error-header">
                  <span class="error-title">Problémy ({validationErrors.length + (previewError ? 1 : 0)})</span>
                  <button type="button" class="copy-btn" onclick={copyErrors} title="Kopírovat chyby">
                    <Icon name="mdiContentCopy" size={16} />
                  </button>
                </div>
                <div class="error-list">
                  {#if previewError}
                    <div class="error-item error">
                      <Icon name="mdiAlertCircle" size={16} color="#dc3545" />
                      <span class="line-num">Náhled:</span>
                      <span class="error-msg">{previewError}</span>
                    </div>
                  {/if}
                  {#each validationErrors.slice(0, 10) as error}
                    <div class="error-item {error.severity}">
                      <Icon
                        name={error.severity === 'error' ? 'mdiAlertCircle' : error.severity === 'warning' ? 'mdiAlert' : 'mdiInformation'}
                        size={16}
                        color={error.severity === 'error' ? '#dc3545' : error.severity === 'warning' ? '#ffc107' : '#17a2b8'}
                      />
                      <span class="line-num">Řádek {error.line}:</span>
                      <span class="error-msg">{error.message}</span>
                    </div>
                  {/each}
                  {#if validationErrors.length > 10}
                    <div class="error-more">... a {validationErrors.length - 10} dalších</div>
                  {/if}
                </div>
              </div>
            {/if}
          </div>

          {#if showPreview}
            <div class="preview-pane">
              <div class="preview-header">
                <h3>
                  <Icon name="mdiVectorPolyline" size={16} />
                  Vizualizace dráhy nástroje
                </h3>
              </div>
              <GCodePreview
                {code}
                height={splitView === 'horizontal' ? '320px' : 'calc(100% - 2.5rem)'}
                showStats={true}
                onError={handlePreviewError}
              />
            </div>
          {/if}
        {:else if loadError}
          <div class="loading-container error">
            <Icon name="mdiAlertCircle" size={32} />
            <p>Chyba: {loadError}</p>
            <button type="button" class="btn" onclick={() => { loadError = null; loadComponents(); }}>
              Zkusit znovu
            </button>
          </div>
        {:else}
          <div class="loading-container">
            <Icon name="mdiLoading" size={32} />
            <p>{loadingStatus}</p>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style lang="scss">
  .dialog-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 1.5rem;
    animation: fadeIn 0.2s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .dialog-content {
    background: #fff;
    border-radius: 0.75rem;
    width: 100%;
    height: 100%;
    max-width: 95vw;
    max-height: 95vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 10px 2.5rem rgba(0, 0, 0, 0.3);
    animation: slideUp 0.2s ease-out;
    overflow: hidden;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .dialog-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    background: #f8f9fa;
    border-bottom: 1px solid #dfe3e8;
    flex-shrink: 0;

    .header-left {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      color: #285597;

      .title {
        font-size: 1rem;
        font-weight: 600;
      }

      .subtitle {
        font-size: 0.75rem;
        color: #666;
      }
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.375rem;

      .separator {
        width: 1px;
        height: 1.25rem;
        background: #dfe3e8;
        margin: 0 0.375rem;
      }
    }
  }

  .examples-bar {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 0.5rem 1rem;
    background: #e3f2fd;
    border-bottom: 1px solid #dfe3e8;
    flex-shrink: 0;

    .examples-label {
      font-size: 0.75rem;
      color: #666;
      font-weight: 500;
    }

    .example-btn {
      padding: 0.25rem 0.625rem;
      background: #285597;
      border: 1px solid #285597;
      border-radius: 0.25rem;
      color: #fff;
      font-size: 0.6875rem;
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover {
        background: #1e3f6f;
        border-color: #1e3f6f;
      }
    }
  }

  .dialog-body {
    flex: 1;
    display: flex;
    overflow: hidden;
    min-height: 0;
    background: #f5f5f5;

    &.split {
      &.horizontal {
        flex-direction: column;
      }

      &.vertical {
        flex-direction: row;
      }
    }

    .editor-pane {
      flex: 1;
      min-width: 0;
      min-height: 0;
      overflow: hidden;
      display: flex;
      flex-direction: column;

      .error-card {
        display: flex;
        flex-direction: column;
        max-height: 200px;
        background: #fff;
        border-top: 1px solid #dfe3e8;
        flex-shrink: 0;

        .error-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0.75rem;
          background: #f8f9fa;
          border-bottom: 1px solid #dfe3e8;
          color: #333;
          font-size: 0.8125rem;
          font-weight: 500;

          .error-title {
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          .copy-btn {
            background: transparent;
            border: none;
            color: #666;
            cursor: pointer;
            padding: 0.25rem;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 0.25rem;
            transition: all 0.15s ease;

            &:hover {
              color: #285597;
              background: #e3f2fd;
            }
          }
        }

        .error-list {
          flex: 1;
          overflow-y: auto;

          .error-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.375rem 0.75rem;
            cursor: pointer;
            transition: background 0.15s ease;

            &:hover {
              background: #f5f5f5;
            }

            .line-num {
              color: #666;
              font-size: 0.75rem;
            }

            .error-msg {
              color: #333;
              font-size: 0.8125rem;
            }

            &.error .error-msg {
              color: #dc3545;
            }

            &.warning .error-msg {
              color: #856404;
            }

            &.info .error-msg {
              color: #285597;
            }
          }

          .error-more {
            padding: 0.375rem 0.75rem;
            color: #666;
            font-size: 0.75rem;
            font-style: italic;
          }
        }
      }
    }

    .preview-pane {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      min-height: 0;
      border-top: 1px solid #dfe3e8;
      background: #fff;

      .dialog-body.vertical & {
        border-top: none;
        border-left: 1px solid #dfe3e8;
      }

      .preview-header {
        display: flex;
        align-items: center;
        padding: 0.5rem 0.75rem;
        background: #f8f9fa;
        border-bottom: 1px solid #dfe3e8;
        flex-shrink: 0;

        h3 {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          margin: 0;
          font-size: 0.8125rem;
          font-weight: 500;
          color: #285597;
        }
      }
    }
  }

  .btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.25rem 0.5rem;
    background: #fff;
    border: 1px solid #dfe3e8;
    border-radius: 0.25rem;
    color: #333;
    cursor: pointer;
    transition: all 0.15s ease;

    &.btn-icon {
      padding: 0.25rem 0.375rem;
    }

    &:hover:not(:disabled) {
      background: #f0f0f0;
      border-color: #285597;
      color: #285597;
    }

    &:active:not(:disabled) {
      transform: scale(0.98);
    }

    &.active {
      background: #285597;
      border-color: #285597;
      color: #fff;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .loading-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    color: #666;
    background: #fff;

    p {
      margin: 0;
      font-size: 0.875rem;
    }

    :global(svg) {
      animation: spin 1s linear infinite;
      color: #285597;
    }

    &.error {
      color: #dc3545;

      :global(svg) {
        animation: none;
        color: #dc3545;
      }
    }
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

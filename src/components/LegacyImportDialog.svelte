<script lang="ts">
  import { open } from '@tauri-apps/plugin-dialog';
  import { readTextFile } from '@tauri-apps/plugin-fs';
  import { getDatabase } from '$lib/database';
  import { showSuccess, showError } from '$lib/toast.svelte';
  import { initTableColumns } from '$lib/tableColumnProcessor.svelte';
  import { initFormattingRules } from '$lib/formattingProcessor.svelte';
  import { DATA_VARS } from '$lib/dataProcessor.svelte';
  import {
    createColumnsFromLegacy,
    createFormattingRulesFromLegacy,
    importProgramsFromLegacy,
    type LegacySettings,
    type LegacyData,
  } from '$lib/legacyImportProcessor';
  import Button from './Button.svelte';
  import Icon from './Icon.svelte';

  let { open: isOpen = $bindable(false), onComplete }: { open: boolean; onComplete: () => void } =
    $props();

  let dialog = $state<HTMLDialogElement | null>(null);

  type ImportStep = 'intro' | 'settings' | 'programs' | 'importing' | 'complete' | 'error';

  let currentStep = $state<ImportStep>('intro');
  let settingsFile = $state<string | null>(null);
  let settingsData = $state<LegacySettings | null>(null);
  let programsFile = $state<string | null>(null);
  let programsData = $state<LegacyData | null>(null);
  let importProgress = $state({ current: 0, total: 0, phase: '' });
  let importResult = $state({ columns: 0, rules: 0, programs: 0 });
  let errorMessage = $state('');

  $effect(() => {
    if (isOpen) {
      resetState();
      dialog?.showModal();
    } else {
      dialog?.close();
    }
  });

  function resetState() {
    currentStep = 'intro';
    settingsFile = null;
    settingsData = null;
    programsFile = null;
    programsData = null;
    importProgress = { current: 0, total: 0, phase: '' };
    importResult = { columns: 0, rules: 0, programs: 0 };
    errorMessage = '';
  }

  function closeDialog() {
    isOpen = false;
  }

  async function selectSettingsFile() {
    try {
      const file = await open({
        title: 'Vyberte soubor settings.pncs',
        filters: [{ name: 'PNCS Files', extensions: ['pncs'] }],
        multiple: false,
      });

      if (!file) return;

      settingsFile = file as string;
      const content = await readTextFile(settingsFile);
      const parsed: LegacySettings = JSON.parse(content);

      if (!parsed.headerDef?.items) {
        throw new Error('Neplatný formát souboru');
      }

      settingsData = parsed;
      currentStep = 'settings';
    } catch (error) {
      errorMessage = `Chyba při načítání souboru: ${error instanceof Error ? error.message : 'Neznámá chyba'}`;
      currentStep = 'error';
    }
  }

  async function selectProgramsFile() {
    try {
      const file = await open({
        title: 'Vyberte soubor programs.pnc',
        filters: [{ name: 'PNC Files', extensions: ['pnc'] }],
        multiple: false,
      });

      if (!file) return;

      programsFile = file as string;
      const content = await readTextFile(programsFile);
      const parsed: LegacyData = JSON.parse(content);

      if (!parsed.items) {
        throw new Error('Neplatný formát souboru');
      }

      programsData = parsed;
      currentStep = 'programs';
    } catch (error) {
      errorMessage = `Chyba při načítání souboru: ${error instanceof Error ? error.message : 'Neznámá chyba'}`;
      currentStep = 'error';
    }
  }

  async function startImport() {
    if (!settingsData || !programsData) return;

    currentStep = 'importing';
    DATA_VARS.isImporting = true;

    try {
      const db = await getDatabase();

      // Phase 1: Create columns
      importProgress = { current: 0, total: 3, phase: 'Vytváření sloupců...' };
      const columns = await createColumnsFromLegacy(db, settingsData);
      importResult.columns = columns.length;

      // Phase 2: Create formatting rules
      importProgress = { current: 1, total: 3, phase: 'Vytváření pravidel formátování...' };
      if (settingsData.formats) {
        await createFormattingRulesFromLegacy(db, settingsData.formats);
        importResult.rules = settingsData.formats.filter((f) => f.trueColor !== 'clear').length;
      }

      // Phase 3: Import programs
      importProgress = { current: 2, total: 3, phase: 'Importování záznamů...' };
      await importProgramsFromLegacy(db, programsData.items, columns);
      importResult.programs = programsData.items.length;

      // Reload UI state
      await initTableColumns();
      await initFormattingRules();

      DATA_VARS.isImporting = false;
      DATA_VARS.reloadData = true;

      importProgress = { current: 3, total: 3, phase: 'Dokončeno!' };
      currentStep = 'complete';
    } catch (error) {
      DATA_VARS.isImporting = false;
      errorMessage = `Chyba při importu: ${error instanceof Error ? error.message : 'Neznámá chyba'}`;
      currentStep = 'error';
    }
  }

  function handleComplete() {
    showSuccess(`Importováno ${importResult.programs} záznamů ze staré aplikace`);
    closeDialog();
    onComplete();
  }

  function getFileName(path: string | null): string {
    if (!path) return '';
    return path.split(/[/\\]/).pop() || path;
  }
</script>

<dialog bind:this={dialog} class="legacy-import-dialog">
  <div class="dialog-header">
    <Icon name="mdiImport" size={28} color="#285597" />
    <h2>Import ze staré aplikace</h2>
    <button class="close-button" onclick={closeDialog}>
      <Icon name="mdiClose" size={24} color="#666" />
    </button>
  </div>

  <div class="dialog-body">
    {#if currentStep === 'intro'}
      <div class="step-content">
        <div class="intro-icon">
          <Icon name="mdiFileDocumentOutline" size={64} color="#285597" />
        </div>
        <h3>Vítejte v průvodci importem</h3>
        <p>
          Tento průvodce vám pomůže importovat data ze staré aplikace NC Programy. Budete potřebovat
          dva soubory:
        </p>
        <div class="file-requirements">
          <div class="file-requirement">
            <Icon name="mdiFileCodeOutline" size={24} color="#285597" />
            <div>
              <strong>settings.pncs</strong>
              <span>Definice sloupců a pravidel formátování</span>
            </div>
          </div>
          <div class="file-requirement">
            <Icon name="mdiFileDocumentOutline" size={24} color="#285597" />
            <div>
              <strong>programs.pnc</strong>
              <span>Data programů</span>
            </div>
          </div>
        </div>
      </div>
      <div class="dialog-actions">
        <Button onClick={closeDialog}>Zrušit</Button>
        <Button onClick={selectSettingsFile} primary>
          <Icon name="mdiChevronRight" size={20} color="#fff" />
          <span>Začít import</span>
        </Button>
      </div>
    {:else if currentStep === 'settings'}
      <div class="step-content">
        <div class="step-indicator">
          <div class="step active">1</div>
          <div class="step-line"></div>
          <div class="step">2</div>
          <div class="step-line"></div>
          <div class="step">3</div>
        </div>

        <div class="file-loaded">
          <Icon name="mdiCheckCircle" size={32} color="#22c55e" />
          <div class="file-info">
            <strong>Soubor nastavení načten</strong>
            <span class="file-name">{getFileName(settingsFile)}</span>
          </div>
        </div>

        <div class="loaded-summary">
          <div class="summary-item">
            <Icon name="mdiViewColumn" size={20} color="#285597" />
            <span>{settingsData?.headerDef?.items?.length || 0} sloupců</span>
          </div>
          <div class="summary-item">
            <Icon name="mdiFilter" size={20} color="#285597" />
            <span>{settingsData?.formats?.length || 0} pravidel formátování</span>
          </div>
        </div>

        <p class="next-step-hint">Nyní vyberte soubor s daty programů.</p>
      </div>
      <div class="dialog-actions">
        <Button onClick={() => (currentStep = 'intro')}>Zpět</Button>
        <Button onClick={selectProgramsFile} primary>
          <Icon name="mdiFolder" size={20} color="#fff" />
          <span>Vybrat programs.pnc</span>
        </Button>
      </div>
    {:else if currentStep === 'programs'}
      <div class="step-content">
        <div class="step-indicator">
          <div class="step completed">
            <Icon name="mdiCheck" size={16} color="#fff" />
          </div>
          <div class="step-line completed"></div>
          <div class="step active">2</div>
          <div class="step-line"></div>
          <div class="step">3</div>
        </div>

        <div class="file-loaded">
          <Icon name="mdiCheckCircle" size={32} color="#22c55e" />
          <div class="file-info">
            <strong>Soubor dat načten</strong>
            <span class="file-name">{getFileName(programsFile)}</span>
          </div>
        </div>

        <div class="loaded-summary">
          <div class="summary-item">
            <Icon name="mdiTableLarge" size={20} color="#285597" />
            <span>{programsData?.items?.length || 0} záznamů k importu</span>
          </div>
        </div>

        <div class="import-warning">
          <Icon name="mdiAlert" size={20} color="#f59e0b" />
          <span>Import přepíše existující strukturu sloupců.</span>
        </div>
      </div>
      <div class="dialog-actions">
        <Button onClick={() => (currentStep = 'settings')}>Zpět</Button>
        <Button onClick={startImport} success>
          <Icon name="mdiImport" size={20} color="#fff" />
          <span>Spustit import</span>
        </Button>
      </div>
    {:else if currentStep === 'importing'}
      <div class="step-content importing">
        <div class="step-indicator">
          <div class="step completed">
            <Icon name="mdiCheck" size={16} color="#fff" />
          </div>
          <div class="step-line completed"></div>
          <div class="step completed">
            <Icon name="mdiCheck" size={16} color="#fff" />
          </div>
          <div class="step-line active"></div>
          <div class="step active">3</div>
        </div>

        <div class="importing-animation">
          <div class="spinner-large"></div>
        </div>

        <h3>Probíhá import...</h3>
        <p class="phase-text">{importProgress.phase}</p>

        <div class="progress-bar">
          <div
            class="progress-fill"
            style="width: {(importProgress.current / importProgress.total) * 100}%"
          ></div>
        </div>
        <p class="progress-text">{importProgress.current} / {importProgress.total}</p>
      </div>
    {:else if currentStep === 'complete'}
      <div class="step-content complete">
        <div class="step-indicator">
          <div class="step completed">
            <Icon name="mdiCheck" size={16} color="#fff" />
          </div>
          <div class="step-line completed"></div>
          <div class="step completed">
            <Icon name="mdiCheck" size={16} color="#fff" />
          </div>
          <div class="step-line completed"></div>
          <div class="step completed">
            <Icon name="mdiCheck" size={16} color="#fff" />
          </div>
        </div>

        <div class="success-icon">
          <Icon name="mdiCheckCircle" size={64} color="#22c55e" />
        </div>

        <h3>Import dokončen!</h3>

        <div class="result-summary">
          <div class="result-item">
            <Icon name="mdiViewColumn" size={24} color="#285597" />
            <div>
              <strong>{importResult.columns}</strong>
              <span>sloupců</span>
            </div>
          </div>
          <div class="result-item">
            <Icon name="mdiFilter" size={24} color="#285597" />
            <div>
              <strong>{importResult.rules}</strong>
              <span>pravidel</span>
            </div>
          </div>
          <div class="result-item">
            <Icon name="mdiTableLarge" size={24} color="#285597" />
            <div>
              <strong>{importResult.programs}</strong>
              <span>záznamů</span>
            </div>
          </div>
        </div>
      </div>
      <div class="dialog-actions">
        <Button onClick={handleComplete} success>
          <Icon name="mdiCheck" size={20} color="#fff" />
          <span>Dokončit</span>
        </Button>
      </div>
    {:else if currentStep === 'error'}
      <div class="step-content error">
        <div class="error-icon">
          <Icon name="mdiAlertCircle" size={64} color="#ef4444" />
        </div>

        <h3>Chyba při importu</h3>
        <p class="error-message">{errorMessage}</p>
      </div>
      <div class="dialog-actions">
        <Button onClick={closeDialog}>Zavřít</Button>
        <Button onClick={resetState} primary>
          <span>Zkusit znovu</span>
        </Button>
      </div>
    {/if}
  </div>
</dialog>

<style lang="scss">
  .legacy-import-dialog {
    border: none;
    border-radius: 1rem;
    padding: 0;
    width: 500px;
    max-width: 90vw;
    box-shadow: 0 10px 2.5rem rgba(0, 0, 0, 0.3);
    overflow: hidden;

    &::backdrop {
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
    }
  }

  .dialog-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1.25rem 1.5rem;
    background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
    border-bottom: 1px solid #e2e8f0;

    h2 {
      flex: 1;
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: #1e293b;
    }

    .close-button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      background: transparent;
      border: none;
      border-radius: 0.5rem;
      cursor: pointer;
      transition: background 0.2s;

      &:hover {
        background: rgba(0, 0, 0, 0.1);
      }
    }
  }

  .dialog-body {
    padding: 1.5rem;
  }

  .step-content {
    min-height: 280px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;

    h3 {
      margin: 1rem 0 0.5rem;
      font-size: 1.25rem;
      color: #1e293b;
    }

    p {
      margin: 0;
      color: #64748b;
      line-height: 1.5;
    }
  }

  .intro-icon {
    margin-bottom: 0.5rem;
    opacity: 0.9;
  }

  .file-requirements {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-top: 1.5rem;
    width: 100%;
  }

  .file-requirement {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 0.625rem;
    text-align: left;

    div {
      display: flex;
      flex-direction: column;

      strong {
        color: #1e293b;
        font-size: 0.95rem;
      }

      span {
        color: #64748b;
        font-size: 0.85rem;
      }
    }
  }

  .step-indicator {
    display: flex;
    align-items: center;
    gap: 0;
    margin-bottom: 1.5rem;
  }

  .step {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    background: #e2e8f0;
    color: #64748b;
    font-weight: 600;
    font-size: 0.9rem;

    &.active {
      background: #285597;
      color: white;
    }

    &.completed {
      background: #22c55e;
      color: white;
    }
  }

  .step-line {
    width: 2.5rem;
    height: 3px;
    background: #e2e8f0;

    &.active {
      background: linear-gradient(90deg, #22c55e 0%, #285597 100%);
    }

    &.completed {
      background: #22c55e;
    }
  }

  .file-loaded {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.5rem;
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 0.625rem;
    width: 100%;
    text-align: left;

    .file-info {
      display: flex;
      flex-direction: column;

      strong {
        color: #166534;
      }

      .file-name {
        color: #64748b;
        font-size: 0.85rem;
        font-family: monospace;
      }
    }
  }

  .loaded-summary {
    display: flex;
    gap: 1.5rem;
    margin-top: 1rem;
  }

  .summary-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: #f1f5f9;
    border-radius: 0.5rem;

    span {
      color: #475569;
      font-size: 0.9rem;
    }
  }

  .next-step-hint {
    margin-top: 1.5rem !important;
    font-style: italic;
  }

  .import-warning {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-top: 1.5rem;
    padding: 0.75rem 1rem;
    background: #fef3c7;
    border: 1px solid #fcd34d;
    border-radius: 0.5rem;

    span {
      color: #92400e;
      font-size: 0.9rem;
    }
  }

  .importing {
    justify-content: center;
  }

  .importing-animation {
    margin: 1rem 0;
  }

  .spinner-large {
    width: 64px;
    height: 64px;
    border: 4px solid #e2e8f0;
    border-top-color: #285597;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .phase-text {
    font-size: 1rem;
    color: #475569;
  }

  .progress-bar {
    width: 100%;
    height: 0.5rem;
    background: #e2e8f0;
    border-radius: 0.25rem;
    margin-top: 1.5rem;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #285597 0%, #3b82f6 100%);
    border-radius: 0.25rem;
    transition: width 0.3s ease;
  }

  .progress-text {
    margin-top: 0.5rem !important;
    font-size: 0.85rem;
    color: #94a3b8;
  }

  .complete {
    justify-content: center;
  }

  .success-icon {
    margin-bottom: 0.5rem;
    animation: bounce 0.5s ease;
  }

  @keyframes bounce {
    0%,
    100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.1);
    }
  }

  .result-summary {
    display: flex;
    gap: 1rem;
    margin-top: 1.5rem;
  }

  .result-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem 1.5rem;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 0.625rem;
    min-width: 100px;

    div {
      display: flex;
      flex-direction: column;
      align-items: center;

      strong {
        font-size: 1.5rem;
        color: #1e293b;
      }

      span {
        font-size: 0.8rem;
        color: #64748b;
      }
    }
  }

  .error {
    justify-content: center;
  }

  .error-icon {
    margin-bottom: 0.5rem;
  }

  .error-message {
    margin-top: 0.5rem !important;
    padding: 1rem;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 0.5rem;
    color: #991b1b;
    font-size: 0.9rem;
    max-width: 100%;
    word-break: break-word;
  }

  .dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid #e2e8f0;
  }
</style>

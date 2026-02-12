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
    <Icon name="mdiImport" size={28} color="var(--color-primary)" />
    <h2>Import ze staré aplikace</h2>
    <button class="close-button" onclick={closeDialog}>
      <Icon name="mdiClose" size={24} color="var(--color-text-secondary)" />
    </button>
  </div>

  <div class="dialog-body">
    {#if currentStep === 'intro'}
      <div class="step-content">
        <div class="intro-icon">
          <Icon name="mdiFileDocumentOutline" size={64} color="var(--color-primary)" />
        </div>
        <h3>Vítejte v průvodci importem</h3>
        <p>
          Tento průvodce vám pomůže importovat data ze staré aplikace NC Programy. Budete potřebovat
          dva soubory:
        </p>
        <div class="file-requirements">
          <div class="file-requirement">
            <Icon name="mdiFileCodeOutline" size={24} color="var(--color-primary)" />
            <div>
              <strong>settings.pncs</strong>
              <span>Definice sloupců a pravidel formátování</span>
            </div>
          </div>
          <div class="file-requirement">
            <Icon name="mdiFileDocumentOutline" size={24} color="var(--color-primary)" />
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
            <Icon name="mdiViewColumn" size={20} color="var(--color-primary)" />
            <span>{settingsData?.headerDef?.items?.length || 0} sloupců</span>
          </div>
          <div class="summary-item">
            <Icon name="mdiFilter" size={20} color="var(--color-primary)" />
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
            <Icon name="mdiTableLarge" size={20} color="var(--color-primary)" />
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
            <Icon name="mdiViewColumn" size={24} color="var(--color-primary)" />
            <div>
              <strong>{importResult.columns}</strong>
              <span>sloupců</span>
            </div>
          </div>
          <div class="result-item">
            <Icon name="mdiFilter" size={24} color="var(--color-primary)" />
            <div>
              <strong>{importResult.rules}</strong>
              <span>pravidel</span>
            </div>
          </div>
          <div class="result-item">
            <Icon name="mdiTableLarge" size={24} color="var(--color-primary)" />
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
    border-radius: var(--radius-xl);
    padding: 0;
    width: 500px;
    max-width: 90vw;
    box-shadow: var(--shadow-xl);
    overflow: hidden;

    &::backdrop {
      background: var(--color-bg-overlay);
      backdrop-filter: blur(4px);
    }
  }

  .dialog-header {
    display: flex;
    align-items: center;
    gap: var(--space-6);
    padding: var(--space-8);
    background: linear-gradient(135deg, var(--color-bg-subtle) 0%, var(--color-bg-muted) 100%);
    border-bottom: 1px solid var(--color-border-light);

    h2 {
      flex: 1;
      margin: 0;
      font-size: var(--font-size-xl);
      font-weight: 600;
      color: var(--color-text);
    }

    .close-button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      background: transparent;
      border: none;
      border-radius: var(--radius-lg);
      cursor: pointer;
      transition: background var(--transition-base);

      &:hover {
        background: rgba(0, 0, 0, 0.1);
      }
    }
  }

  .dialog-body {
    padding: var(--space-8);
  }

  .step-content {
    min-height: 250px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;

    h3 {
      margin: var(--space-6) 0 var(--space-3);
      font-size: var(--font-size-xl);
      color: var(--color-text);
    }

    p {
      margin: 0;
      color: var(--color-text-secondary);
      line-height: 1.5;
    }
  }

  .intro-icon {
    margin-bottom: var(--space-4);
    opacity: 0.9;
  }

  .file-requirements {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
    margin-top: var(--space-8);
    width: 100%;
  }

  .file-requirement {
    display: flex;
    align-items: center;
    gap: var(--space-6);
    padding: var(--space-6);
    background: var(--color-bg-subtle);
    border: 1px solid var(--color-border-light);
    border-radius: var(--radius-lg);
    text-align: left;

    div {
      display: flex;
      flex-direction: column;

      strong {
        color: var(--color-text);
        font-size: var(--font-size-base);
      }

      span {
        color: var(--color-text-secondary);
        font-size: var(--font-size-sm);
      }
    }
  }

  .step-indicator {
    display: flex;
    align-items: center;
    gap: 0;
    margin-bottom: var(--space-8);
  }

  .step {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    background: var(--color-bg-muted);
    color: var(--color-text-secondary);
    font-weight: 600;
    font-size: var(--font-size-base);

    &.active {
      background: var(--color-primary);
      color: var(--color-text-on-primary);
    }

    &.completed {
      background: var(--color-success);
      color: var(--color-text-on-primary);
    }
  }

  .step-line {
    width: 2.5rem;
    height: 3px;
    background: var(--color-bg-muted);

    &.active {
      background: linear-gradient(90deg, var(--color-success) 0%, var(--color-primary) 100%);
    }

    &.completed {
      background: var(--color-success);
    }
  }

  .file-loaded {
    display: flex;
    align-items: center;
    gap: var(--space-6);
    padding: var(--space-6) var(--space-8);
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: var(--radius-lg);
    width: 100%;
    text-align: left;

    .file-info {
      display: flex;
      flex-direction: column;

      strong {
        color: #166534;
      }

      .file-name {
        color: var(--color-text-secondary);
        font-size: var(--font-size-sm);
        font-family: var(--font-mono);
      }
    }
  }

  .loaded-summary {
    display: flex;
    gap: var(--space-8);
    margin-top: var(--space-6);
  }

  .summary-item {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-3) var(--space-6);
    background: var(--color-bg-muted);
    border-radius: var(--radius-lg);

    span {
      color: var(--color-text-secondary);
      font-size: var(--font-size-base);
    }
  }

  .next-step-hint {
    margin-top: var(--space-8) !important;
    font-style: italic;
  }

  .import-warning {
    display: flex;
    align-items: center;
    gap: var(--space-6);
    margin-top: var(--space-8);
    padding: var(--space-6);
    background: #fef3c7;
    border: 1px solid #fcd34d;
    border-radius: var(--radius-lg);

    span {
      color: #92400e;
      font-size: var(--font-size-base);
    }
  }

  .importing {
    justify-content: center;
  }

  .importing-animation {
    margin: var(--space-6) 0;
  }

  .spinner-large {
    width: 64px;
    height: 64px;
    border: 4px solid var(--color-bg-muted);
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .phase-text {
    font-size: var(--font-size-md);
    color: var(--color-text-secondary);
  }

  .progress-bar {
    width: 100%;
    height: var(--space-4);
    background: var(--color-bg-muted);
    border-radius: var(--radius-sm);
    margin-top: var(--space-8);
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--color-primary) 0%, var(--color-primary-hover) 100%);
    border-radius: var(--radius-sm);
    transition: width var(--transition-slow);
  }

  .progress-text {
    margin-top: var(--space-4) !important;
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  .complete {
    justify-content: center;
  }

  .success-icon {
    margin-bottom: var(--space-4);
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
    gap: var(--space-6);
    margin-top: var(--space-8);
  }

  .result-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-6) var(--space-8);
    background: var(--color-bg-subtle);
    border: 1px solid var(--color-border-light);
    border-radius: var(--radius-lg);
    min-width: 100px;

    div {
      display: flex;
      flex-direction: column;
      align-items: center;

      strong {
        font-size: var(--font-size-xl);
        color: var(--color-text);
      }

      span {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
      }
    }
  }

  .error {
    justify-content: center;
  }

  .error-icon {
    margin-bottom: var(--space-4);
  }

  .error-message {
    margin-top: var(--space-4) !important;
    padding: var(--space-6);
    background: var(--color-danger-light);
    border: 1px solid #fecaca;
    border-radius: var(--radius-lg);
    color: #991b1b;
    font-size: var(--font-size-base);
    max-width: 100%;
    word-break: break-word;
  }

  .dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-6);
    margin-top: var(--space-8);
    padding-top: var(--space-8);
    border-top: 1px solid var(--color-border-light);
  }
</style>

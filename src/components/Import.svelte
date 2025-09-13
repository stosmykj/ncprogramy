<script lang="ts">
  import { DATA_VARS } from '$lib/dataProcessor.svelte';
  import {
    IMPORT_VARS,
    loadImport,
    openPrograms,
    processImport,
  } from '$lib/importProcessor.svelte';
  import type { Program } from '../models/program';
  import Button from './Button.svelte';

  let importDialog: HTMLDialogElement;

  let step: number = $state(0);
  let filename: string | null = $state(null);
  let programs: Array<Program> = $state([]);

  $effect(() => {
    if (IMPORT_VARS.dialog) {
      importDialog.show();
    } else {
      step = 0;
      filename = null;
      programs = [];
      importDialog.close();
    }
  });

  async function continueImport() {
    if (step === 0 && filename) {
      programs = await loadImport(filename);
      filename = null;
      step++;
      return;
    }
    if (step === 1) {
      step++;
      DATA_VARS.isImporting = true;
      await processImport(programs);
      DATA_VARS.isImporting = false;
      step++;
      setTimeout(() => {
        IMPORT_VARS.dialog = false;
      }, 5000);
      return;
    }
  }

  function closeDialog() {
    if (!DATA_VARS.isImporting) {
      IMPORT_VARS.dialog = false;
    }
  }
</script>

<dialog bind:this={importDialog}>
  <div class="import-modal">
    <div class="modal-header">
      <div class="icon-wrapper">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 15V3m0 12l-4-4m4 4l4-4M2 17l.621 2.485A2 2 0 004.561 21h14.878a2 2 0 001.94-1.515L22 17"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>
      <h2>Importování dat z předešlé verze</h2>
      <Button onClick={closeDialog} icon="mdiClose" iconSize={25} onlyIcon />
    </div>

    <div class="modal-content">
      {#if step === 0}
        <div class="step-container">
          <div class="step-indicator">
            <div class="step-number">1</div>
            <div class="step-info">
              <div class="step-title">Výběr souboru</div>
              <div class="step-description">
                Vyberte databázový soubor z předchozí verze aplikace
              </div>
            </div>
          </div>

          <div class="file-selection-area">
            <div class="file-select-zone">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <span class="zone-text">Vyberte databázový soubor</span>
              <Button onClick={async () => (filename = await openPrograms())} primary>
                Procházet soubory
              </Button>
            </div>

            {#if filename}
              <div class="selected-file">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    stroke="#10b981"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                <span class="filename">{filename}</span>
              </div>
            {/if}
          </div>
        </div>
      {:else if step === 1}
        <div class="step-container">
          <div class="step-indicator">
            <div class="step-number">2</div>
            <div class="step-info">
              <div class="step-title">Potvrzení importu</div>
              <div class="step-description">Zkontrolujte počet záznamů a potvrďte import</div>
            </div>
          </div>

          <div class="import-summary">
            <div class="summary-icon">
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </div>
            <div class="summary-content">
              <div class="records-count">{programs.length}</div>
              <div class="records-label">záznamů připraveno k importu</div>
            </div>
          </div>

          <div class="warning-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <span>Tato operace přidá nové záznamy do stávající databáze</span>
          </div>
        </div>
      {:else if step === 2}
        <div class="step-container">
          <div class="step-indicator success">
            <div class="step-number">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 13l4 4L19 7"
                  stroke="currentColor"
                  stroke-width="3"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </div>
            <div class="step-info">
              <div class="step-title">Import dokončen</div>
              <div class="step-description">Data byla úspěšně naimportována</div>
            </div>
          </div>

          <div class="loading-indicator">
            <div class="checkmark-circle">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#10b981" stroke-width="2" />
                <path
                  d="M8 12l3 3 5-5"
                  stroke="#10b981"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>
      {/if}
    </div>

    <div class="modal-footer">
      <Button onClick={closeDialog}>Zavřít</Button>
      {#if step < 2}
        <Button onClick={continueImport} primary>
          {#if step === 0}
            <span>Pokračovat</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M9 5l7 7-7 7"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          {:else}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 13l4 4L19 7"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <span>Naimportovat</span>
          {/if}
        </Button>
      {/if}
    </div>
  </div>
</dialog>

<style lang="scss">
  dialog[open] {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    margin: 0;
    padding: 0;
    width: 100vw;
    height: 100vh;
    max-width: none;
    max-height: none;
    border: none;
    background: rgba(0, 0, 0, 0.65);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 1000;

    &::backdrop {
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(8px);
    }
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .import-modal {
    background: white;
    border-radius: 20px;
    width: 90%;
    max-width: 760px;
    box-shadow:
      0 0 0 1px rgba(0, 0, 0, 0.05),
      0 20px 25px -5px rgba(0, 0, 0, 0.1),
      0 10px 10px -5px rgba(0, 0, 0, 0.04);
    animation: slideUp 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  @keyframes slideUp {
    from {
      transform: translateY(32px) scale(0.95);
      opacity: 0;
    }
    to {
      transform: translateY(0) scale(1);
      opacity: 1;
    }
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    width: 100%;
    padding: 28px 32px;
    border-bottom: 1px solid #e5e7eb;
    background: linear-gradient(to bottom, #fafbfc 0%, #ffffff 100%);
    .icon-wrapper {
      width: 52px;
      height: 52px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #4875b7 0%, #183868 100%);
      border-radius: 14px;
      color: white;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
    }

    h2 {
      margin: 0;
      font-size: 21px;
      color: #111827;
      font-weight: 700;
      letter-spacing: -0.01em;
    }
  }

  .modal-content {
    padding: 36px;
    min-height: 300px;
    display: flex;
    flex-direction: column;
    gap: 28px;
    background: #fafbfc;
  }

  .step-container {
    display: flex;
    flex-direction: column;
    gap: 28px;
  }

  .step-indicator {
    display: flex;
    align-items: flex-start;
    gap: 18px;

    .step-number {
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #4875b7 0%, #183868 100%);
      color: white;
      border-radius: 50%;
      font-weight: 700;
      font-size: 19px;
      flex-shrink: 0;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
    }

    &.success .step-number {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
    }

    .step-info {
      flex: 1;
      padding-top: 2px;

      .step-title {
        font-size: 19px;
        font-weight: 700;
        color: #111827;
        margin-bottom: 6px;
        letter-spacing: -0.01em;
      }

      .step-description {
        font-size: 15px;
        color: #6b7280;
        line-height: 1.5;
      }
    }
  }

  .file-selection-area {
    display: flex;
    flex-direction: column;
    gap: 18px;

    .file-select-zone {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      padding: 52px 32px;
      background: white;
      border: 2px dashed #d1d5db;
      border-radius: 16px;
      color: #6b7280;
      font-size: 15px;
      font-weight: 500;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

      svg {
        color: #2563eb;
        transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .zone-text {
        font-size: 16px;
        color: #374151;
        font-weight: 600;
      }

      &:hover {
        background: #fafbfc;
        border-color: #2563eb;
        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.1);

        svg {
          transform: translateY(-2px);
        }
      }
    }

    .selected-file {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 18px 20px;
      background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
      border: 1px solid #6ee7b7;
      border-radius: 12px;
      animation: slideIn 0.35s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 2px 8px rgba(16, 185, 129, 0.15);

      svg {
        flex-shrink: 0;
      }

      .filename {
        font-size: 14px;
        color: #065f46;
        font-weight: 600;
        word-break: break-all;
      }
    }
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-12px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .import-summary {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
    padding: 40px 32px;
    background: white;
    border-radius: 16px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

    .summary-icon {
      color: #2563eb;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 72px;
      height: 72px;
      background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
      border-radius: 50%;
    }

    .summary-content {
      text-align: center;

      .records-count {
        font-size: 56px;
        font-weight: 800;
        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        line-height: 1;
        letter-spacing: -0.02em;
      }

      .records-label {
        font-size: 17px;
        color: #6b7280;
        margin-top: 10px;
        font-weight: 500;
      }
    }
  }

  .warning-box {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 16px 18px;
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    border: 1px solid #fbbf24;
    border-radius: 12px;
    color: #92400e;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 2px 8px rgba(251, 191, 36, 0.15);

    svg {
      flex-shrink: 0;
      color: #d97706;
    }
  }

  .loading-indicator {
    display: flex;
    justify-content: center;
    padding: 40px 0;

    .checkmark-circle {
      animation: scaleIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);

      svg {
        filter: drop-shadow(0 8px 16px rgba(16, 185, 129, 0.3));
      }
    }
  }

  @keyframes scaleIn {
    from {
      transform: scale(0) rotate(-180deg);
      opacity: 0;
    }
    to {
      transform: scale(1) rotate(0deg);
      opacity: 1;
    }
  }

  .modal-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
    padding: 24px 32px;
    border-top: 1px solid #e5e7eb;
    background: white;
  }
</style>

<script lang="ts">
  import { onMount } from 'svelte';
  import type {
    DbFormattingRule,
    RuleConditionGroup,
    RuleTarget,
  } from '../models/dbFormattingRule';
  import ConditionBuilder from './ConditionBuilder.svelte';
  import Icon from './Icon.svelte';
  import { getDatabase } from '../lib/database';
  import { buildStyleString, reloadFormattingRules } from '../lib/formattingProcessor.svelte';
  import { showError, showSuccess } from '$lib/toast.svelte';
  import { SETTINGS_VARS } from '$lib/settingsProcessor.svelte';
  import Button from './Button.svelte';
  import { FormattingRule } from '../models/formattingRule';
  import ColorPicker from 'svelte-awesome-color-picker';
  import { logger } from '$lib/logger';

  let {
    onClose,
  }: {
    onClose?: () => void;
  } = $props();

  let rules = $state<FormattingRule[]>([]);
  let isEditing = $state(false);
  let isCreating = $state(false);
  let dialog = $state<HTMLDialogElement | null>(null);

  $effect(() => {
    if (SETTINGS_VARS.formatterOpened) {
      dialog?.showModal();
    } else {
      dialog?.close();
    }
  });

  const availableColumns = [
    { key: 'programId', label: 'Program ID', type: 'text' },
    { key: 'name', label: 'Název', type: 'text' },
    { key: 'orderNumber', label: 'Číslo zakázky', type: 'text' },
    { key: 'deadlineAt', label: 'Termín', type: 'date' },
    { key: 'arrivedAt', label: 'Dorazilo', type: 'date' },
    { key: 'doneAt', label: 'Hotovo', type: 'date' },
    { key: 'count', label: 'Počet kusů', type: 'number' },
    { key: 'preparing', label: 'Příprava', type: 'number' },
    { key: 'programing', label: 'Programování', type: 'number' },
    { key: 'machineWorking', label: 'Obrábění', type: 'number' },
    { key: 'extraTime', label: 'Další čas', type: 'text' },
    { key: 'note', label: 'Poznámka', type: 'text' },
  ];

  let editForm = $state({
    id: 0,
    name: '',
    target: 'row' as RuleTarget,
    columnKey: '',
    conditionTree: createDefaultConditionGroup(),
    backgroundColor: '#ffffff',
    textColor: '#000000',
    fontWeight: 'normal',
    enabled: true,
    priority: 0,
  });

  const previewStyles = $derived(
    `background-color: ${editForm.backgroundColor}; color: ${editForm.textColor}; font-weight: ${editForm.fontWeight}`
  );

  function getPreviewStyles(rule: FormattingRule): string {
    return buildStyleString(rule.getStyles());
  }

  function createDefaultConditionGroup(): RuleConditionGroup {
    return {
      logic: 'AND',
      conditions: [
        {
          column: availableColumns[0].key,
          operator: 'equals',
          value: '',
        },
      ],
      groups: [],
    };
  }

  onMount(async () => {
    await loadRules();
  });

  async function loadRules(): Promise<void> {
    try {
      const db = await getDatabase();
      const result = await db.select<DbFormattingRule[]>(
        'SELECT * FROM formatting_rules ORDER BY priority ASC, createdAt DESC'
      );
      rules = result.map((r) => new FormattingRule(r));
    } catch (error) {
      logger.error('Failed to load formatting rules', error);
      showError('Nepodařilo se načíst pravidla formátování');
    }
  }

  function startCreate(): void {
    editForm = {
      id: 0,
      name: 'Nové pravidlo',
      target: 'row',
      columnKey: '',
      conditionTree: createDefaultConditionGroup(),
      backgroundColor: '#ffffcc',
      textColor: '#000000',
      fontWeight: 'normal',
      enabled: true,
      priority: rules.length,
    };
    isCreating = true;
    isEditing = true;
  }

  async function startEdit(rule: FormattingRule) {
    try {
      const conditionTree =
        typeof rule.ConditionTree === 'string'
          ? JSON.parse(rule.ConditionTree)
          : rule.ConditionTree;

      editForm = {
        id: rule.Id,
        name: rule.Name,
        target: rule.Target,
        columnKey: rule.ColumnKey || '',
        conditionTree,
        backgroundColor: rule.BackgroundColor || '#ffffff',
        textColor: rule.TextColor || '#000000',
        fontWeight: rule.FontWeight || 'normal',
        enabled: rule.Enabled,
        priority: rule.Priority,
      };
      isCreating = false;
      isEditing = true;
    } catch (error) {
      logger.error('Failed to parse condition tree', error);
      showError('Nepodařilo se načíst podmínky pravidla');
    }
  }

  function cancelEdit(): void {
    isEditing = false;
    isCreating = false;
  }

  async function saveRule(): Promise<void> {
    try {
      const db = await getDatabase();
      const conditionTreeJson = JSON.stringify(editForm.conditionTree);

      if (isCreating) {
        await db.execute(
          `INSERT INTO formatting_rules (
            name, target, columnKey, conditionTree,
            backgroundColor, textColor, fontWeight,
            enabled, priority, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
          [
            editForm.name,
            editForm.target,
            editForm.target === 'cell' ? editForm.columnKey : null,
            conditionTreeJson,
            editForm.backgroundColor,
            editForm.textColor,
            editForm.fontWeight,
            editForm.enabled ? 1 : 0,
            editForm.priority,
          ]
        );
      } else {
        await db.execute(
          `UPDATE formatting_rules SET
            name = ?, target = ?, columnKey = ?, conditionTree = ?,
            backgroundColor = ?, textColor = ?, fontWeight = ?,
            enabled = ?, priority = ?, updatedAt = datetime('now')
          WHERE id = ?`,
          [
            editForm.name,
            editForm.target,
            editForm.target === 'cell' ? editForm.columnKey : null,
            conditionTreeJson,
            editForm.backgroundColor,
            editForm.textColor,
            editForm.fontWeight,
            editForm.enabled ? 1 : 0,
            editForm.priority,
            editForm.id,
          ]
        );
      }

      await loadRules();
      await reloadFormattingRules();
      cancelEdit();

      showSuccess('Pravidlo formátování bylo uloženo');
    } catch (error) {
      logger.error('Failed to save formatting rule', error);
      showError('Nepodařilo se uložit pravidlo formátování');
    }
  }

  async function deleteRule(ruleId: number): Promise<void> {
    if (!confirm('Opravdu chcete smazat toto pravidlo?')) {
      return;
    }

    try {
      const db = await getDatabase();
      await db.execute('DELETE FROM formatting_rules WHERE id = ?', [ruleId]);
      await loadRules();
      await reloadFormattingRules();

      showSuccess('Pravidlo formátování bylo smazáno');
    } catch (error) {
      logger.error('Failed to delete formatting rule', error);
      showError('Nepodařilo se smazat pravidlo formátování');
    }
  }

  async function toggleEnabled(rule: FormattingRule): Promise<void> {
    try {
      const db = await getDatabase();
      await db.execute(
        "UPDATE formatting_rules SET enabled = ?, updatedAt = datetime('now') WHERE id = ?",
        [rule.Enabled ? 0 : 1, rule.Id]
      );
      await loadRules();
      await reloadFormattingRules();
    } catch (error) {
      logger.error('Failed to toggle rule', error);
    }
  }

  async function movePriority(rule: FormattingRule, direction: 'up' | 'down'): Promise<void> {
    const currentIndex = rules.findIndex((r) => r.Id === rule.Id);
    if (currentIndex === -1) return;

    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (swapIndex < 0 || swapIndex >= rules.length) return;

    try {
      const db = await getDatabase();
      const swapRule = rules[swapIndex];

      await db.execute('UPDATE formatting_rules SET priority = ? WHERE id = ?', [
        swapRule.Priority,
        rule.Id,
      ]);
      await db.execute('UPDATE formatting_rules SET priority = ? WHERE id = ?', [
        rule.Priority,
        swapRule.Id,
      ]);

      await loadRules();
      await reloadFormattingRules();
    } catch (error) {
      logger.error('Failed to change priority', error);
    }
  }
</script>

<dialog bind:this={dialog} class="formatting-dialog">
  <div class="formatting-rules-editor">
    <div class="editor-header">
      <h2>
        <Icon name="mdiAlertCircle" size={24} color="#285597" />
        Pravidla formátování
      </h2>
      <Button
        onClick={() => (SETTINGS_VARS.formatterOpened = false)}
        icon="mdiClose"
        iconSize={20}
      />
    </div>

    <div class="editor-content">
      {#if !isEditing}
        <!-- Rules List -->
        <div class="rules-list">
          <div class="list-header">
            <h3>Definovaná pravidla</h3>
            <Button icon="mdiAlertCircle" onClick={startCreate} primary>Nové pravidlo</Button>
          </div>

          {#if rules.length === 0}
            <div class="empty-state">
              <Icon name="mdiInformation" size={32} color="#ff9800" />
              <p>Zatím nejsou definována žádná pravidla formátování</p>
              <Button onClick={startCreate} primary style="scale: 1.3; margin-top: 20px">
                Vytvořit první pravidlo
              </Button>
            </div>
          {:else}
            <div class="rules-table">
              {#each rules as rule, index}
                <div class="rule-row" class:disabled={!rule.Enabled}>
                  <div class="rule-priority">
                    <div class="priority-controls">
                      <Button
                        disabled={index === 0}
                        icon="mdiChevronUp"
                        onClick={() => movePriority(rule, 'up')}
                        primary
                        onlyIcon
                      />
                      <span class="priority-number">{index + 1}</span>
                      <Button
                        disabled={index === rules.length - 1}
                        icon="mdiChevronDown"
                        onClick={() => movePriority(rule, 'down')}
                        primary
                        onlyIcon
                      />
                    </div>
                  </div>

                  <div class="rule-info">
                    <div class="rule-name">{rule.Name}</div>
                    <div class="rule-details">
                      <span class="badge">{rule.Target === 'row' ? 'Řádek' : 'Buňka'}</span>
                      {#if rule.Target === 'cell' && rule.ColumnKey}
                        <span class="column-key">{rule.ColumnKey}</span>
                      {/if}
                    </div>
                  </div>

                  <div class="rule-preview" style={getPreviewStyles(rule)}>Náhled</div>

                  <div class="rule-actions">
                    <Button
                      icon={rule.Enabled ? 'mdiCheckCircle' : 'mdiCheckCircleOutline'}
                      onClick={() => toggleEnabled(rule)}
                      success
                      onlyIcon
                    />
                    <Button
                      icon="mdiAlertCircle"
                      onClick={() => startEdit(rule)}
                      primary
                      onlyIcon
                    />
                    <Button
                      icon="mdiTrashCan"
                      onClick={() => deleteRule(rule.Id)}
                      danger
                      onlyIcon
                    />
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {:else}
        <!-- Edit Form -->
        <div class="edit-form">
          <div class="form-header">
            <h3>{isCreating ? 'Nové pravidlo' : 'Upravit pravidlo'}</h3>
          </div>

          <div class="form-section">
            <label>
              Název pravidla
              <input
                type="text"
                bind:value={editForm.name}
                class="form-input"
                placeholder="Např. Hotové programy"
              />
            </label>
          </div>

          <div class="form-section">
            <label>
              Cíl formátování
              <select bind:value={editForm.target} class="form-select">
                <option value="row">Celý řádek</option>
                <option value="cell">Konkrétní buňka</option>
              </select>
            </label>

            {#if editForm.target === 'cell'}
              <label>
                Sloupec
                <select bind:value={editForm.columnKey} class="form-select">
                  <option value="">-- Vyberte sloupec --</option>
                  {#each availableColumns as column}
                    <option value={column.key}>{column.label}</option>
                  {/each}
                </select>
              </label>
            {/if}
          </div>

          <div class="form-section">
            <h4>Podmínky</h4>
            <ConditionBuilder bind:group={editForm.conditionTree} {availableColumns} />
          </div>

          <div class="form-section">
            <h4>Styly</h4>
            <div class="style-grid">
              <label>
                Barva pozadí
                <ColorPicker bind:hex={editForm.backgroundColor} isAlpha={true} />
              </label>

              <label>
                Barva textu
                <ColorPicker bind:hex={editForm.textColor} isAlpha={true} />
              </label>

              <label>
                Tloušťka písma
                <select bind:value={editForm.fontWeight} class="form-select">
                  <option value="normal">Normální</option>
                  <option value="bold">Tučné</option>
                  <option value="lighter">Tenké</option>
                </select>
              </label>

              <label class="checkbox-label">
                <input type="checkbox" bind:checked={editForm.enabled} />
                Povolit pravidlo
              </label>
            </div>

            <div class="preview-box" style={previewStyles}>Náhled formátování</div>
          </div>

          <div class="form-actions">
            <Button onClick={cancelEdit} icon="mdiClose">Zrušit</Button>
            <Button onClick={saveRule} primary icon="mdiContentSave">Uložit pravidlo</Button>
          </div>
        </div>
      {/if}
    </div>
  </div>
</dialog>

<style lang="scss">
  .formatting-dialog {
    width: 920px;
    height: 80vh;
  }

  .formatting-rules-editor {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .editor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    background: white;

    h2 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      font-size: 20px;
      color: #183868;
    }

    .btn-close {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
      background: transparent;
      border: none;
      cursor: pointer;
      color: #666;

      &:hover {
        color: #000;
      }
    }
  }

  .editor-content {
    flex: 1;
    overflow: auto;
    padding: 20px;
  }

  .rules-list {
    max-width: 1200px;
    margin: 0 auto;

    .list-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;

      h3 {
        margin: 0;
        color: #183868;
      }
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      text-align: center;
      color: #999;

      p {
        margin: 12px 0 20px;
        font-size: 16px;
      }
    }

    .rules-table {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .rule-row {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 12px 16px;
      background: white;
      border: 1px solid #ddd;
      border-radius: 6px;
      transition: all 0.2s;

      &:hover {
        border-color: #183868;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      &.disabled {
        opacity: 0.5;
      }

      .rule-priority {
        .priority-controls {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;

          .priority-number {
            font-size: 12px;
            font-weight: bold;
            color: #183868;
          }
        }
      }

      .rule-info {
        flex: 1;

        .rule-name {
          font-weight: 500;
          font-size: 15px;
          margin-bottom: 4px;
        }

        .rule-details {
          display: flex;
          gap: 8px;
          font-size: 12px;

          .badge {
            padding: 2px 8px;
            background: #183868;
            color: white;
            border-radius: 3px;
          }

          .column-key {
            padding: 2px 8px;
            background: #e8e8e8;
            border-radius: 3px;
            font-family: monospace;
          }
        }
      }

      .rule-preview {
        padding: 6px 16px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 13px;
      }

      .rule-actions {
        display: flex;
        gap: 4px;
      }
    }
  }

  .edit-form {
    max-width: 900px;
    margin: 0 auto;
    background: white;
    border-radius: 8px;
    padding: 24px;

    .form-header {
      margin-bottom: 24px;

      h3 {
        margin: 0;
        color: #183868;
        font-size: 18px;
      }
    }

    .form-section {
      margin-bottom: 24px;

      h4 {
        margin: 0 0 12px;
        color: #183868;
        font-size: 15px;
        font-weight: 600;
      }

      label {
        display: block;
        margin-bottom: 12px;
        font-size: 13px;
        font-weight: 500;
        color: #333;
      }

      .form-input,
      .form-select {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #ccc;
        border-radius: 4px;
        font-size: 14px;
        margin-top: 4px;

        &:focus {
          outline: none;
          border-color: #183868;
        }
      }

      .style-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 4px;

          input[type='checkbox'] {
            width: 18px;
            height: 18px;
            cursor: pointer;
          }
        }
      }

      .preview-box {
        margin-top: 12px;
        padding: 16px;
        border: 1px solid #ddd;
        border-radius: 4px;
        text-align: center;
        font-size: 14px;
      }
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding-top: 16px;
      border-top: 1px solid #eee;
    }
  }
</style>

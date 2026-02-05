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
  import { TABLECOLUMNS } from '$lib/tableColumnProcessor.svelte';
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

  // Get columns dynamically from table columns, excluding system/action columns
  const availableColumns = $derived(
    TABLECOLUMNS.filter((col) => !['actions', 'id'].includes(col.Key)).map((col) => ({
      key: col.Key,
      label: col.Label || col.Key,
      type: col.Type === 'number' ? 'number' : col.Type === 'date' || col.Type === 'datetime' ? 'date' : 'text',
    }))
  );

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
          column: availableColumns.length > 0 ? availableColumns[0].key : '',
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
        <Icon name="mdiAlertCircle" size={24} color="var(--color-primary)" />
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
    padding: var(--space-6) var(--space-8);
    background: var(--color-bg);

    h2 {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      margin: 0;
      font-size: var(--font-size-xl);
      color: var(--color-primary-dark);
    }

  }

  .editor-content {
    flex: 1;
    overflow: auto;
    padding: var(--space-8);
  }

  .rules-list {
    max-width: 1200px;
    margin: 0 auto;

    .list-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--space-8);

      h3 {
        margin: 0;
        color: var(--color-primary-dark);
      }
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2.5rem var(--space-8);
      text-align: center;
      color: var(--color-text-muted);

      p {
        margin: var(--space-6) 0 var(--space-8);
        font-size: var(--font-size-md);
      }
    }

    .rules-table {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }

    .rule-row {
      display: flex;
      align-items: center;
      gap: var(--space-6);
      padding: var(--space-4) var(--space-6);
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      transition: all var(--transition-base);

      &:hover {
        border-color: var(--color-primary-dark);
        box-shadow: var(--shadow-sm);
      }

      &.disabled {
        opacity: 0.5;
      }

      .rule-priority {
        .priority-controls {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-1);

          .priority-number {
            font-size: var(--font-size-xs);
            font-weight: bold;
            color: var(--color-primary-dark);
          }
        }
      }

      .rule-info {
        flex: 1;

        .rule-name {
          font-weight: 500;
          font-size: var(--font-size-base);
          margin-bottom: var(--space-1);
        }

        .rule-details {
          display: flex;
          gap: var(--space-3);
          font-size: var(--font-size-xs);

          .badge {
            padding: var(--space-1) var(--space-3);
            background: var(--color-primary-dark);
            color: var(--color-text-on-primary);
            border-radius: var(--radius-sm);
          }

          .column-key {
            padding: var(--space-1) var(--space-3);
            background: var(--color-bg-muted);
            border-radius: var(--radius-sm);
            font-family: var(--font-mono);
          }
        }
      }

      .rule-preview {
        padding: var(--space-3) var(--space-6);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        font-size: var(--font-size-sm);
      }

      .rule-actions {
        display: flex;
        gap: var(--space-2);
      }
    }
  }

  .edit-form {
    max-width: 900px;
    margin: 0 auto;
    background: var(--color-bg);
    border-radius: var(--radius-lg);
    padding: var(--space-8);

    .form-header {
      margin-bottom: var(--space-8);

      h3 {
        margin: 0;
        color: var(--color-primary-dark);
        font-size: var(--font-size-lg);
      }
    }

    .form-section {
      margin-bottom: var(--space-8);

      h4 {
        margin: 0 0 var(--space-4);
        color: var(--color-primary-dark);
        font-size: var(--font-size-base);
        font-weight: 600;
      }

      label {
        display: block;
        margin-bottom: var(--space-4);
        font-size: var(--font-size-sm);
        font-weight: 500;
        color: var(--color-text);
      }

      .form-input,
      .form-select {
        width: 100%;
        padding: var(--space-3) var(--space-4);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        font-size: var(--font-size-base);
        margin-top: var(--space-2);

        &:focus {
          outline: none;
          border-color: var(--color-primary-dark);
        }
      }

      .style-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: var(--space-6);

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: var(--space-4);
          margin-top: var(--space-2);

          input[type='checkbox'] {
            width: 18px;
            height: 18px;
            cursor: pointer;
          }
        }
      }

      .preview-box {
        margin-top: var(--space-6);
        padding: var(--space-6);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        text-align: center;
        font-size: var(--font-size-base);
      }
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-4);
      padding-top: var(--space-6);
      border-top: 1px solid var(--color-border-lighter);
    }
  }
</style>

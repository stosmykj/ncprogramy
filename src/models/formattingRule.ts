import type {
  DbFormattingRule,
  RuleCondition,
  RuleConditionGroup,
  RuleConditionOperator,
  RuleTarget,
} from './dbFormattingRule';

export class FormattingRule {
  Id: number;
  CreatedAt: Date;
  UpdatedAt: Date;
  Name: string;
  Target: RuleTarget;
  ColumnKey?: string;
  ConditionTree: RuleConditionGroup;
  BackgroundColor?: string;
  TextColor?: string;
  FontWeight?: string;
  Enabled: boolean;
  Priority: number;

  constructor(data: DbFormattingRule) {
    this.Id = data.id;
    this.CreatedAt = new Date(data.createdAt);
    this.UpdatedAt = new Date(data.updatedAt);
    this.Name = data.name;
    this.Target = data.target;
    this.ColumnKey = data.columnKey;
    try {
      this.ConditionTree = JSON.parse(data.conditionTree);
    } catch {
      this.ConditionTree = { logic: 'AND', conditions: [] };
    }
    this.BackgroundColor = data.backgroundColor;
    this.TextColor = data.textColor;
    this.FontWeight = data.fontWeight;
    this.Enabled = data.enabled;
    this.Priority = data.priority;
  }

  toDbFormattingRule(): DbFormattingRule {
    return {
      id: this.Id,
      createdAt: this.CreatedAt,
      updatedAt: this.UpdatedAt,
      name: this.Name,
      target: this.Target,
      columnKey: this.ColumnKey,
      conditionTree: JSON.stringify(this.ConditionTree),
      backgroundColor: this.BackgroundColor,
      textColor: this.TextColor,
      fontWeight: this.FontWeight,
      enabled: this.Enabled,
      priority: this.Priority,
    };
  }

  toArray(): Array<string | number | boolean | undefined> {
    return [
      this.Name,
      this.Target,
      this.ColumnKey,
      JSON.stringify(this.ConditionTree),
      this.BackgroundColor,
      this.TextColor,
      this.FontWeight,
      this.Enabled ? 1 : 0,
      this.Priority,
      new Date().toISOString(),
      this.Id,
    ];
  }

  toSqlUpdate(): string {
    return `
      UPDATE formatting_rules
      SET name = $1,
          target = $2,
          columnKey = $3,
          conditionTree = $4,
          backgroundColor = $5,
          textColor = $6,
          fontWeight = $7,
          enabled = $8,
          priority = $9,
          updatedAt = $10
      WHERE id = $11
    `;
  }

  // Evaluate a single condition
  private evaluateCondition(program: Record<string, unknown>, condition: RuleCondition): boolean {
    let value = program[condition.column];

    // Convert Date objects to ISO string for comparison
    if (value instanceof Date) {
      value = value.toISOString().split('T')[0]; // YYYY-MM-DD format
    }

    switch (condition.operator) {
      case 'equals':
        return String(value) === condition.value;
      case 'notEquals':
        return String(value) !== condition.value;
      case 'gt':
        // For dates and numbers
        if (
          typeof value === 'string' &&
          condition.value &&
          condition.value.match(/^\d{4}-\d{2}-\d{2}/)
        ) {
          return value > condition.value;
        }
        return Number(value) > Number(condition.value);
      case 'gte':
        if (
          typeof value === 'string' &&
          condition.value &&
          condition.value.match(/^\d{4}-\d{2}-\d{2}/)
        ) {
          return value >= condition.value;
        }
        return Number(value) >= Number(condition.value);
      case 'lt':
        if (
          typeof value === 'string' &&
          condition.value &&
          condition.value.match(/^\d{4}-\d{2}-\d{2}/)
        ) {
          return value < condition.value;
        }
        return Number(value) < Number(condition.value);
      case 'lte':
        if (
          typeof value === 'string' &&
          condition.value &&
          condition.value.match(/^\d{4}-\d{2}-\d{2}/)
        ) {
          return value <= condition.value;
        }
        return Number(value) <= Number(condition.value);
      case 'contains':
        return String(value).includes(condition.value || '');
      case 'empty':
        return value === null || value === undefined || value === '';
      case 'notEmpty':
        return value !== null && value !== undefined && value !== '';
      default:
        return false;
    }
  }

  // Evaluate a condition group recursively
  private evaluateGroup(program: Record<string, unknown>, group: RuleConditionGroup): boolean {
    // Evaluate all direct conditions in this group
    const conditionResults = group.conditions.map((condition) =>
      this.evaluateCondition(program, condition)
    );

    // Evaluate all nested groups
    const groupResults = (group.groups || []).map((nestedGroup) =>
      this.evaluateGroup(program, nestedGroup)
    );

    // Combine all results
    const allResults = [...conditionResults, ...groupResults];

    if (allResults.length === 0) return false;

    // Apply logic (AND/OR)
    if (group.logic === 'AND') {
      return allResults.every((result) => result);
    } else {
      // OR
      return allResults.some((result) => result);
    }
  }

  // Evaluate if this rule matches the given program
  matches(program: Record<string, unknown>): boolean {
    if (!this.Enabled) return false;
    return this.evaluateGroup(program, this.ConditionTree);
  }

  getStyles(): Partial<CSSStyleDeclaration> {
    const styles: Record<string, string> = {};

    if (this.BackgroundColor) {
      styles.backgroundColor = this.BackgroundColor;
    }
    if (this.TextColor) {
      styles.color = this.TextColor;
    }
    if (this.FontWeight) {
      styles.fontWeight = this.FontWeight;
    }

    return styles;
  }
}

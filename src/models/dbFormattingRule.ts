export type RuleConditionOperator =
  | 'equals'
  | 'notEquals'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'contains'
  | 'empty'
  | 'notEmpty';
export type RuleTarget = 'row' | 'cell';
export type RuleLogic = 'AND' | 'OR';

export interface RuleCondition {
  column: string;
  operator: RuleConditionOperator;
  value: string | Date | null;
}

export interface RuleConditionGroup {
  logic: RuleLogic;
  conditions: RuleCondition[];
  groups?: RuleConditionGroup[]; // Nested groups for complex logic
}

export interface DbFormattingRule {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  name: string;
  target: RuleTarget;
  columnKey?: string; // For cell formatting, which column to format
  conditionTree: string; // JSON of RuleConditionGroup (supports nested logic)
  backgroundColor?: string;
  textColor?: string;
  fontWeight?: string;
  enabled: boolean;
  priority: number; // Lower number = higher priority
}

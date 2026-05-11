export interface ParsedRule {
  number: number;
  inputValues: string[];
  outputValues: unknown[];
}

export interface ParsedDecisionTable {
  hitPolicy: 'FIRST' | 'UNIQUE' | 'COLLECT' | 'RULE ORDER';
  inputExpressions: string[];
  outputNames: string[];
  rules: ParsedRule[];
}

export interface ParsedDecision {
  decisionTable: ParsedDecisionTable;
  requiredDecisions: string[];
}

export type ParsedDecisions = Record<string, ParsedDecision>;

export type EvaluationContext = { [key: string]: unknown };

export type EvaluationResult = EvaluationContext | EvaluationContext[];

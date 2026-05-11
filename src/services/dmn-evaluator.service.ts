import { Inject, Injectable } from '@nestjs/common';
import { unaryTest } from 'feelin';

import { DMN_MODULE_OPTIONS } from '../dmn.constants';
import {
  EvaluationContext,
  EvaluationResult,
  ParsedDecisions,
  ParsedRule,
  ResolvedDmnModuleOptions,
} from '../interfaces';

interface ResolvedInput {
  name: string;
  value: unknown;
}

interface RuleMatch {
  matched: true;
  output: EvaluationContext;
}

interface RuleMiss {
  matched: false;
}

type RuleResult = RuleMatch | RuleMiss;

@Injectable()
export class DmnEvaluatorService {
  constructor(
    @Inject(DMN_MODULE_OPTIONS)
    protected readonly options: ResolvedDmnModuleOptions,
  ) {}

  evaluateDecision(
    decisionId: string,
    decisions: ParsedDecisions,
    context: EvaluationContext,
    alreadyEvaluated: Record<string, boolean> = {},
  ): EvaluationResult {
    const decision = decisions[decisionId];
    if (decision === undefined) {
      throw new Error(`No such decision "${decisionId}"`);
    }

    for (const requiredId of decision.requiredDecisions) {
      if (alreadyEvaluated[requiredId]) {
        continue;
      }
      const requiredResult = this.evaluateDecision(
        requiredId,
        decisions,
        context,
        alreadyEvaluated,
      );
      this.mergeContext(context, requiredResult);
      alreadyEvaluated[requiredId] = true;
    }

    const table = decision.decisionTable;
    const resolvedInputs: ResolvedInput[] = table.inputExpressions.map((expr) => {
      const name = this.options.labelToVariableName(expr);
      return { name, value: context[name] };
    });

    const isSingleHit = table.hitPolicy === 'FIRST' || table.hitPolicy === 'UNIQUE';
    const singleHitResult: EvaluationContext = {};
    const collectResults: EvaluationContext[] = [];
    if (isSingleHit) {
      for (const name of table.outputNames) {
        this.setOrAddValue(name, singleHitResult, undefined);
      }
    }

    let hasMatch = false;
    for (const rule of table.rules) {
      let ruleResult: RuleResult;
      try {
        ruleResult = this.evaluateRule(rule, resolvedInputs, table.outputNames);
      } catch (err: unknown) {
        throw new Error(`Failed to evaluate rule ${rule.number} of decision ${decisionId}`, {
          cause: err,
        });
      }
      if (!ruleResult.matched) {
        continue;
      }
      if (hasMatch && table.hitPolicy === 'UNIQUE') {
        throw new Error(`Decision "${decisionId}" is not unique but hit policy is UNIQUE.`);
      }
      hasMatch = true;
      if (!isSingleHit) {
        collectResults.push(ruleResult.output);
        continue;
      }
      for (const name of table.outputNames) {
        const value = this.resolveExpression(name, ruleResult.output);
        this.setOrAddValue(name, singleHitResult, value);
      }
      if (table.hitPolicy === 'FIRST') {
        break;
      }
    }

    return isSingleHit ? singleHitResult : collectResults;
  }

  protected isNestedRecord(value: unknown): value is EvaluationContext {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  protected coerceBoolean(value: unknown): unknown {
    if (value === true) {
      return 'true';
    }
    if (value === false) {
      return 'false';
    }
    return value;
  }

  protected setOrAddValue(expression: string, target: EvaluationContext, value: unknown): void {
    const dot = expression.indexOf('.');
    if (dot < 0) {
      const existing = target[expression];
      if (Array.isArray(existing)) {
        existing.push(value);
        return;
      }
      target[expression] = value;
      return;
    }
    const head = expression.substring(0, dot);
    const tail = expression.substring(dot + 1);
    if (target[head] === undefined || target[head] === null) {
      target[head] = {};
    }
    const next = target[head];
    if (this.isNestedRecord(next)) {
      this.setOrAddValue(tail, next, value);
    }
  }

  protected resolveExpression(expression: string, source: EvaluationContext): unknown {
    return expression.split('.').reduce<unknown>((acc, part) => {
      if (!this.isNestedRecord(acc)) {
        return undefined;
      }
      return acc[part];
    }, source);
  }

  protected mergeContext(
    context: EvaluationContext,
    additional: EvaluationContext | EvaluationContext[],
    aggregate = false,
  ): void {
    if (Array.isArray(additional)) {
      for (const result of additional) {
        this.mergeContext(context, result, true);
      }
      return;
    }
    for (const key of Object.keys(additional)) {
      const value = additional[key];
      const current = context[key];
      if (Array.isArray(current)) {
        if (Array.isArray(value)) {
          context[key] = current.concat(value);
          continue;
        }
        if (value !== null && value !== undefined) {
          current.push(value);
        }
        continue;
      }
      if (this.isNestedRecord(value) && !(value instanceof Date)) {
        if (!this.isNestedRecord(current)) {
          context[key] = {};
        }
        const next = context[key];
        if (this.isNestedRecord(next)) {
          this.mergeContext(next, value, aggregate);
        }
        continue;
      }
      if (aggregate) {
        context[key] = [value];
        continue;
      }
      context[key] = value;
    }
  }

  protected buildEvalContext(name: string, cell: string, probe: unknown): EvaluationContext {
    const ctx: EvaluationContext = { '?': probe };
    if (name && cell.includes(name)) {
      ctx[name] = probe;
    }
    return ctx;
  }

  protected matchesAllInputs(rule: ParsedRule, resolvedInputs: ResolvedInput[]): boolean {
    for (let i = 0; i < rule.inputValues.length; i++) {
      const cell = rule.inputValues[i];
      const { name, value } = resolvedInputs[i] ?? { name: '', value: undefined };
      const probe = this.coerceBoolean(value);
      try {
        if (!unaryTest(cell, this.buildEvalContext(name, cell, probe))) {
          return false;
        }
      } catch (err: unknown) {
        throw new Error(`Failed to evaluate input condition in column ${i + 1}: '${cell}'`, {
          cause: err,
        });
      }
    }
    return true;
  }

  protected buildRuleOutput(rule: ParsedRule, outputNames: string[]): EvaluationContext {
    const output: EvaluationContext = {};
    for (let i = 0; i < rule.outputValues.length; i++) {
      const value = rule.outputValues[i];
      this.setOrAddValue(outputNames[i], output, value === null ? undefined : value);
    }
    return output;
  }

  protected evaluateRule(
    rule: ParsedRule,
    resolvedInputs: ResolvedInput[],
    outputNames: string[],
  ): RuleResult {
    if (!this.matchesAllInputs(rule, resolvedInputs)) {
      return { matched: false };
    }
    return { matched: true, output: this.buildRuleOutput(rule, outputNames) };
  }
}

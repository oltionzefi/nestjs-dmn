import { Inject, Injectable } from '@nestjs/common';
import {
  DmnDecision,
  DmnDecisionRule,
  DmnDecisionTable,
  DmnDefinitions,
  DmnHitPolicy,
  DmnInformationRequirement,
  DmnInputClause,
  DmnModdle,
  DmnOutputClause,
  ModdleElement,
} from 'dmn-moddle';

import { DMN_MODULE_OPTIONS } from '../dmn.constants';
import {
  ParsedDecisionTable,
  ParsedDecisions,
  ParsedRule,
  ResolvedDmnModuleOptions,
} from '../interfaces';

@Injectable()
export class DmnParserService {
  constructor(
    @Inject(DMN_MODULE_OPTIONS)
    protected readonly options: ResolvedDmnModuleOptions,
  ) {}

  async parseDmnXml(xml: string): Promise<ParsedDecisions> {
    const definitions = await this.fromXml(xml);
    const drgElements: ModdleElement[] = definitions?.drgElement ?? [];
    const decisions: ParsedDecisions = {};
    for (const element of drgElements) {
      if (!this.isDecision(element)) {
        continue;
      }
      if (!element.decisionLogic) {
        continue;
      }
      decisions[element.id] = {
        decisionTable: this.parseDecisionTable(element.decisionLogic),
        requiredDecisions: this.collectRequiredDecisions(element),
      };
    }
    return decisions;
  }

  protected async fromXml(xml: string): Promise<DmnDefinitions> {
    const moddle = DmnModdle();
    const { rootElement } = await moddle.fromXML(xml, 'dmn:Definitions');
    return rootElement;
  }

  protected parseOutputCell(text: string | undefined): unknown {
    if (text === undefined || text === null || text === '') {
      return null;
    }
    return this.options.outputCellParser(text);
  }

  protected parseInputCell(text: string | undefined): string {
    const value = text ?? '';
    if (value === '') {
      return '-';
    }
    if (value === 'true') {
      return '"true"';
    }
    if (value === 'false') {
      return '"false"';
    }
    return value;
  }

  protected parseRule(rule: DmnDecisionRule, idx: number): ParsedRule {
    const inputEntries = rule.inputEntry ?? [];
    const outputEntries = rule.outputEntry ?? [];
    return {
      number: idx + 1,
      inputValues: inputEntries.map((entry) => this.parseInputCell(entry?.text)),
      outputValues: outputEntries.map((entry) => this.parseOutputCell(entry?.text)),
    };
  }

  protected resolveInputExpression(input: DmnInputClause): string {
    if (input?.inputVariable) {
      return input.inputVariable;
    }
    if (input?.inputExpression?.text) {
      return input.inputExpression.text;
    }
    if (input?.label) {
      return input.label;
    }
    throw new Error(`No input variable or expression set for input '${input?.id ?? 'unknown'}'`);
  }

  protected parseOutputName(output: DmnOutputClause): string {
    if (!output?.name) {
      throw new Error(`No name set for output "${output?.id ?? 'unknown'}"`);
    }
    return output.name;
  }

  protected parseDecisionTable(decisionTable: DmnDecisionTable): ParsedDecisionTable {
    const hitPolicy: DmnHitPolicy = decisionTable.hitPolicy ?? 'UNIQUE';
    if (!this.options.supportedHitPolicies.has(hitPolicy)) {
      throw new Error(`Unsupported hit policy ${hitPolicy}`);
    }
    const inputs: DmnInputClause[] = decisionTable.input ?? [];
    const outputs: DmnOutputClause[] = decisionTable.output ?? [];
    const rules: DmnDecisionRule[] = decisionTable.rule ?? [];
    return {
      hitPolicy: hitPolicy as ParsedDecisionTable['hitPolicy'],
      inputExpressions: inputs.map((input) => this.resolveInputExpression(input)),
      outputNames: outputs.map((output) => this.parseOutputName(output)),
      rules: rules.map((rule, idx) => this.parseRule(rule, idx)),
    };
  }

  protected collectRequiredDecisions(decision: DmnDecision): string[] {
    const requirements: DmnInformationRequirement[] = decision.informationRequirement ?? [];
    return requirements
      .map((req) => req?.requiredDecision?.href)
      .filter((href): href is string => Boolean(href))
      .map((href) => href.replace(/^#/, ''));
  }

  protected isDecision(element: ModdleElement): element is DmnDecision {
    return element?.$type === 'dmn:Decision';
  }
}

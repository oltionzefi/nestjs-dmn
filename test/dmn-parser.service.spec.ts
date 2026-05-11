import { Test } from '@nestjs/testing';

import { DmnModule, DmnParserService, ParsedDecisions, DmnModuleOptions } from '../src';
import {
  AMBIGUOUS_UNIQUE_DMN,
  BROKEN_FEEL_DMN,
  COLLECT_DMN,
  DRG_DMN,
  FIRST_PRICING_DMN,
  INVALID_INPUT_EXPRESSION_DMN,
  INVALID_OUTPUT_NAME_DMN,
  LABEL_DRIVEN_DMN,
  NESTED_OUTPUT_DMN,
  UNIQUE_DMN,
} from './fixtures';

async function buildParser(options: DmnModuleOptions = {}): Promise<DmnParserService> {
  const moduleRef = await Test.createTestingModule({
    imports: [DmnModule.forRoot(options)],
  }).compile();
  return moduleRef.get(DmnParserService);
}

describe('DmnParserService', () => {
  describe('basic parsing', () => {
    let parsed: ParsedDecisions;

    beforeAll(async () => {
      const parser = await buildParser();
      parsed = await parser.parseDmnXml(FIRST_PRICING_DMN);
    });

    it('keys the result map by decision id', () => {
      expect(Object.keys(parsed)).toEqual(['pricing']);
    });

    it('preserves input expression order', () => {
      expect(parsed.pricing.decisionTable.inputExpressions).toEqual([
        'companyAge',
        'revenue',
        'industry',
      ]);
    });

    it('preserves output column order', () => {
      expect(parsed.pricing.decisionTable.outputNames).toEqual(['fee', 'minAmount']);
    });

    it('exposes the hit policy', () => {
      expect(parsed.pricing.decisionTable.hitPolicy).toBe('FIRST');
    });

    it('numbers rules 1-based for clearer error messages', () => {
      const numbers = parsed.pricing.decisionTable.rules.map((r) => r.number);
      expect(numbers).toEqual([1, 2, 3, 4]);
    });

    it('returns no requiredDecisions for a standalone decision', () => {
      expect(parsed.pricing.requiredDecisions).toEqual([]);
    });
  });

  describe('input cell handling', () => {
    it('treats blank input cells as the FEEL "any" idiom (-)', async () => {
      const parser = await buildParser();
      const result = await parser.parseDmnXml(FIRST_PRICING_DMN);
      expect(result.pricing.decisionTable.rules[3].inputValues).toEqual(['-', '-', '-']);
    });

    it('keeps FEEL range, comparator, and negation syntax verbatim', async () => {
      const parser = await buildParser();
      const result = await parser.parseDmnXml(FIRST_PRICING_DMN);
      expect(result.pricing.decisionTable.rules[0].inputValues[0]).toBe('[0..12[');
      expect(result.pricing.decisionTable.rules[1].inputValues[0]).toBe('>= 60');
      expect(result.pricing.decisionTable.rules[1].inputValues[2]).toBe(
        'not("Hotel & Gastronomie")',
      );
    });
  });

  describe('output cell decoding', () => {
    it('JSON-decodes by default so numeric cells come back as numbers', async () => {
      const parser = await buildParser();
      const result = await parser.parseDmnXml(FIRST_PRICING_DMN);
      expect(result.pricing.decisionTable.rules[0].outputValues).toEqual([7.2, 150]);
    });

    it('JSON-decodes quoted string cells, stripping the quotes', async () => {
      const parser = await buildParser();
      const result = await parser.parseDmnXml(UNIQUE_DMN);
      expect(result.bucket.decisionTable.rules[0].outputValues).toEqual(['low']);
    });

    it('returns raw text when outputCellParser is "raw"', async () => {
      const parser = await buildParser({ outputCellParser: 'raw' });
      const result = await parser.parseDmnXml(FIRST_PRICING_DMN);
      expect(result.pricing.decisionTable.rules[0].outputValues).toEqual(['7.20', '150']);
    });

    it('invokes a custom decoder function', async () => {
      const decoder = jest.fn((text: string) => `decoded:${text}`);
      const parser = await buildParser({ outputCellParser: decoder });
      const result = await parser.parseDmnXml(UNIQUE_DMN);
      expect(decoder).toHaveBeenCalled();
      expect(result.bucket.decisionTable.rules[0].outputValues).toEqual(['decoded:"low"']);
    });

    it('treats empty output cells as null', async () => {
      const parser = await buildParser();
      const xml = FIRST_PRICING_DMN.replace(
        '<outputEntry id="r1o1"><text>7.20</text></outputEntry>',
        '<outputEntry id="r1o1"><text></text></outputEntry>',
      );
      const result = await parser.parseDmnXml(xml);
      expect(result.pricing.decisionTable.rules[0].outputValues[0]).toBeNull();
    });
  });

  describe('hit-policy gating', () => {
    it('rejects DMN files whose hit policy is not in the configured allowlist', async () => {
      const parser = await buildParser({ supportedHitPolicies: ['UNIQUE'] });
      await expect(parser.parseDmnXml(FIRST_PRICING_DMN)).rejects.toThrow(
        /Unsupported hit policy FIRST/,
      );
    });

    it('accepts all four default hit policies', async () => {
      const parser = await buildParser();
      await expect(parser.parseDmnXml(FIRST_PRICING_DMN)).resolves.toBeDefined();
      await expect(parser.parseDmnXml(UNIQUE_DMN)).resolves.toBeDefined();
      await expect(parser.parseDmnXml(COLLECT_DMN)).resolves.toBeDefined();
    });

    it('defaults to UNIQUE when the decision table omits hitPolicy', async () => {
      const parser = await buildParser();
      const xml = FIRST_PRICING_DMN.replace(' hitPolicy="FIRST"', '');
      const result = await parser.parseDmnXml(xml);
      expect(result.pricing.decisionTable.hitPolicy).toBe('UNIQUE');
    });
  });

  describe('input-expression resolution', () => {
    it('prefers `inputExpression.text` over the label', async () => {
      const parser = await buildParser();
      const result = await parser.parseDmnXml(FIRST_PRICING_DMN);
      expect(result.pricing.decisionTable.inputExpressions[0]).toBe('companyAge');
    });

    it('falls back to the label when there is no inputExpression', async () => {
      const parser = await buildParser();
      const result = await parser.parseDmnXml(LABEL_DRIVEN_DMN);
      expect(result.byLabel.decisionTable.inputExpressions).toEqual(['Customer Age']);
    });

    it('throws when neither inputExpression nor label is set', async () => {
      const parser = await buildParser();
      await expect(parser.parseDmnXml(INVALID_INPUT_EXPRESSION_DMN)).rejects.toThrow(
        /No input variable or expression set/,
      );
    });
  });

  describe('output validation', () => {
    it('throws when an output column is missing its name attribute', async () => {
      const parser = await buildParser();
      await expect(parser.parseDmnXml(INVALID_OUTPUT_NAME_DMN)).rejects.toThrow(
        /No name set for output/,
      );
    });
  });

  describe('DRG composition', () => {
    it('collects required-decision ids and strips the # prefix', async () => {
      const parser = await buildParser();
      const result = await parser.parseDmnXml(DRG_DMN);
      // DRG_DMN has informationRequirement → requiredInput, not requiredDecision.
      expect(result.tier.requiredDecisions).toEqual([]);
      expect(result.discount.requiredDecisions).toEqual([]);
    });
  });

  describe('XML hardening', () => {
    it('accepts a parseable cell expression that is invalid FEEL — failure surfaces at evaluate time, not parse time', async () => {
      const parser = await buildParser();
      const result = await parser.parseDmnXml(BROKEN_FEEL_DMN);
      expect(result.broken.decisionTable.rules[0].inputValues[0]).toBe('function(){');
    });

    it('returns an empty record for a definitions element with no decisions', async () => {
      const parser = await buildParser();
      const xml = `<?xml version="1.0"?><definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/" id="empty" name="DRD" namespace="https://example.com/dmn"></definitions>`;
      await expect(parser.parseDmnXml(xml)).resolves.toEqual({});
    });

    it('handles nested output names without losing column order', async () => {
      const parser = await buildParser();
      const result = await parser.parseDmnXml(NESTED_OUTPUT_DMN);
      expect(result.quote.decisionTable.outputNames).toEqual(['fee.value', 'fee.currency']);
    });
  });

  describe('AMBIGUOUS_UNIQUE_DMN parse-time', () => {
    it('parses ambiguity quietly — the throw is for the evaluator, not the parser', async () => {
      const parser = await buildParser();
      const result = await parser.parseDmnXml(AMBIGUOUS_UNIQUE_DMN);
      expect(result.bucket.decisionTable.rules).toHaveLength(2);
    });
  });
});

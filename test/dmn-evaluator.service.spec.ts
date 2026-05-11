import { Test } from '@nestjs/testing';

import {
  DmnEvaluatorService,
  DmnModule,
  DmnModuleOptions,
  DmnParserService,
  EvaluationContext,
  EvaluationResult,
  ParsedDecisions,
} from '../src';
import {
  AMBIGUOUS_UNIQUE_DMN,
  BROKEN_FEEL_DMN,
  COLLECT_DMN,
  DRG_WITH_REQUIRED_DECISION_DMN,
  FIRST_PRICING_DMN,
  NESTED_OUTPUT_DMN,
  UNIQUE_DMN,
} from './fixtures';

interface EvaluatorBundle {
  parser: DmnParserService;
  evaluator: DmnEvaluatorService;
}

async function buildBundle(options: DmnModuleOptions = {}): Promise<EvaluatorBundle> {
  const moduleRef = await Test.createTestingModule({
    imports: [DmnModule.forRoot(options)],
  }).compile();
  return {
    parser: moduleRef.get(DmnParserService),
    evaluator: moduleRef.get(DmnEvaluatorService),
  };
}

async function run(
  options: DmnModuleOptions,
  xml: string,
  context: EvaluationContext,
): Promise<EvaluationResult> {
  const { parser, evaluator } = await buildBundle(options);
  const decisions = await parser.parseDmnXml(xml);
  const [id] = Object.keys(decisions);
  return evaluator.evaluateDecision(id, decisions, context);
}

async function runDecision(
  options: DmnModuleOptions,
  xml: string,
  context: EvaluationContext,
  decisionId: string,
): Promise<EvaluationResult> {
  const { parser, evaluator } = await buildBundle(options);
  const decisions = await parser.parseDmnXml(xml);
  return evaluator.evaluateDecision(decisionId, decisions, context);
}

describe('DmnEvaluatorService', () => {
  describe('FIRST hit policy', () => {
    it.each([
      {
        label: 'founder rate (companyAge < 12)',
        context: { companyAge: 5, revenue: 10_000, industry: 'Handel' },
        expected: { fee: 7.2, minAmount: 150 },
      },
      {
        label: 'discounted rate (companyAge ≥ 60, revenue ≥ 2M, not hospitality)',
        context: { companyAge: 60, revenue: 2_000_000, industry: 'Handel' },
        expected: { fee: 4.6, minAmount: 150 },
      },
      {
        label: 'mid-tier rate (companyAge ≥ 24, revenue ≥ 250k, not hospitality)',
        context: { companyAge: 30, revenue: 300_000, industry: 'Bau' },
        expected: { fee: 5.2, minAmount: 150 },
      },
      {
        label: 'fallback rate (hospitality eligible for nothing else)',
        context: { companyAge: 60, revenue: 2_000_000, industry: 'Hotel & Gastronomie' },
        expected: { fee: 5.9, minAmount: 150 },
      },
      {
        label: 'fallback rate (nothing else matches)',
        context: { companyAge: 13, revenue: 500, industry: 'Other' },
        expected: { fee: 5.9, minAmount: 150 },
      },
    ])('matches the $label', async ({ context, expected }) => {
      await expect(run({}, FIRST_PRICING_DMN, context)).resolves.toEqual(expected);
    });

    it('stops at the first match without evaluating subsequent rules', async () => {
      // r1 (companyAge ∈ [0..12[) matches and the standard fallback (r4) must NOT
      // overwrite the result, even though both rules apply.
      const result = await run({}, FIRST_PRICING_DMN, {
        companyAge: 5,
        revenue: 10_000,
        industry: 'Handel',
      });
      expect(result).toEqual({ fee: 7.2, minAmount: 150 });
    });
  });

  describe('UNIQUE hit policy', () => {
    it.each([
      { score: 10, tier: 'low' },
      { score: 60, tier: 'mid' },
      { score: 95, tier: 'high' },
    ])('routes score=$score to tier=$tier', async ({ score, tier }) => {
      await expect(run({}, UNIQUE_DMN, { score })).resolves.toEqual({ tier });
    });

    it('throws when more than one rule matches', async () => {
      await expect(run({}, AMBIGUOUS_UNIQUE_DMN, { score: 80 })).rejects.toThrow(
        /is not unique but hit policy is UNIQUE/,
      );
    });

    it('returns undefined fields when nothing matches', async () => {
      const noMatchUniqueDmn = UNIQUE_DMN.replace(/<rule id="r3">[\s\S]*?<\/rule>/, '');
      await expect(run({}, noMatchUniqueDmn, { score: 95 })).resolves.toEqual({
        tier: undefined,
      });
    });
  });

  describe('COLLECT hit policy', () => {
    it('returns the empty list when no rule matches', async () => {
      await expect(run({}, COLLECT_DMN, { years: 0 })).resolves.toEqual([]);
    });

    it('returns every matching rule as an array', async () => {
      const result = await run({}, COLLECT_DMN, { years: 12 });
      expect(result).toEqual([{ badge: 'rookie' }, { badge: 'veteran' }, { badge: 'master' }]);
    });

    it('returns only the subset that matched', async () => {
      const result = await run({}, COLLECT_DMN, { years: 6 });
      expect(result).toEqual([{ badge: 'rookie' }, { badge: 'veteran' }]);
    });
  });

  describe('DRG-style required decisions', () => {
    it('evaluates the upstream decision and feeds its output back into the context', async () => {
      const result = await runDecision(
        {},
        DRG_WITH_REQUIRED_DECISION_DMN,
        { score: 90 },
        'discount',
      );
      // tier→"high" feeds the discount table → 0.2
      expect(result).toEqual({ discount: 0.2 });
    });

    it('flips both branches based on the upstream decision result', async () => {
      const result = await runDecision(
        {},
        DRG_WITH_REQUIRED_DECISION_DMN,
        { score: 10 },
        'discount',
      );
      // tier→"low" → discount 0
      expect(result).toEqual({ discount: 0 });
    });
  });

  describe('configuration', () => {
    it('uses a custom labelToVariableName', async () => {
      const result = await run(
        { labelToVariableName: (label) => label.replace(/\s+/g, '_').toLowerCase() },
        UNIQUE_DMN,
        { score: 60 }, // inputExpression "score" wins regardless; we just prove no regression
      );
      expect(result).toEqual({ tier: 'mid' });
    });

    it('coerces boolean context values to strings so FEEL string literals match', async () => {
      const xml = UNIQUE_DMN.replace(
        '<rule id="r2">',
        '<rule id="r2-bool"><inputEntry id="r2bi"><text>"true"</text></inputEntry><outputEntry id="r2bo"><text>"boolean-match"</text></outputEntry></rule><rule id="r2">',
      );
      const { parser, evaluator } = await buildBundle();
      const decisions = await parser.parseDmnXml(xml);
      // We added an extra rule above; force-coerce by using an explicit boolean context.
      const id = Object.keys(decisions)[0];
      const result = evaluator.evaluateDecision(id, decisions, { score: true });
      expect(result).toEqual({ tier: 'boolean-match' });
    });
  });

  describe('error semantics', () => {
    it('throws "No such decision" for an unknown decision id', async () => {
      const { parser, evaluator } = await buildBundle();
      const decisions = await parser.parseDmnXml(UNIQUE_DMN);
      expect(() => evaluator.evaluateDecision('does-not-exist', decisions, {})).toThrow(
        /No such decision "does-not-exist"/,
      );
    });

    it('wraps FEEL evaluation errors with the original error as `cause`', async () => {
      const { parser, evaluator } = await buildBundle();
      const decisions = await parser.parseDmnXml(BROKEN_FEEL_DMN);
      const id = Object.keys(decisions)[0];
      try {
        evaluator.evaluateDecision(id, decisions, { x: 1 });
        fail('expected evaluator to throw');
      } catch (err) {
        const e = err as Error & { cause?: unknown };
        expect(e.message).toMatch(/Failed to evaluate rule 1/);
        expect(e.cause).toBeDefined();
      }
    });
  });

  describe('result shape', () => {
    it('builds nested output values when the output name contains dots', async () => {
      const result = await run({}, NESTED_OUTPUT_DMN, { type: 'premium' });
      expect(result).toEqual({ fee: { value: 9.99, currency: 'EUR' } });
    });

    it('returns NestedRecord (object) for FIRST and UNIQUE policies', async () => {
      const single = await run({}, UNIQUE_DMN, { score: 60 });
      expect(Array.isArray(single)).toBe(false);
    });

    it('returns an array for COLLECT', async () => {
      const collected = await run({}, COLLECT_DMN, { years: 12 });
      expect(Array.isArray(collected)).toBe(true);
    });
  });

  describe('idempotency of context', () => {
    it('mutates only the passed-in context for DRG decisions, not a clone', async () => {
      const { parser, evaluator } = await buildBundle();
      const decisions: ParsedDecisions = await parser.parseDmnXml(DRG_WITH_REQUIRED_DECISION_DMN);
      const context = { score: 90 };
      evaluator.evaluateDecision('discount', decisions, context);
      // The upstream decision should have written the tier into the same context object.
      expect(context).toMatchObject({ score: 90, tier: 'high' });
    });
  });
});

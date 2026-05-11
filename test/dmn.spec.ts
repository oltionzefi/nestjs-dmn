import { Test } from '@nestjs/testing';

import { DmnEvaluatorService, DmnModule, DmnParserService } from '../src';
import { COLLECT_DMN, DRG_WITH_REQUIRED_DECISION_DMN, FIRST_PRICING_DMN } from './fixtures';

describe('@dkk/nestjs-dmn — end-to-end usage', () => {
  let parser: DmnParserService;
  let evaluator: DmnEvaluatorService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [DmnModule.forRoot()],
    }).compile();
    parser = moduleRef.get(DmnParserService);
    evaluator = moduleRef.get(DmnEvaluatorService);
  });

  it('parses + evaluates a real-world FIRST pricing table', async () => {
    const decisions = await parser.parseDmnXml(FIRST_PRICING_DMN);
    const result = evaluator.evaluateDecision('pricing', decisions, {
      companyAge: 11,
      revenue: 250_000,
      industry: 'Hotel & Gastronomie',
    });
    expect(result).toEqual({ fee: 7.2, minAmount: 150 });
  });

  it('collects every matching rule under a COLLECT hit policy', async () => {
    const decisions = await parser.parseDmnXml(COLLECT_DMN);
    const result = evaluator.evaluateDecision('badges', decisions, { years: 7 });
    expect(result).toEqual([{ badge: 'rookie' }, { badge: 'veteran' }]);
  });

  it('chains decisions via informationRequirement / requiredDecision', async () => {
    const decisions = await parser.parseDmnXml(DRG_WITH_REQUIRED_DECISION_DMN);
    const result = evaluator.evaluateDecision('discount', decisions, { score: 90 });
    expect(result).toEqual({ discount: 0.2 });
  });
});

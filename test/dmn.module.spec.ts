import { Injectable } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';

import {
  DEFAULT_SUPPORTED_HIT_POLICIES,
  DMN_MODULE_OPTIONS,
  DmnEvaluatorService,
  DmnModule,
  DmnModuleOptions,
  DmnParserService,
  ResolvedDmnModuleOptions,
} from '../src';
import { FIRST_PRICING_DMN, UNIQUE_DMN } from './fixtures';

describe('DmnModule', () => {
  describe('forRoot()', () => {
    it('exposes both services with default configuration', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [DmnModule.forRoot()],
      }).compile();

      expect(moduleRef.get(DmnParserService)).toBeInstanceOf(DmnParserService);
      expect(moduleRef.get(DmnEvaluatorService)).toBeInstanceOf(DmnEvaluatorService);
    });

    it('exposes the resolved options under DMN_MODULE_OPTIONS', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [DmnModule.forRoot()],
      }).compile();

      const options = moduleRef.get<ResolvedDmnModuleOptions>(DMN_MODULE_OPTIONS);
      expect(options.supportedHitPolicies).toEqual(new Set(DEFAULT_SUPPORTED_HIT_POLICIES));
      expect(typeof options.outputCellParser).toBe('function');
      expect(typeof options.labelToVariableName).toBe('function');
    });

    it('lets callers narrow supported hit policies', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [DmnModule.forRoot({ supportedHitPolicies: ['UNIQUE'] })],
      }).compile();
      const options = moduleRef.get<ResolvedDmnModuleOptions>(DMN_MODULE_OPTIONS);
      expect(options.supportedHitPolicies).toEqual(new Set(['UNIQUE']));
    });

    it('accepts a custom outputCellParser function and wires it through', async () => {
      const parserFn = jest.fn((text: string) => text.length);
      const moduleRef = await Test.createTestingModule({
        imports: [DmnModule.forRoot({ outputCellParser: parserFn })],
      }).compile();
      const parser = moduleRef.get(DmnParserService);
      const result = await parser.parseDmnXml(UNIQUE_DMN);
      expect(parserFn).toHaveBeenCalled();
      expect(result.bucket.decisionTable.rules[0].outputValues[0]).toBe(5); // "low" → 5 chars
    });

    it('treats outputCellParser="raw" as a pass-through', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [DmnModule.forRoot({ outputCellParser: 'raw' })],
      }).compile();
      const parser = moduleRef.get(DmnParserService);
      const result = await parser.parseDmnXml(FIRST_PRICING_DMN);
      expect(result.pricing.decisionTable.rules[0].outputValues).toEqual(['7.20', '150']);
    });
  });

  describe('forRootAsync()', () => {
    it('resolves options from a synchronous factory', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          DmnModule.forRootAsync({
            useFactory: (): DmnModuleOptions => ({ supportedHitPolicies: ['FIRST'] }),
          }),
        ],
      }).compile();
      const options = moduleRef.get<ResolvedDmnModuleOptions>(DMN_MODULE_OPTIONS);
      expect(options.supportedHitPolicies).toEqual(new Set(['FIRST']));
    });

    it('resolves options from an async factory', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          DmnModule.forRootAsync({
            useFactory: async (): Promise<DmnModuleOptions> => ({
              outputCellParser: 'raw',
            }),
          }),
        ],
      }).compile();
      const parser = moduleRef.get(DmnParserService);
      const result = await parser.parseDmnXml(UNIQUE_DMN);
      expect(result.bucket.decisionTable.rules[0].outputValues).toEqual(['"low"']);
    });

    it('injects dependencies from other modules', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: false,
            ignoreEnvFile: true,
            load: [(): Record<string, string> => ({ DMN_POLICY: 'UNIQUE' })],
          }),
          DmnModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService): DmnModuleOptions => ({
              supportedHitPolicies: [config.get<'UNIQUE' | 'FIRST'>('DMN_POLICY') ?? 'UNIQUE'],
            }),
          }),
        ],
      }).compile();
      const options = moduleRef.get<ResolvedDmnModuleOptions>(DMN_MODULE_OPTIONS);
      expect(options.supportedHitPolicies).toEqual(new Set(['UNIQUE']));
    });
  });

  describe('extending services via providers override', () => {
    @Injectable()
    class StrictParser extends DmnParserService {
      protected override parseInputCell(text: string | undefined): string {
        if ((text ?? '') === '') {
          throw new Error('Blank input cells are not allowed.');
        }
        return super.parseInputCell(text);
      }
    }

    it('lets a subclass override a protected helper', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [DmnModule.forRoot()],
      })
        .overrideProvider(DmnParserService)
        .useClass(StrictParser)
        .compile();
      const parser = moduleRef.get(DmnParserService);
      expect(parser).toBeInstanceOf(StrictParser);
      await expect(parser.parseDmnXml(FIRST_PRICING_DMN)).rejects.toThrow(
        /Blank input cells are not allowed/,
      );
    });
  });

  describe('isolation between independent forRoot calls', () => {
    it('does not leak state between modules', async () => {
      const a = await Test.createTestingModule({
        imports: [DmnModule.forRoot({ supportedHitPolicies: ['UNIQUE'] })],
      }).compile();
      const b = await Test.createTestingModule({
        imports: [DmnModule.forRoot({ supportedHitPolicies: ['FIRST'] })],
      }).compile();

      const optsA = a.get<ResolvedDmnModuleOptions>(DMN_MODULE_OPTIONS);
      const optsB = b.get<ResolvedDmnModuleOptions>(DMN_MODULE_OPTIONS);

      expect(optsA.supportedHitPolicies).toEqual(new Set(['UNIQUE']));
      expect(optsB.supportedHitPolicies).toEqual(new Set(['FIRST']));
    });
  });
});

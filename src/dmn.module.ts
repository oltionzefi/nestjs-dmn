import { DynamicModule, Module, Provider } from '@nestjs/common';

import {
  DEFAULT_SUPPORTED_HIT_POLICIES,
  DMN_MODULE_OPTIONS,
  defaultLabelToVariableName,
  defaultOutputCellParser,
} from './dmn.constants';
import {
  DmnModuleAsyncOptions,
  DmnModuleOptions,
  OutputCellParser,
  ResolvedDmnModuleOptions,
} from './interfaces';
import { DmnEvaluatorService, DmnParserService } from './services';

function resolveOutputCellParser(parser: DmnModuleOptions['outputCellParser']): OutputCellParser {
  if (typeof parser === 'function') {
    return parser;
  }
  if (parser === 'raw') {
    return (text: string) => text;
  }
  return defaultOutputCellParser;
}

function resolveOptions(options: DmnModuleOptions = {}): ResolvedDmnModuleOptions {
  return {
    supportedHitPolicies: new Set(options.supportedHitPolicies ?? DEFAULT_SUPPORTED_HIT_POLICIES),
    outputCellParser: resolveOutputCellParser(options.outputCellParser),
    labelToVariableName: options.labelToVariableName ?? defaultLabelToVariableName,
  };
}

@Module({})
export class DmnModule {
  static forRoot(options: DmnModuleOptions = {}): DynamicModule {
    return {
      module: DmnModule,
      providers: [
        { provide: DMN_MODULE_OPTIONS, useValue: resolveOptions(options) },
        DmnParserService,
        DmnEvaluatorService,
      ],
      exports: [DmnParserService, DmnEvaluatorService, DMN_MODULE_OPTIONS],
    };
  }

  static forRootAsync(asyncOptions: DmnModuleAsyncOptions): DynamicModule {
    const optionsProvider: Provider = {
      provide: DMN_MODULE_OPTIONS,
      useFactory: async (...args: unknown[]): Promise<ResolvedDmnModuleOptions> => {
        const raw = await asyncOptions.useFactory(...args);
        return resolveOptions(raw);
      },
      inject: asyncOptions.inject ?? [],
    };
    return {
      module: DmnModule,
      imports: asyncOptions.imports ?? [],
      providers: [optionsProvider, DmnParserService, DmnEvaluatorService],
      exports: [DmnParserService, DmnEvaluatorService, DMN_MODULE_OPTIONS],
    };
  }
}

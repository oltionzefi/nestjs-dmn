import { ModuleMetadata } from '@nestjs/common';
import { DmnHitPolicy } from 'dmn-moddle';

export type OutputCellParser = (text: string) => unknown;

export type LabelToVariableName = (label: string) => string;

export interface DmnModuleOptions {
  /**
   * DMN hit policies the parser will accept. Anything outside this list throws
   * at parse time.
   *
   * Default: `['FIRST', 'UNIQUE', 'COLLECT', 'RULE ORDER']`.
   */
  supportedHitPolicies?: ReadonlyArray<DmnHitPolicy>;

  /**
   * How to decode output-entry text into a runtime value.
   *
   * - `'json'` (default): `JSON.parse` with a fall-through to the raw string.
   *   Lets numeric cells like `7.20` come back as `7.2`.
   * - `'raw'`: always return the raw cell text.
   * - A function: full custom decoding.
   */
  outputCellParser?: 'json' | 'raw' | OutputCellParser;

  /**
   * Maps a DMN input label to the variable name used to look the value up in
   * the evaluation context. Default lowercases the first char and strips
   * whitespace (`"Monate seit Firmengründung"` → `"monateSeitFirmengründung"`).
   */
  labelToVariableName?: LabelToVariableName;
}

/** Resolved options with every field populated. Used internally by the services. */
export interface ResolvedDmnModuleOptions {
  supportedHitPolicies: ReadonlySet<DmnHitPolicy>;
  outputCellParser: OutputCellParser;
  labelToVariableName: LabelToVariableName;
}

export interface DmnModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useFactory: (...args: any[]) => Promise<DmnModuleOptions> | DmnModuleOptions;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inject?: any[];
}

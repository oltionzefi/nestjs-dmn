import { DmnHitPolicy } from 'dmn-moddle';

export const DMN_MODULE_OPTIONS = Symbol('DMN_MODULE_OPTIONS');

export const DEFAULT_SUPPORTED_HIT_POLICIES: ReadonlyArray<DmnHitPolicy> = [
  'FIRST',
  'UNIQUE',
  'COLLECT',
  'RULE ORDER',
];

export function defaultLabelToVariableName(label: string): string {
  const firstLowered = label.charAt(0).toLowerCase() + label.slice(1);
  return firstLowered.replace(/\s/g, '');
}

export function defaultOutputCellParser(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

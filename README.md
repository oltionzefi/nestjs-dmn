# @oltionzefi/nestjs-dmn

A small, fully-typed NestJS module that parses **DMN 1.3** XML and evaluates decision tables. Built on [`dmn-moddle`](https://github.com/bpmn-io/dmn-moddle) (XML reader) and [`feelin`](https://github.com/nikku/feelin) (FEEL/S-FEEL interpreter). No native dependencies, no JVM, no JSON-format conversion — point it at a `.dmn` file from Camunda Modeler and you're done.

## Features

- Full NestJS DI integration — services are `@Injectable`, configuration uses the standard `forRoot` / `forRootAsync` pattern.
- DMN 1.3 namespace native; understands the FEEL unary tests Camunda Modeler emits.
- Hit policies: `FIRST`, `UNIQUE`, `COLLECT`, `RULE ORDER` by default; restrict or extend via configuration.
- Pluggable output-cell decoding (`json` / `raw` / custom function) and label-to-variable mapping.
- Extensible by subclassing — every helper on the services is `protected`.
- Zero `any` in the public type surface; ships with its own `dmn-moddle` declarations.

## Installation

The package is published to GitHub Packages. Tell npm which registry to use for the `@oltionzefi` scope (one-time, in your project's `.npmrc`):

```
@oltionzefi:registry=https://npm.pkg.github.com
```

Then install:

```bash
npm install @oltionzefi/nestjs-dmn dmn-moddle feelin
```

`@nestjs/common` (10 or 11) and `reflect-metadata` are peer dependencies.

## Quick start

The example below routes an active user to a subscription tier based on their monthly active minutes and their account country. The `.dmn` file is anything you'd model in Camunda Modeler:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/" id="sub" name="Tier" namespace="https://example.com/tier">
  <decision id="tier" name="Subscription tier">
    <decisionTable id="dt" hitPolicy="FIRST">
      <input id="i1" label="Minutes"><inputExpression id="ie1" typeRef="integer"><text>monthlyMinutes</text></inputExpression></input>
      <input id="i2" label="Country"><inputExpression id="ie2" typeRef="string"><text>country</text></inputExpression></input>
      <output id="o1" name="plan" typeRef="string" />
      <output id="o2" name="discount" typeRef="number" />
      <rule id="r1">
        <inputEntry id="r1i1"><text>&gt;= 1500</text></inputEntry>
        <inputEntry id="r1i2"><text></text></inputEntry>
        <outputEntry id="r1o1"><text>"power"</text></outputEntry>
        <outputEntry id="r1o2"><text>0.2</text></outputEntry>
      </rule>
      <rule id="r2">
        <inputEntry id="r2i1"><text>[300..1500[</text></inputEntry>
        <inputEntry id="r2i2"><text>not("XX")</text></inputEntry>
        <outputEntry id="r2o1"><text>"standard"</text></outputEntry>
        <outputEntry id="r2o2"><text>0</text></outputEntry>
      </rule>
      <rule id="r3">
        <inputEntry id="r3i1"><text></text></inputEntry>
        <inputEntry id="r3i2"><text></text></inputEntry>
        <outputEntry id="r3o1"><text>"trial"</text></outputEntry>
        <outputEntry id="r3o2"><text>0</text></outputEntry>
      </rule>
    </decisionTable>
  </decision>
</definitions>
```

Wire the module:

```ts
import { Module } from '@nestjs/common';
import { DmnModule } from '@oltionzefi/nestjs-dmn';

@Module({
  imports: [DmnModule.forRoot()],
})
export class AppModule {}
```

Inject the services where you need them:

```ts
import { Injectable } from '@nestjs/common';
import { DmnEvaluatorService, DmnParserService } from '@oltionzefi/nestjs-dmn';

interface TierInput {
  monthlyMinutes: number;
  country: string;
}

interface TierResult {
  plan: 'power' | 'standard' | 'trial';
  discount: number;
}

@Injectable()
export class SubscriptionRouter {
  constructor(
    private readonly parser: DmnParserService,
    private readonly evaluator: DmnEvaluatorService,
  ) {}

  async route(xml: string, input: TierInput): Promise<TierResult> {
    const decisions = await this.parser.parseDmnXml(xml);
    const [decisionId] = Object.keys(decisions);
    return this.evaluator.evaluateDecision(decisionId, decisions, { ...input }) as TierResult;
  }
}
```

`router.route(xml, { monthlyMinutes: 2400, country: 'DE' })` → `{ plan: 'power', discount: 0.2 }`.

## Configuration

### `DmnModule.forRoot(options)`

```ts
DmnModule.forRoot({
  // Restrict accepted hit policies — anything outside this list throws at parse time.
  supportedHitPolicies: ['FIRST', 'UNIQUE'],

  // How to decode output cell text:
  //   'json' (default) — JSON.parse, falling back to raw text
  //   'raw'            — always return the raw string
  //   (text) => unknown — custom decoder
  outputCellParser: 'json',

  // How to derive the context key from a DMN input label.
  // Default lowercases the first char and strips whitespace.
  labelToVariableName: (label) => label.toLowerCase().replace(/\s+/g, '_'),
});
```

### `DmnModule.forRootAsync(options)`

Useful when configuration depends on a runtime config service:

```ts
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DmnHitPolicy, DmnModule, DmnModuleOptions } from '@oltionzefi/nestjs-dmn';

DmnModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService): DmnModuleOptions => ({
    supportedHitPolicies: config.get<readonly DmnHitPolicy[]>('dmn.policies'),
  }),
});
```

## Public API

### Services

| Service | Method | Purpose |
| --- | --- | --- |
| `DmnParserService` | `parseDmnXml(xml: string)` | Parse a DMN XML document into a `ParsedDecisions` map. |
| `DmnEvaluatorService` | `evaluateDecision(id, decisions, context)` | Evaluate a parsed decision (with DRG-style required decisions) against a context. |

### Types

```ts
interface ParsedRule {
  number: number;
  inputValues: string[];   // FEEL unary tests, one per input column
  outputValues: unknown[]; // decoded per the configured outputCellParser
}

interface ParsedDecisionTable {
  hitPolicy: 'FIRST' | 'UNIQUE' | 'COLLECT' | 'RULE ORDER';
  inputExpressions: string[];
  outputNames: string[];
  rules: ParsedRule[];
}

interface ParsedDecision {
  decisionTable: ParsedDecisionTable;
  requiredDecisions: string[];
}

type ParsedDecisions = Record<string, ParsedDecision>;
type EvaluationContext = { [key: string]: unknown };
type EvaluationResult = EvaluationContext | EvaluationContext[];
```

Single-hit policies (`FIRST`, `UNIQUE`) return a single `EvaluationContext`; aggregating policies (`COLLECT`, `RULE ORDER`) return an array.

## Extending the services

Every helper on `DmnParserService` and `DmnEvaluatorService` is `protected`, so subclassing is the supported extension path:

```ts
import { Injectable } from '@nestjs/common';
import { DmnParserService } from '@oltionzefi/nestjs-dmn';

@Injectable()
export class StrictDmnParserService extends DmnParserService {
  protected override parseInputCell(text: string | undefined): string {
    const value = super.parseInputCell(text);
    if (value === '-' && process.env.NODE_ENV === 'production') {
      throw new Error('Blank input cells are not allowed in production DMN files.');
    }
    return value;
  }
}
```

Register the subclass in your module:

```ts
@Module({
  imports: [DmnModule.forRoot()],
  providers: [{ provide: DmnParserService, useClass: StrictDmnParserService }],
  exports: [DmnParserService],
})
export class AppModule {}
```

## Error semantics

All thrown errors include the original error as `cause` (the standard ES2022 `Error.cause` field) so stack traces survive the wrapper:

```ts
try {
  await parser.parseDmnXml(brokenXml);
} catch (err) {
  console.error(err.message, err.cause);
}
```

## What this library is *not*

- It is not a DMN modeler. Author your `.dmn` files in Camunda Modeler, dmn-js, or any DMN 1.3 editor and feed the XML in.
- It does not currently implement the `PRIORITY`, `ANY`, or `OUTPUT ORDER` hit policies — PRs welcome.
- It does not depend on or vendor any Camunda runtime; the only deps are `dmn-moddle` and `feelin`.

## Development

This package uses [pnpm](https://pnpm.io). The `packageManager` field in `package.json` pins the exact version Corepack will use.

```bash
pnpm install
pnpm build
pnpm test
pnpm lint
pnpm format
```

## Continuous integration & publishing

- [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs `lint`, `format:check`, `build`, and `test` on every push and pull request against `main`.
- [`.github/workflows/publish.yml`](.github/workflows/publish.yml) builds the package and publishes it to GitHub Packages on every published GitHub Release. The job uses `GITHUB_TOKEN` and respects the `publishConfig.registry` field in `package.json`.

To cut a release, bump the version in `package.json`, push a `vX.Y.Z` tag, and create a GitHub Release pointing at it — the workflow does the rest.

## License

MIT © [Oltion Zefi](https://oltionzefi.com)

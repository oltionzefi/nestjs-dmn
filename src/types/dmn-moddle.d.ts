declare module 'dmn-moddle' {
  export interface ModdleElement {
    $type: string;
    id?: string;
    [key: string]: unknown;
  }

  export interface DmnHrefRef extends ModdleElement {
    href: string;
  }

  export interface DmnInformationRequirement extends ModdleElement {
    $type: 'dmn:InformationRequirement';
    requiredDecision?: DmnHrefRef;
    requiredInput?: DmnHrefRef;
  }

  export interface DmnLiteralExpression extends ModdleElement {
    $type?: 'dmn:LiteralExpression';
    text?: string;
  }

  export interface DmnUnaryTests extends ModdleElement {
    $type?: 'dmn:UnaryTests';
    text?: string;
  }

  export interface DmnInputClause extends ModdleElement {
    $type: 'dmn:InputClause';
    id?: string;
    label?: string;
    inputVariable?: string;
    inputExpression?: DmnLiteralExpression;
  }

  export interface DmnOutputClause extends ModdleElement {
    $type: 'dmn:OutputClause';
    id?: string;
    name?: string;
    label?: string;
  }

  export interface DmnDecisionRule extends ModdleElement {
    $type: 'dmn:DecisionRule';
    id?: string;
    description?: string;
    inputEntry?: DmnUnaryTests[];
    outputEntry?: DmnLiteralExpression[];
  }

  export type DmnHitPolicy =
    | 'UNIQUE'
    | 'FIRST'
    | 'PRIORITY'
    | 'ANY'
    | 'COLLECT'
    | 'RULE ORDER'
    | 'OUTPUT ORDER';

  export interface DmnDecisionTable extends ModdleElement {
    $type: 'dmn:DecisionTable';
    hitPolicy?: DmnHitPolicy;
    input?: DmnInputClause[];
    output?: DmnOutputClause[];
    rule?: DmnDecisionRule[];
  }

  export interface DmnDecision extends ModdleElement {
    $type: 'dmn:Decision';
    id: string;
    name?: string;
    decisionLogic?: DmnDecisionTable;
    informationRequirement?: DmnInformationRequirement[];
  }

  export interface DmnDefinitions extends ModdleElement {
    $type: 'dmn:Definitions';
    drgElement?: ModdleElement[];
  }

  export interface DmnFromXmlResult {
    rootElement: DmnDefinitions;
    references?: unknown[];
    warnings?: unknown[];
    elementsById?: Record<string, ModdleElement>;
  }

  export interface DmnModdleInstance {
    fromXML(xmlStr: string, typeName?: string): Promise<DmnFromXmlResult>;
  }

  export function DmnModdle(
    packages?: Record<string, unknown>,
    options?: unknown,
  ): DmnModdleInstance;
}

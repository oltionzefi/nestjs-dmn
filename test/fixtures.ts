export const FIRST_PRICING_DMN = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/" id="d" name="DRD" namespace="https://example.com/dmn">
  <decision id="pricing" name="Pricing">
    <decisionTable id="dt" hitPolicy="FIRST">
      <input id="i1" label="Age"><inputExpression id="ie1" typeRef="integer"><text>companyAge</text></inputExpression></input>
      <input id="i2" label="Revenue"><inputExpression id="ie2" typeRef="integer"><text>revenue</text></inputExpression></input>
      <input id="i3" label="Industry"><inputExpression id="ie3" typeRef="string"><text>industry</text></inputExpression></input>
      <output id="o1" name="fee" typeRef="string" />
      <output id="o2" name="minAmount" typeRef="string" />
      <rule id="r1">
        <inputEntry id="r1i1"><text>[0..12[</text></inputEntry>
        <inputEntry id="r1i2"><text></text></inputEntry>
        <inputEntry id="r1i3"><text></text></inputEntry>
        <outputEntry id="r1o1"><text>7.20</text></outputEntry>
        <outputEntry id="r1o2"><text>150</text></outputEntry>
      </rule>
      <rule id="r2">
        <inputEntry id="r2i1"><text>&gt;= 60</text></inputEntry>
        <inputEntry id="r2i2"><text>&gt;= 2000000</text></inputEntry>
        <inputEntry id="r2i3"><text>not("Hotel &amp; Gastronomie")</text></inputEntry>
        <outputEntry id="r2o1"><text>4.60</text></outputEntry>
        <outputEntry id="r2o2"><text>150</text></outputEntry>
      </rule>
      <rule id="r3">
        <inputEntry id="r3i1"><text>&gt;= 24</text></inputEntry>
        <inputEntry id="r3i2"><text>&gt;= 250000</text></inputEntry>
        <inputEntry id="r3i3"><text>not("Hotel &amp; Gastronomie")</text></inputEntry>
        <outputEntry id="r3o1"><text>5.20</text></outputEntry>
        <outputEntry id="r3o2"><text>150</text></outputEntry>
      </rule>
      <rule id="r4">
        <inputEntry id="r4i1"><text></text></inputEntry>
        <inputEntry id="r4i2"><text></text></inputEntry>
        <inputEntry id="r4i3"><text></text></inputEntry>
        <outputEntry id="r4o1"><text>5.90</text></outputEntry>
        <outputEntry id="r4o2"><text>150</text></outputEntry>
      </rule>
    </decisionTable>
  </decision>
</definitions>`;

export const UNIQUE_DMN = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/" id="d" name="DRD" namespace="https://example.com/dmn">
  <decision id="bucket" name="Bucket">
    <decisionTable id="dt" hitPolicy="UNIQUE">
      <input id="i1" label="Score"><inputExpression id="ie1" typeRef="integer"><text>score</text></inputExpression></input>
      <output id="o1" name="tier" typeRef="string" />
      <rule id="r1">
        <inputEntry id="r1i1"><text>&lt; 50</text></inputEntry>
        <outputEntry id="r1o1"><text>"low"</text></outputEntry>
      </rule>
      <rule id="r2">
        <inputEntry id="r2i1"><text>[50..80[</text></inputEntry>
        <outputEntry id="r2o1"><text>"mid"</text></outputEntry>
      </rule>
      <rule id="r3">
        <inputEntry id="r3i1"><text>&gt;= 80</text></inputEntry>
        <outputEntry id="r3o1"><text>"high"</text></outputEntry>
      </rule>
    </decisionTable>
  </decision>
</definitions>`;

export const AMBIGUOUS_UNIQUE_DMN = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/" id="d" name="DRD" namespace="https://example.com/dmn">
  <decision id="bucket" name="Bucket">
    <decisionTable id="dt" hitPolicy="UNIQUE">
      <input id="i1" label="Score"><inputExpression id="ie1" typeRef="integer"><text>score</text></inputExpression></input>
      <output id="o1" name="tier" typeRef="string" />
      <rule id="r1">
        <inputEntry id="r1i1"><text>&gt;= 50</text></inputEntry>
        <outputEntry id="r1o1"><text>"a"</text></outputEntry>
      </rule>
      <rule id="r2">
        <inputEntry id="r2i1"><text>&gt;= 50</text></inputEntry>
        <outputEntry id="r2o1"><text>"b"</text></outputEntry>
      </rule>
    </decisionTable>
  </decision>
</definitions>`;

export const COLLECT_DMN = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/" id="d" name="DRD" namespace="https://example.com/dmn">
  <decision id="badges" name="Badges">
    <decisionTable id="dt" hitPolicy="COLLECT">
      <input id="i1" label="Years"><inputExpression id="ie1" typeRef="integer"><text>years</text></inputExpression></input>
      <output id="o1" name="badge" typeRef="string" />
      <rule id="r1">
        <inputEntry id="r1i1"><text>&gt;= 1</text></inputEntry>
        <outputEntry id="r1o1"><text>"rookie"</text></outputEntry>
      </rule>
      <rule id="r2">
        <inputEntry id="r2i1"><text>&gt;= 5</text></inputEntry>
        <outputEntry id="r2o1"><text>"veteran"</text></outputEntry>
      </rule>
      <rule id="r3">
        <inputEntry id="r3i1"><text>&gt;= 10</text></inputEntry>
        <outputEntry id="r3o1"><text>"master"</text></outputEntry>
      </rule>
    </decisionTable>
  </decision>
</definitions>`;

export const DRG_DMN = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/" id="d" name="DRD" namespace="https://example.com/dmn">
  <decision id="discount" name="Discount">
    <decisionTable id="dt-discount" hitPolicy="UNIQUE">
      <input id="i1" label="Tier"><inputExpression id="ie1" typeRef="string"><text>tier</text></inputExpression></input>
      <output id="o1" name="discount" typeRef="string" />
      <rule id="d1">
        <inputEntry id="d1i1"><text>"high"</text></inputEntry>
        <outputEntry id="d1o1"><text>0.20</text></outputEntry>
      </rule>
      <rule id="d2">
        <inputEntry id="d2i1"><text>"mid"</text></inputEntry>
        <outputEntry id="d2o1"><text>0.10</text></outputEntry>
      </rule>
      <rule id="d3">
        <inputEntry id="d3i1"><text>"low"</text></inputEntry>
        <outputEntry id="d3o1"><text>0</text></outputEntry>
      </rule>
    </decisionTable>
  </decision>
  <decision id="tier" name="Tier">
    <informationRequirement id="ir-tier"><requiredInput href="#score" /></informationRequirement>
    <decisionTable id="dt-tier" hitPolicy="UNIQUE">
      <input id="ti1" label="Score"><inputExpression id="tie1" typeRef="integer"><text>score</text></inputExpression></input>
      <output id="to1" name="tier" typeRef="string" />
      <rule id="t1">
        <inputEntry id="t1i1"><text>&lt; 50</text></inputEntry>
        <outputEntry id="t1o1"><text>"low"</text></outputEntry>
      </rule>
      <rule id="t2">
        <inputEntry id="t2i1"><text>[50..80[</text></inputEntry>
        <outputEntry id="t2o1"><text>"mid"</text></outputEntry>
      </rule>
      <rule id="t3">
        <inputEntry id="t3i1"><text>&gt;= 80</text></inputEntry>
        <outputEntry id="t3o1"><text>"high"</text></outputEntry>
      </rule>
    </decisionTable>
  </decision>
  <inputData id="score" name="Score" />
</definitions>`;

export const DRG_WITH_REQUIRED_DECISION_DMN = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/" id="d" name="DRD" namespace="https://example.com/dmn">
  <decision id="tier" name="Tier">
    <decisionTable id="dt-tier" hitPolicy="UNIQUE">
      <input id="ti1" label="Score"><inputExpression id="tie1" typeRef="integer"><text>score</text></inputExpression></input>
      <output id="to1" name="tier" typeRef="string" />
      <rule id="t1">
        <inputEntry id="t1i1"><text>&lt; 50</text></inputEntry>
        <outputEntry id="t1o1"><text>"low"</text></outputEntry>
      </rule>
      <rule id="t2">
        <inputEntry id="t2i1"><text>&gt;= 50</text></inputEntry>
        <outputEntry id="t2o1"><text>"high"</text></outputEntry>
      </rule>
    </decisionTable>
  </decision>
  <decision id="discount" name="Discount">
    <informationRequirement id="ir-discount"><requiredDecision href="#tier" /></informationRequirement>
    <decisionTable id="dt-discount" hitPolicy="UNIQUE">
      <input id="di1" label="Tier"><inputExpression id="die1" typeRef="string"><text>tier</text></inputExpression></input>
      <output id="do1" name="discount" typeRef="string" />
      <rule id="d1">
        <inputEntry id="d1i1"><text>"high"</text></inputEntry>
        <outputEntry id="d1o1"><text>0.2</text></outputEntry>
      </rule>
      <rule id="d2">
        <inputEntry id="d2i1"><text>"low"</text></inputEntry>
        <outputEntry id="d2o1"><text>0</text></outputEntry>
      </rule>
    </decisionTable>
  </decision>
</definitions>`;

export const LABEL_DRIVEN_DMN = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/" id="d" name="DRD" namespace="https://example.com/dmn">
  <decision id="byLabel" name="ByLabel">
    <decisionTable id="dt" hitPolicy="FIRST">
      <input id="i1" label="Customer Age" />
      <output id="o1" name="ok" typeRef="string" />
      <rule id="r1">
        <inputEntry id="r1i1"><text>&gt;= 18</text></inputEntry>
        <outputEntry id="r1o1"><text>"yes"</text></outputEntry>
      </rule>
      <rule id="r2">
        <inputEntry id="r2i1"><text></text></inputEntry>
        <outputEntry id="r2o1"><text>"no"</text></outputEntry>
      </rule>
    </decisionTable>
  </decision>
</definitions>`;

export const NESTED_OUTPUT_DMN = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/" id="d" name="DRD" namespace="https://example.com/dmn">
  <decision id="quote" name="Quote">
    <decisionTable id="dt" hitPolicy="FIRST">
      <input id="i1" label="Type"><inputExpression id="ie1" typeRef="string"><text>type</text></inputExpression></input>
      <output id="o1" name="fee.value" typeRef="string" />
      <output id="o2" name="fee.currency" typeRef="string" />
      <rule id="r1">
        <inputEntry id="r1i1"><text>"premium"</text></inputEntry>
        <outputEntry id="r1o1"><text>9.99</text></outputEntry>
        <outputEntry id="r1o2"><text>"EUR"</text></outputEntry>
      </rule>
      <rule id="r2">
        <inputEntry id="r2i1"><text></text></inputEntry>
        <outputEntry id="r2o1"><text>0</text></outputEntry>
        <outputEntry id="r2o2"><text>"EUR"</text></outputEntry>
      </rule>
    </decisionTable>
  </decision>
</definitions>`;

export const INVALID_OUTPUT_NAME_DMN = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/" id="d" name="DRD" namespace="https://example.com/dmn">
  <decision id="broken" name="Broken">
    <decisionTable id="dt" hitPolicy="FIRST">
      <input id="i1" label="X"><inputExpression id="ie1" typeRef="integer"><text>x</text></inputExpression></input>
      <output id="o1" typeRef="string" />
      <rule id="r1">
        <inputEntry id="r1i1"><text></text></inputEntry>
        <outputEntry id="r1o1"><text>"y"</text></outputEntry>
      </rule>
    </decisionTable>
  </decision>
</definitions>`;

export const INVALID_INPUT_EXPRESSION_DMN = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/" id="d" name="DRD" namespace="https://example.com/dmn">
  <decision id="broken" name="Broken">
    <decisionTable id="dt" hitPolicy="FIRST">
      <input id="i1" />
      <output id="o1" name="ok" typeRef="string" />
      <rule id="r1">
        <inputEntry id="r1i1"><text></text></inputEntry>
        <outputEntry id="r1o1"><text>"y"</text></outputEntry>
      </rule>
    </decisionTable>
  </decision>
</definitions>`;

export const BROKEN_FEEL_DMN = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/" id="d" name="DRD" namespace="https://example.com/dmn">
  <decision id="broken" name="Broken">
    <decisionTable id="dt" hitPolicy="FIRST">
      <input id="i1" label="X"><inputExpression id="ie1" typeRef="integer"><text>x</text></inputExpression></input>
      <output id="o1" name="ok" typeRef="string" />
      <rule id="r1">
        <inputEntry id="r1i1"><text>function(){</text></inputEntry>
        <outputEntry id="r1o1"><text>"y"</text></outputEntry>
      </rule>
    </decisionTable>
  </decision>
</definitions>`;

import { describe, expect, it } from "vitest";
import * as ts from "typescript";
import { serializeProps } from "./serialize";

describe("serializeProps string attributes", () => {
  const titles = [
    'Quoted "temperature"',
    "It's ready",
    "line\nnext\r\n\ttab",
    "C:\\temp\\",
    "&amp; <tag>",
    "</div>",
    "{x} }{",
    "caf\u00e9 \u{1F600}",
    "",
  ];

  for (const quotes of ["single", "double"] as const) {
    for (const title of titles) {
      it(`preserves ${JSON.stringify(title)} with ${quotes} quotes`, () => {
        const { outputText, diagnostics = [] } = ts.transpileModule(
          `const result = <div ${serializeProps({ title }, { quotes })} />;`,
          {
            fileName: "generated.tsx",
            reportDiagnostics: true,
            compilerOptions: {
              jsx: ts.JsxEmit.React,
              jsxFactory: "h",
              target: ts.ScriptTarget.ES2022,
            },
          },
        );

        expect(diagnostics).toEqual([]);
        const props = new Function("h", `${outputText}\nreturn result;`)(
          (_tag: string, values: Record<string, unknown>) => values,
        );
        expect(props.title).toBe(title);
      });
    }
  }
});

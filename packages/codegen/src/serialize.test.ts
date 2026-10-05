import ts from "typescript";
import { describe, expect, it } from "vitest";
import { serializeProps } from "./serialize";

describe("serializeProps", () => {
  it.each(["single", "double"] as const)(
    "preserves strings in compiled JSX with %s quotes",
    (quotes) => {
      for (const title of [
        'Quoted "temperature"',
        "It's ready",
        "line\nnext\r\n\ttab",
        "C:\\temp\\",
        "&amp; <tag>",
        "",
      ]) {
        const { outputText, diagnostics } = ts.transpileModule(
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
      }
    },
  );

  it("keeps boolean shorthand and skips nullish props", () => {
    expect(
      serializeProps({
        disabled: true,
        hidden: false,
        count: 2,
        missing: undefined,
        empty: null,
      }),
    ).toBe("disabled hidden={false} count={2}");
  });
});

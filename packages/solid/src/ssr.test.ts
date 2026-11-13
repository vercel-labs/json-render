// @vitest-environment node
import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

// These tests run the built package in a plain Node process, so that
// `@json-render/solid` and `solid-js/web` resolve under Node's default
// (server) conditions, as they do for a real SSR consumer. Vitest's own
// resolver is configured for the browser and cannot exercise this path.
const packageDir = resolve(__dirname, "..");

function runNode(type: "module" | "commonjs", code: string): string {
  if (!existsSync(resolve(packageDir, "dist/index.mjs"))) {
    throw new Error(
      "@json-render/solid is not built; run `pnpm --filter @json-render/solid build` first",
    );
  }
  return execFileSync(process.execPath, [`--input-type=${type}`, "-e", code], {
    cwd: packageDir,
    encoding: "utf8",
  }).trim();
}

const spec = JSON.stringify({
  root: "root",
  elements: {
    root: { type: "Text", props: { text: "Hello from SSR" }, children: [] },
  },
});

describe("server-side usage", () => {
  it("imports under Node's ESM server conditions", () => {
    const out = runNode(
      "module",
      `import * as m from "@json-render/solid"; console.log(typeof m.Renderer);`,
    );
    expect(out).toBe("function");
  });

  it("requires under Node's CJS server conditions", () => {
    const out = runNode(
      "commonjs",
      `const m = require("@json-render/solid"); console.log(typeof m.Renderer);`,
    );
    expect(out).toBe("function");
  });

  it("renders a spec to a string with solid-js/web", () => {
    const out = runNode(
      "module",
      `
      import { renderToString } from "solid-js/web";
      import { createComponent } from "solid-js";
      import { JSONUIProvider, Renderer } from "@json-render/solid";
      const registry = { Text: (props) => props.element.props.text };
      const spec = ${spec};
      console.log(renderToString(() =>
        createComponent(JSONUIProvider, {
          registry,
          get children() {
            return createComponent(Renderer, { spec, registry });
          },
        }),
      ));
      `,
    );
    expect(out).toContain("Hello from SSR");
  });
});

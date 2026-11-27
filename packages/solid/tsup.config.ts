import { defineConfig, type Options } from "tsup";
import { solidPlugin } from "esbuild-plugin-solid";

const shared: Options = {
  format: ["cjs", "esm"],
  sourcemap: true,
  external: ["solid-js", "@json-render/core"],
};

export default defineConfig([
  // Client build: compiled with Solid's DOM output.
  {
    ...shared,
    entry: ["src/index.ts", "src/schema.ts"],
    dts: true,
    esbuildPlugins: [solidPlugin({ solid: { generate: "dom" } })],
  },
  // Server build: compiled with Solid's SSR output. The DOM output calls
  // `template()` at module scope, which solid-js/web's server runtime rejects,
  // so server runtimes resolve "." to this file instead (see package.json).
  {
    ...shared,
    entry: { "index.server": "src/index.ts" },
    dts: false,
    esbuildPlugins: [solidPlugin({ solid: { generate: "ssr" } })],
  },
]);

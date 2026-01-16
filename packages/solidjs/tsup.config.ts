import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ["solid-js", "@json-render/core"],
  esbuildOptions(options) {
    options.jsx = "preserve";
    options.jsxImportSource = "solid-js";
  },
});

import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: [
    "@json-render/core",
    "@json-render/core/store-utils",
    "@xstate/store",
  ],
});

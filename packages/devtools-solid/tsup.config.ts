import { defineConfig } from "tsup";
import { emitTypes } from "../../scripts/emit-types.mjs";
import { solidPlugin } from "esbuild-plugin-solid";

export default defineConfig((options) => ({
  entry: ["src/index.tsx"],
  format: ["cjs", "esm"],
  sourcemap: true,
  clean: true,
  esbuildPlugins: [solidPlugin({ solid: { generate: "dom" } })],
  external: [
    "solid-js",
    "@json-render/core",
    "@json-render/core/store-utils",
    "@json-render/devtools",
    "@json-render/solid",
  ],
  onSuccess: async () => {
    await emitTypes(__dirname, {
      watch: Boolean(options.watch),
    });
  },
}));

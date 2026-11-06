import { defineConfig } from "tsup";
import { emitTypes } from "../../scripts/emit-types.mjs";
import { solidPlugin } from "esbuild-plugin-solid";

export default defineConfig({
  entry: ["src/index.ts", "src/schema.ts"],
  format: ["cjs", "esm"],
  sourcemap: true,
  clean: true,
  esbuildPlugins: [solidPlugin({ solid: { generate: "dom" } })],
  external: ["solid-js", "@json-render/core"],
  onSuccess: async () => {
    await emitTypes(__dirname);
  },
});

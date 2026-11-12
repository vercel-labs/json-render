import { defineConfig } from "tsup";
import { emitTypes } from "../../scripts/emit-types.mjs";

export default defineConfig((options) => ({
  entry: ["src/index.ts", "src/schema.ts"],
  format: ["cjs", "esm"],
  sourcemap: true,
  clean: true,
  external: ["vue", "@json-render/core"],
  onSuccess: async () => {
    await emitTypes(__dirname, {
      watch: Boolean(options.watch),
    });
  },
}));

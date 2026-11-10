import { defineConfig } from "tsup";
import { emitTypes } from "../../scripts/emit-types.mjs";

export default defineConfig((options) => ({
  entry: ["src/index.ts", "src/schema.ts", "src/catalog.ts"],
  format: ["cjs", "esm"],
  sourcemap: true,
  clean: true,
  noExternal: ["@internal/react-state"],
  external: ["react", "react-native", "@json-render/core", "zod"],
  onSuccess: async () => {
    await emitTypes(__dirname, {
      watch: Boolean(options.watch),
      bundle: {
        entries: ["index", "schema", "catalog"],
        resolve: ["@internal/react-state"],
      },
    });
  },
}));

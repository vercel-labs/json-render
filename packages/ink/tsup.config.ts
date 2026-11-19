import { defineConfig } from "tsup";
import { emitTypes } from "../../scripts/emit-types.mjs";

export default defineConfig((options) => ({
  entry: ["src/index.ts", "src/schema.ts", "src/catalog.ts", "src/server.ts"],
  format: ["cjs", "esm"],
  sourcemap: true,
  clean: true,
  noExternal: ["@internal/react-state"],
  external: ["react", "ink", "@json-render/core", "zod"],
  onSuccess: async () => {
    await emitTypes(__dirname, {
      watch: Boolean(options.watch),
      bundle: {
        entries: ["index", "schema", "catalog", "server"],
        resolve: ["@internal/react-state"],
      },
    });
  },
}));

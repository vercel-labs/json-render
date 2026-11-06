import { defineConfig } from "tsup";
import { emitTypes } from "../../scripts/emit-types.mjs";

export default defineConfig({
  entry: ["src/index.ts", "src/schema.ts"],
  format: ["cjs", "esm"],
  sourcemap: true,
  clean: true,
  noExternal: ["@internal/react-state"],
  external: ["react", "react-dom", "@json-render/core"],
  onSuccess: async () => {
    await emitTypes(__dirname, {
      bundle: {
        entries: ["index", "schema"],
        resolve: ["@internal/react-state"],
      },
    });
  },
});

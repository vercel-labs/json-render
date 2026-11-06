import { defineConfig } from "tsup";
import { emitTypes } from "../../scripts/emit-types.mjs";

export default defineConfig({
  entry: ["src/index.ts", "src/server.ts", "src/catalog.ts", "src/render.tsx"],
  format: ["cjs", "esm"],
  sourcemap: true,
  clean: true,
  noExternal: ["@internal/react-state"],
  external: ["react", "@json-render/core", "@react-pdf/renderer", "zod"],
  onSuccess: async () => {
    await emitTypes(__dirname, {
      bundle: {
        entries: ["index", "server", "catalog", "render"],
        resolve: ["@internal/react-state"],
      },
    });
  },
});

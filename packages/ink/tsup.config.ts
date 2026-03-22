import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/schema.ts", "src/catalog.ts", "src/server.ts"],
  format: ["cjs", "esm"],
  dts: { resolve: ["@internal/react-state"] },
  sourcemap: true,
  clean: true,
  noExternal: ["@internal/react-state"],
  external: ["react", "ink", "@json-render/core", "zod"],
});

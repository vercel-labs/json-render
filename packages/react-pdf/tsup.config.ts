import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/server.ts", "src/catalog.ts", "src/render.tsx"],
  format: ["cjs", "esm"],
  dts: { resolve: ["@internal/react-state"] },
  sourcemap: true,
  clean: true,
  noExternal: ["@internal/react-state"],
  external: ["react", "@json-render/core", "@react-pdf/renderer", "zod"],
});

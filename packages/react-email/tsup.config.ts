import { defineConfig } from "tsup";
import { emitTypes } from "../../scripts/emit-types.mjs";

export default defineConfig({
  entry: ["src/index.ts", "src/server.ts", "src/catalog.ts", "src/render.tsx"],
  format: ["cjs", "esm"],
  sourcemap: true,
  clean: true,
  external: [
    "react",
    "@json-render/core",
    "@react-email/components",
    "@react-email/render",
    "zod",
  ],
  onSuccess: async () => {
    await emitTypes(__dirname);
  },
});

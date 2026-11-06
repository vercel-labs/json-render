import { defineConfig } from "tsup";
import { emitTypes } from "../../scripts/emit-types.mjs";

export default defineConfig({
  entry: ["src/index.ts", "src/catalog.ts"],
  format: ["cjs", "esm"],
  sourcemap: true,
  clean: true,
  external: [
    "react",
    "react-dom",
    "@json-render/core",
    "@json-render/react",
    "zod",
  ],
  onSuccess: async () => {
    await emitTypes(__dirname);
  },
});

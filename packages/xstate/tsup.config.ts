import { defineConfig } from "tsup";
import { emitTypes } from "../../scripts/emit-types.mjs";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  sourcemap: true,
  clean: true,
  external: [
    "@json-render/core",
    "@json-render/core/store-utils",
    "@xstate/store",
  ],
  onSuccess: async () => {
    await emitTypes(__dirname);
  },
});

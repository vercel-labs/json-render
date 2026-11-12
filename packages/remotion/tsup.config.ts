import { defineConfig } from "tsup";
import { emitTypes } from "../../scripts/emit-types.mjs";

export default defineConfig((options) => ({
  entry: ["src/index.ts", "src/server.ts"],
  format: ["cjs", "esm"],
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom", "remotion", "@json-render/core", "zod"],
  onSuccess: async () => {
    await emitTypes(__dirname, {
      watch: Boolean(options.watch),
    });
  },
}));

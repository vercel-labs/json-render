import { defineConfig } from "tsup";
import { emitTypes } from "../../scripts/emit-types.mjs";

export default defineConfig((options) => ({
  entry: ["src/index.ts", "src/server.ts", "src/catalog.ts", "src/render.tsx"],
  format: ["cjs", "esm"],
  sourcemap: true,
  clean: true,
  external: [
    "@json-render/core",
    "satori",
    "@resvg/resvg-js",
    "zod",
    "react",
    "react/jsx-runtime",
  ],
  onSuccess: async () => {
    await emitTypes(__dirname, {
      watch: Boolean(options.watch),
    });
  },
}));

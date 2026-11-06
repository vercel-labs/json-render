import { defineConfig } from "tsup";
import { emitTypes } from "../../scripts/emit-types.mjs";

export default defineConfig({
  entry: ["src/index.ts", "src/app.ts", "src/build-app-html-entry.ts"],
  format: ["cjs", "esm"],
  sourcemap: true,
  clean: true,
  external: [
    "react",
    "react-dom",
    "@json-render/core",
    "@json-render/react",
    "@modelcontextprotocol/sdk",
    "@modelcontextprotocol/ext-apps",
  ],
  onSuccess: async () => {
    await emitTypes(__dirname);
  },
});

import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/app.ts"],
  format: ["cjs", "esm"],
  dts: true,
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
});

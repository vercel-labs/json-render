import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/server.ts", "src/catalog.ts", "src/render.tsx"],
  format: ["cjs", "esm"],
  dts: true,
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
});

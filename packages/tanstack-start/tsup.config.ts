import { defineConfig } from "tsup";

const sharedExternal = [
  "react",
  "react-dom",
  "@tanstack/react-router",
  "@json-render/core",
  "@json-render/react",
  "zod",
];

export default defineConfig([
  {
    entry: { index: "src/index.ts" },
    format: ["cjs", "esm"],
    dts: true,
    sourcemap: true,
    splitting: true,
    external: sharedExternal,
  },
  {
    entry: { server: "src/server.ts", catalog: "src/catalog.ts" },
    format: ["cjs", "esm"],
    dts: true,
    sourcemap: true,
    splitting: false,
    external: sharedExternal,
  },
]);

import { defineConfig } from "tsup";
import { emitTypes } from "../../scripts/emit-types.mjs";

const sharedExternal = [
  "react",
  "react-dom",
  "next",
  "next/link",
  "next/navigation",
  "@json-render/core",
  "@json-render/react",
];

export default defineConfig([
  {
    entry: {
      index: "src/index.ts",
      "page-renderer-client": "src/page-renderer-client.tsx",
    },
    format: ["cjs", "esm"],
    sourcemap: true,
    splitting: true,
    banner: { js: '"use client";' },
    external: sharedExternal,
    onSuccess: async () => {
      await emitTypes(__dirname);
    },
  },
  {
    entry: { server: "src/server.ts" },
    format: ["cjs", "esm"],
    sourcemap: true,
    splitting: false,
    external: [...sharedExternal, /page-renderer-client/],
  },
]);

import { defineConfig } from "tsup";
import { emitTypes } from "../../scripts/emit-types.mjs";

const sharedExternal = [
  "react",
  "react-dom",
  "@tanstack/react-router",
  "@json-render/core",
  "@json-render/react",
  "zod",
];

export default defineConfig((options) => [
  {
    entry: { index: "src/index.ts" },
    format: ["cjs", "esm"],
    sourcemap: true,
    splitting: false,
    banner: ({ format }) => (format === "cjs" ? { js: '"use client";' } : {}),
    external: sharedExternal,
    onSuccess: async () => {
      await emitTypes(__dirname, {
        watch: Boolean(options.watch),
      });
    },
  },
  {
    entry: { server: "src/server.ts", catalog: "src/catalog.ts" },
    format: ["cjs", "esm"],
    sourcemap: true,
    splitting: false,
    external: sharedExternal,
  },
]);

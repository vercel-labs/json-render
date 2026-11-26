import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      zod: fileURLToPath(new URL("../core/node_modules/zod", import.meta.url)),
      "@json-render/core": fileURLToPath(
        new URL("../core/src/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: ["packages/python/tests/interop.ts"],
  },
});

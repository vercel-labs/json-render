import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      zod: fileURLToPath(
        new URL("../../packages/core/node_modules/zod", import.meta.url),
      ),
      "@json-render/core": fileURLToPath(
        new URL("../../packages/core/src/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: ["proposals/python-bindings/interop.test.ts"],
  },
});

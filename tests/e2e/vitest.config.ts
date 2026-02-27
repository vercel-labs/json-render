import { defineConfig } from "vitest/config";
import path from "path";

const root = path.resolve(__dirname, "../..");

export default defineConfig({
  resolve: {
    alias: {
      "@json-render/core/store-utils": path.resolve(
        root,
        "packages/core/src/store-utils.ts",
      ),
      "@json-render/core": path.resolve(root, "packages/core/src/index.ts"),
      "@json-render/react/schema": path.resolve(
        root,
        "packages/react/src/schema.ts",
      ),
      "@json-render/redux": path.resolve(root, "packages/redux/src/index.ts"),
      "@json-render/zustand": path.resolve(
        root,
        "packages/zustand/src/index.ts",
      ),
      "@json-render/jotai": path.resolve(root, "packages/jotai/src/index.ts"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.test.ts"],
    testTimeout: 60_000,
  },
});

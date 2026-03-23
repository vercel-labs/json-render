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
      "@json-render/ink/schema": path.resolve(
        root,
        "packages/ink/src/schema.ts",
      ),
      "@json-render/ink/catalog": path.resolve(
        root,
        "packages/ink/src/catalog.ts",
      ),
      "@json-render/ink": path.resolve(root, "packages/ink/src/index.ts"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.test.ts", "**/*.test.tsx"],
    testTimeout: 60_000,
  },
});

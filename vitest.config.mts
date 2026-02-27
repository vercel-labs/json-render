import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";
import { svelte } from "@sveltejs/vite-plugin-svelte";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [svelte({ hot: false })],
  resolve: {
    // Ensure Svelte resolves to browser bundle, not server
    conditions: ["browser"],
    // Deduplicate React and Vue so tests don't get two copies
    // (pnpm strict resolution can cause packages to resolve different copies)
    alias: {
      react: path.resolve(__dirname, "node_modules/react"),
      "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
      vue: path.resolve(__dirname, "packages/vue/node_modules/vue"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    include: ["packages/**/*.test.ts", "packages/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["packages/*/src/**/*.{ts,tsx,svelte}"],
      exclude: ["**/*.test.{ts,tsx}", "**/index.ts"],
    },
  },
});

import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import solid from "vite-plugin-solid";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    svelte({
      hot: false,
      compilerOptions: { runes: true },
      // Also transform bits-ui and vaul-svelte .svelte files so getContext works in tests
      include: ["**/*.svelte", "**/bits-ui/**/*.svelte", "**/vaul-svelte/**/*.svelte"],
    }),
    solid({
      // Only transform files in the solid package to avoid interfering with React JSX
      include: ["packages/solid/**/*.{ts,tsx}"],
    }),
  ],
  resolve: {
    // Ensure Svelte resolves to browser bundle, not server
    conditions: ["browser"],
    // Deduplicate React, Vue, and Solid so tests don't get two copies
    // (pnpm strict resolution can cause packages to resolve different copies)
    alias: {
      react: path.resolve(__dirname, "node_modules/react"),
      "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
      vue: path.resolve(__dirname, "packages/vue/node_modules/vue"),
      "solid-js": path.resolve(__dirname, "node_modules/solid-js"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    include: ["packages/**/*.test.ts", "packages/**/*.test.tsx"],
    server: {
      deps: {
        inline: [/bits-ui/, /runed/, /vaul-svelte/, /@lucide\/svelte/],
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["packages/*/src/**/*.{ts,tsx,svelte}"],
      exclude: ["**/*.test.{ts,tsx}", "**/index.ts"],
    },
  },
});

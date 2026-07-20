import { defineConfig } from "vitest/config";
import angular from "@analogjs/vite-plugin-angular";

// Dedicated Vitest project for @json-render/angular. Kept separate from the root
// config so the Angular compiler pipeline (@analogjs/vite-plugin-angular) does
// not interfere with the React/Svelte/Solid transforms used by other packages.
export default defineConfig({
  plugins: [angular({ tsconfig: "./tsconfig.spec.json" })],
  test: {
    name: "angular",
    globals: true,
    environment: "jsdom",
    setupFiles: ["src/test-setup.ts"],
    include: ["src/**/*.test.ts"],
  },
});

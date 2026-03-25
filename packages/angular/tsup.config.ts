import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/schema.ts"],
  format: ["cjs", "esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: [
    "@angular/common",
    "@angular/core",
    "@angular/platform-browser",
    "@json-render/core",
  ],
});

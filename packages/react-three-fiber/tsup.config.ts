import { defineConfig } from "tsup";
import { emitTypes } from "../../scripts/emit-types.mjs";

export default defineConfig((options) => ({
  entry: ["src/index.ts", "src/catalog.ts"],
  format: ["cjs", "esm"],
  sourcemap: true,
  clean: true,
  external: [
    "react",
    "react-dom",
    "@json-render/core",
    "@json-render/react",
    "@react-three/fiber",
    "@react-three/drei",
    "three",
    "zod",
  ],
  onSuccess: async () => {
    await emitTypes(__dirname, {
      watch: Boolean(options.watch),
    });
  },
}));

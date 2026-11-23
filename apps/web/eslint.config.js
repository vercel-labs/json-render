import { nextJsConfig } from "@internal/eslint-config/next-js";

/** @type {import("eslint").Linter.Config[]} */
export default [
  { ignores: [".source/**"] },
  ...nextJsConfig,
  {
    rules: {
      // Disable prop-types - we use TypeScript for type checking
      "react/prop-types": "off",
    },
  },
  {
    // OG cards are rendered by satori, which embeds assets with <img>; next/image
    // is not available there.
    files: ["app/og/**/*.tsx"],
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
];

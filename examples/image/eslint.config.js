import { nextJsConfig } from "@internal/eslint-config/next-js";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...nextJsConfig,
  {
    rules: {
      "react/prop-types": "off",
      "@next/next/no-img-element": "off",
    },
  },
];

import { nextJsConfig } from "@internal/eslint-config/next-js";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...nextJsConfig,
  {
    rules: {
      "react/prop-types": "off",
      "react/no-unknown-property": ["error", { ignore: ["jsx"] }],
    },
  },
];

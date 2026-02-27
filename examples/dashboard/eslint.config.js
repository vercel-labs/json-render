import { nextJsConfig } from "@internal/eslint-config/next-js";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...nextJsConfig,
  {
    rules: {
      // Disable prop-types - we use TypeScript for type checking
      "react/prop-types": "off",
      // Allow styled-jsx
      "react/no-unknown-property": ["error", { ignore: ["jsx"] }],
      // Allow DATABASE_URL env var
      "turbo/no-undeclared-env-vars": [
        "error",
        { allowList: ["DATABASE_URL"] },
      ],
    },
  },
];

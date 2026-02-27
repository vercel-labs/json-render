import { config as reactConfig } from "@internal/eslint-config/react-internal";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...reactConfig,
  {
    rules: {
      // Disable prop-types - we use TypeScript for type checking
      "react/prop-types": "off",
      // Allow underscore-prefixed unused variables
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
];

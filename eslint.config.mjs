import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescriptConfig from "eslint-config-next/typescript";

const eslintConfig = [
  ...coreWebVitals,
  ...typescriptConfig,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "legacy/**",
      "scripts/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "blob-report/**",
      "prisma/migrations/**",
    ],
  },
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      // Prisma delegates occasionally need explicit any-ish shapes.
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];

export default eslintConfig;

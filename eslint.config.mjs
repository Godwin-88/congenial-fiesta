import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Allow @ts-ignore comments
      "@typescript-eslint/ban-ts-comment": "off",
      // Allow any type
      "@typescript-eslint/no-explicit-any": "off",
      // Allow unused vars with underscore prefix
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      // Allow unescaped entities like apostrophes in JSX (pre-existing across codebase)
      "react/no-unescaped-entities": "off",
      // Allow <a> tags for navigation (some are download links, hash links, etc.)
      "@next/next/no-html-link-for-pages": "off",
    },
  },
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "public/sw.js",
      "public/workbox-*.js",
    ],
  },
];

export default eslintConfig;
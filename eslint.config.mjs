import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  { ignores: ["build/", "dist/", "node_modules/", ".playwright-mcp/"] },

  // App source — .js files contain JSX too (see vite.config.js esbuild loader)
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser },
    },
    settings: { react: { version: "detect" } },
    plugins: { react, "react-hooks": reactHooks },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...react.configs["jsx-runtime"].rules,
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react/prop-types": "off",
    },
  },

  // Tests run under Vitest with jsdom
  {
    files: ["src/**/*.{test,spec}.{js,jsx}", "src/setupTests.js"],
    languageOptions: { globals: { ...globals.node, ...globals.vitest } },
  },

  // Root tooling config: ESM (vite) and CommonJS (tailwind, postcss, commitlint)
  {
    files: ["*.config.{js,mjs}"],
    languageOptions: { sourceType: "module", globals: { ...globals.node } },
    rules: js.configs.recommended.rules,
  },
  {
    files: ["tailwind.config.js", "postcss.config.js", "commitlint.config.js"],
    languageOptions: { sourceType: "commonjs" },
  },
];

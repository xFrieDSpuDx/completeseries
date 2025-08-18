// eslint.config.mjs
import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["scripts/**/*.js", "**/*.mjs", "**/*.cjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser, // for client-side code
        ...globals.node,    // for build scripts like esbuild.config.mjs
      },
    },
    plugins: {},
    extends: [js.configs.recommended],
    rules: {
      // === Style: quotes (double everywhere; allow escaping and template literals) ===
      quotes: ["error", "double", { avoidEscape: true, allowTemplateLiterals: true }],
      "jsx-quotes": ["error", "prefer-double"],

      // === Naming: discourage single-character identifiers (tweak exceptions as desired) ===
      "id-length": ["warn", {
        min: 2,
        exceptions: [
          // common iterators / axes (allow if you ever need them)
          "i", "j", "k", "x", "y", "z",
          // small common abbreviations
          "fs", "os", "db",
        ],
      }],

      // Reasonable baseline strictness
      "no-var": "error",
      "prefer-const": ["error", { destructuring: "all" }],
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
      "object-shorthand": ["error", "always"],
      "prefer-template": "error",
      "arrow-body-style": ["error", "as-needed"],
    },
    ignores: [
      "node_modules/",
      "dist/",
      ".build/",
      "**/*.min.js",
    ],
  },

  // Optional: relax rule for config/automation files where short ids are conventional
  {
    files: ["esbuild.config.mjs"],
    rules: {
      "id-length": "off",
      "no-console": "off",
    },
  },
]);
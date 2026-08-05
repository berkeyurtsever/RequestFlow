import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import {
  defineConfig,
  globalIgnores
} from "eslint/config";

export default defineConfig([
  globalIgnores([
    "dist",
    "node_modules",
    "src/App.backup.css"
  ]),

  {
    files: ["**/*.{js,jsx}"],

    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite
    ],

    languageOptions: {
      ecmaVersion: "latest",
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: "latest",
        ecmaFeatures: {
          jsx: true
        },
        sourceType: "module"
      }
    },

    rules: {
      /*
       * RequestFlow loads API data when pages open.
       * These effects intentionally update loading,
       * data and error states.
       */
      "react-hooks/set-state-in-effect": "off",

      /*
       * Icon components are selected dynamically
       * according to activity and toast types.
       */
      "react-hooks/static-components": "off",

      /*
       * Context files export providers together
       * with reusable hooks such as useAuth.
       */
      "react-refresh/only-export-components": "off",

      /*
       * The frontend converts Axios errors into
       * user-friendly application messages.
       */
      "preserve-caught-error": "off",

      "no-unused-vars": [
        "error",
        {
          varsIgnorePattern: "^[A-Z_]",
          argsIgnorePattern: "^_"
        }
      ]
    }
  }
]);
// ═══════════════════════════════════════════════════════════════
// ClubCampus — ESLint Flat Config (ESLint 9)
// React 18 + TypeScript + Vite.
//
// Bewusst schlank: NUR die vereinbarten Regeln, kein
// js.configs.recommended / tseslint.recommended-Preset (die würden
// hunderte error-Level-Verstösse in Legacy-Code werfen — explizit
// unerwünscht). Keine Formatierungsregeln (kein Prettier-Konflikt).
//
// CI blockt nur bei `error`:
//   - react-hooks/rules-of-hooks
//   - import/no-restricted-paths (Schichtenregel)
// Alles andere ist `warn` (informativ, wird schrittweise abgebaut).
// ═══════════════════════════════════════════════════════════════
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import importPlugin from "eslint-plugin-import";
import globals from "globals";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "src/database.types.ts", // generiert
      "**/*.d.ts",
      "src/**/__tests__/**", // Tests: eigene Konventionen, nicht Lint-Ziel
    ],
  },

  {
    files: ["src/**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        sourceType: "module",
      },
      globals: { ...globals.browser },
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      "react-hooks": reactHooks,
      import: importPlugin,
    },
    settings: {
      "import/resolver": {
        typescript: { alwaysTryTypes: true },
      },
    },
    rules: {
      // @typescript-eslint/recommended, aber „kein any" nur als Warnung
      "@typescript-eslint/no-explicit-any": "warn",

      // Ungenutzte Variablen und Imports (warn). `_`-Präfix = absichtlich.
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrors: "none",
      }],

      // React Hooks
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // Keine console.log in Produktion (warn/error fürs Logging erlaubt)
      "no-console": ["warn", { allow: ["warn", "error"] }],

      // Maximale Dateigrösse (physische Zeilen)
      "max-lines": ["warn", { max: 300 }],

      // Import-Richtung (Option B): shared/ und domains/ dürfen nicht aus
      // modules/ importieren („kennen keine Module").
      "import/no-restricted-paths": ["error", {
        zones: [
          { target: "./src/shared", from: "./src/modules", message: "shared/ darf nicht aus modules/ importieren (Schichtenregel modules -> domains -> shared)." },
          { target: "./src/domains", from: "./src/modules", message: "domains/ darf nicht aus modules/ importieren (Schichtenregel modules -> domains -> shared)." },
        ],
      }],
    },
  },
);

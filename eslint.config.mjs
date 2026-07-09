import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Brand primitives copied verbatim from elyst-website (T0 bootstrap).
    // They carry the same pre-existing lint debt as the source repo and are
    // not edited in this repo, so they are exempt to keep the gate meaningful
    // for LMS code. Remove an entry if the file is ever modified here.
    "src/components/ui/canvas.tsx",
    "src/components/ui/input-otp.tsx",
    "src/components/ui/pointer-highlight.tsx",
    "src/components/ui/typewriter.tsx",
    "src/lib/use-reduced-effects.ts",
    "src/lib/use-touch.ts",
  ]),
]);

export default eslintConfig;

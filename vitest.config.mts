import { defineConfig } from "vitest/config";

// Unit tests only — every module under test is pure (no DB, no React, no
// request context), so there is no jsdom environment and no Prisma mock here.
// If a test ever needs the database, it belongs in a separate integration
// project against the dev Supabase, not in this config.
//
// .mts (not .ts) so Vite loads this as real ESM rather than warning about
// ESM syntax in a file it treats as CommonJS.
export default defineConfig({
  resolve: {
    // Resolves the "@/..." alias from tsconfig.json so tests import modules
    // the same way the app does. Native replacement for vite-tsconfig-paths.
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});

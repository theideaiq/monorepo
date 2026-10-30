import { defineConfig } from "vitest/config";

// `bun run test:coverage` runs every workspace's tests in one Vitest process
// for a single coverage report; `bun run test` runs them per workspace
// through Turborepo (cached).
export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "cobertura"],
      reportsDirectory: "./coverage",
    },
    projects: [
      "apps/api",
      "apps/partners",
      "apps/staff",
      "apps/app",
      "packages/analytics",
      "packages/auth",
      "packages/commerce",
      "packages/config",
      "packages/droid",
      "packages/internationalization",
      "packages/next-config",
      "packages/payments",
      "packages/storage",
      "scripts",
    ],
  },
});

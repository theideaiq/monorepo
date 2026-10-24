import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // tsconfig keeps JSX for Next.js; tests need it compiled.
  oxc: { jsx: { runtime: "automatic" } },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./"),
      "@repo": path.resolve(import.meta.dirname, "../../packages"),
    },
  },
  test: {
    environment: "node",
    exclude: ["node_modules", ".next"],
    include: ["**/*.test.{ts,tsx}"],
  },
});

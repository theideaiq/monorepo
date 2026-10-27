import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./"),
      "@repo": path.resolve(import.meta.dirname, "../../packages"),
    },
  },
  test: {
    env: {
      NEXT_PUBLIC_API_URL: "http://localhost:3002",
      NEXT_PUBLIC_STAFF_URL: "http://localhost:3003",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_WEB_URL: "http://localhost:3001",
    },
    environment: "jsdom",
    exclude: ["**/node_modules/**", ".next/**", "public/**"],
    include: ["**/*.test.{ts,tsx}"],
  },
});

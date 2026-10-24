import { execSync } from "node:child_process";
import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end journeys against a local Supabase stack and the three Next.js
 * apps (CI: .github/workflows/ci.yml, job "e2e"). Locally: `bun run
 * db:start`, then `bun run --cwd apps/e2e e2e`; the servers are started here
 * unless already running. E2E_START=start runs the built apps (`next start`,
 * as CI does after `turbo build`) instead of the dev servers.
 */

/** Fills in the local stack's URL and keys from `supabase status`. */
const loadLocalStack = () => {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY) {
    return;
  }
  try {
    const output = execSync("bunx supabase status -o env", {
      cwd: new URL("../../packages/database", import.meta.url),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const values = Object.fromEntries(
      output
        .split("\n")
        .map((line) => /^([A-Z_]+)="?([^"]*)"?$/.exec(line.trim()))
        .filter((match) => match !== null)
        .map((match) => [match[1], match[2]])
    );
    process.env.SUPABASE_URL ??= values.API_URL;
    process.env.SUPABASE_SECRET_KEY ??= values.SECRET_KEY;
    process.env.SUPABASE_PUBLISHABLE_KEY ??= values.PUBLISHABLE_KEY;
  } catch {
    // Not running: global setup reports the missing keys.
  }
};

loadLocalStack();
process.env.SUPABASE_URL ??= "http://127.0.0.1:54321";
// The apps must talk to the same stack (and the same cookie name) as the tests.
process.env.NEXT_PUBLIC_SUPABASE_URL ??= process.env.SUPABASE_URL;
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??=
  process.env.SUPABASE_PUBLISHABLE_KEY;

const app = process.env.E2E_APP_URL ?? "http://localhost:3000";
const web = process.env.E2E_WEB_URL ?? "http://localhost:3001";
const admin = process.env.E2E_ADMIN_URL ?? "http://localhost:3005";
const script = process.env.E2E_START === "start" ? "start" : "dev";
// `next start` takes its port from -p (admin's start script sets its own).
const port = (url: string) =>
  script === "start" ? ` -p ${new URL(url).port}` : "";

export default defineConfig({
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: false,
  globalSetup: "./global-setup.ts",
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM
          ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM }
          : {},
      },
    },
  ],
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  retries: 0,
  testDir: "./tests",
  timeout: 120_000,
  use: { trace: "retain-on-failure" },
  webServer: [
    {
      command: `bun run --cwd ../app ${script}${port(app)}`,
      reuseExistingServer: true,
      timeout: 240_000,
      url: `${app}/en/sign-in`,
    },
    {
      command: `bun run --cwd ../web ${script}${port(web)}`,
      reuseExistingServer: true,
      timeout: 240_000,
      url: `${web}/en`,
    },
    {
      command: `bun run --cwd ../admin ${script}`,
      reuseExistingServer: true,
      timeout: 240_000,
      url: `${admin}/en/sign-in`,
    },
  ],
  workers: 1,
});

export const urls = { admin, app, web };

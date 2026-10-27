import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import {
  envReads,
  runtimeImports,
  SecretScanner,
  serverVariables,
  stripComments,
} from "./check-secrets";

const KEYS = (server: string, client = "") => `
import { createEnv } from "@t3-oss/env-nextjs";
export const keys = () =>
  createEnv({
    client: { ${client} },
    runtimeEnv: {},
    server: {
      ${server}
    },
  });
`;

let root: string | undefined;

/** A throwaway repository: { "path": "content" }. */
const repo = (files: Record<string, string>) => {
  root = mkdtempSync(join(tmpdir(), "check-secrets-"));
  const all = {
    "apps/api/env.ts": KEYS("CRON_SECRET: z.string(),"),
    ...files,
  };
  for (const [path, content] of Object.entries(all)) {
    const file = join(root, path);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, content);
  }
  return new SecretScanner(root);
};

const pkg = (name: string, exports?: Record<string, string>) =>
  JSON.stringify({ exports, name });

afterEach(() => {
  if (root) {
    rmSync(root, { force: true, recursive: true });
    root = undefined;
  }
});

describe("parsing", () => {
  test("serverVariables reads only top-level server keys", () => {
    expect(
      serverVariables(
        KEYS(
          `WAYL_ENV: z.enum(["live", "test"]).default("live"),
           // OLD_TOKEN: z.string(),
           RESEND_TOKEN: z.string().regex(/re_/).optional(),
           NESTED: z.object({ INNER_KEY: z.string() }),`,
          "NEXT_PUBLIC_URL: z.url(),"
        )
      )
    ).toEqual(["WAYL_ENV", "RESEND_TOKEN", "NESTED"]);
  });

  test("stripComments keeps strings and line numbers", () => {
    const source = `const a = "https://x.test"; // RESEND_TOKEN\n/* ARCJET_KEY\n */b`;
    expect(stripComments(source)).toBe(`const a = "https://x.test"; \n\nb`);
  });

  test("runtimeImports skips type-only imports", () => {
    const imports = runtimeImports(`
      import type { A } from "@repo/a";
      import { type B, type C } from "@repo/b";
      import { type D, e } from "@repo/c";
      import "server-only";
      export { f } from "./f";
      export type { G } from "./g";
      const h = await import("@repo/h");
    `).map(({ specifier }) => specifier);
    expect(imports.sort()).toEqual([
      "./f",
      "@repo/c",
      "@repo/h",
      "server-only",
    ]);
  });

  test("envReads finds process.env and env reads", () => {
    expect(
      envReads(`process.env.A; process.env["B_TOKEN"]; env.C; myenv.D`).map(
        ({ name }) => name
      )
    ).toEqual(["A", "B_TOKEN", "C"]);
  });
});

describe("SecretScanner", () => {
  const packages = {
    "packages/email/index.ts": `import { keys } from "./keys";\nexport const send = keys();`,
    "packages/email/keys.ts": KEYS("RESEND_TOKEN: z.string(),"),
    "packages/email/package.json": pkg("@repo/email"),
    "packages/email/templates/contact.tsx": "export const T = () => null;",
    "packages/flags/index.ts":
      "export const on = Boolean(process.env.FLAGS_SECRET);",
    "packages/flags/package.json": pkg("@repo/flags"),
    "packages/next-config/keys.ts": KEYS(
      "VERCEL_ENV: z.string(), ANALYZE: z.string(),",
      "NEXT_PUBLIC_WEB_URL: z.url(),"
    ),
    "packages/next-config/package.json": pkg("@repo/next-config", {
      "./keys": "./keys.ts",
    }),
  };

  test("passes public presets, public modules and exempt apps", () => {
    const scanner = repo({
      ...packages,
      "apps/api/route.ts": `import { send } from "@repo/email";\nprocess.env.CRON_SECRET;`,
      "apps/e2e/setup.ts": "process.env.SUPABASE_SECRET_KEY;",
      "apps/web/.env.example": `NEXT_PUBLIC_WEB_URL=""\nSENTRY_ORG=""`,
      "apps/web/env.ts": `import { keys } from "@repo/next-config/keys";\n${KEYS("ANALYZE: z.string(),")}`,
      "apps/web/page.tsx": `import { T } from "@repo/email/templates/contact";\nimport type { X } from "@repo/email";\nprocess.env.NODE_ENV; env.NEXT_PUBLIC_WEB_URL;`,
    });
    expect(scanner.check()).toEqual([]);
  });

  test("flags declared, listed, read and imported secrets", () => {
    const scanner = repo({
      ...packages,
      "apps/web/.env.example": `RESEND_TOKEN=""`,
      "apps/web/action.ts": `import { send } from "@repo/email";`,
      "apps/web/env.ts": KEYS("CRON_SECRET: z.string(),"),
      "apps/web/flags.ts": `export { on } from "@repo/flags";`,
      "apps/web/read.ts": "const t = process.env.STRIPE_API_KEY;",
    });
    const problems = scanner.check().join("\n");
    expect(problems).toContain("apps/web/.env.example:1 lists RESEND_TOKEN");
    expect(problems).toContain(
      "apps/web/action.ts:1 imports @repo/email, which reaches a secret: packages/email/index.ts → packages/email/keys.ts (declares RESEND_TOKEN)"
    );
    expect(problems).toContain("apps/web/env.ts declares CRON_SECRET");
    expect(problems).toContain(
      "apps/web/flags.ts:1 imports @repo/flags, which reaches a secret: packages/flags/index.ts:1 (reads FLAGS_SECRET)"
    );
    // Credential-shaped names count even when no keys.ts declares them.
    expect(problems).toContain("apps/web/read.ts:1 reads STRIPE_API_KEY");
  });

  test("respects package exports", () => {
    const scanner = repo({
      ...packages,
      "apps/partners/a.ts": `import "@repo/next-config/keys";`,
      "apps/partners/b.ts": `import "@repo/next-config/missing";`,
    });
    expect(scanner.check()).toEqual([]);
  });
});

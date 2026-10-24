#!/usr/bin/env bun
/**
 * Secrets live only in apps/api. Fails when another app (apps/e2e, a test
 * harness, is exempt too):
 *
 * - declares a server-only variable in its `env.ts` (`server: { … }`) or
 *   lists one in its `.env.example`;
 * - imports a module of a package that reaches a secret (a `keys.ts`
 *   preset with a server-only variable, or code reading one from
 *   `process.env`), directly or through the package's own imports;
 * - reads a server-only variable (`process.env.X`, `env.X`).
 *
 * Server-only variables are every `server: { … }` name in the packages'
 * `keys.ts` and in apps/api/env.ts, minus build-time and platform values
 * that are not secrets (PUBLIC_SERVER_VARIABLES), plus any name that looks
 * like a credential (SECRET, TOKEN, PASSWORD, PRIVATE, _KEY). Type-only
 * imports and comments are ignored.
 *
 *   bun run check:secrets
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";

/** Server variables that are build or platform values, not secrets. */
export const PUBLIC_SERVER_VARIABLES = new Set([
  "ANALYZE",
  "BUILD_TARGET",
  "CAP_SERVER_URL",
  "CI",
  "NEXT_RUNTIME",
  "NODE_ENV",
  "SENTRY_ORG",
  "SENTRY_PROJECT",
  "SKIP_ENV_VALIDATION",
  "VERCEL",
  "VERCEL_ENV",
  "VERCEL_PROJECT_PRODUCTION_URL",
  "VERCEL_REGION",
  "VERCEL_URL",
]);

/** Apps allowed to hold secrets. */
export const EXEMPT_APPS = new Set(["api", "e2e"]);

const CREDENTIAL = /SECRET|TOKEN|PASSWORD|PRIVATE|_KEY$|_KEY_/;
const SOURCE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
]);
const IGNORED_DIRECTORIES = new Set([
  ".claude",
  ".next",
  ".react-email",
  ".turbo",
  "android",
  "coverage",
  "dist",
  "ios",
  "node_modules",
  "out",
  "storybook-static",
]);

/** A server-only variable name (credential-shaped or known). */
export const isSecretName = (name: string, known: ReadonlySet<string>) =>
  !(name.startsWith("NEXT_PUBLIC_") || PUBLIC_SERVER_VARIABLES.has(name)) &&
  (known.has(name) || CREDENTIAL.test(name));

/**
 * Source without comments, keeping strings (and line breaks, so reported
 * line numbers stay right).
 */
export const stripComments = (source: string) => {
  let out = "";
  let quote: string | null = null;
  for (let i = 0; i < source.length; i++) {
    const char = source[i] as string;
    const next = source[i + 1];
    if (quote) {
      out += char;
      if (char === "\\") {
        out += next ?? "";
        i++;
      } else if (char === quote) {
        quote = null;
      }
    } else if (char === "/" && next === "/") {
      while (i < source.length && source[i] !== "\n") {
        i++;
      }
      out += "\n";
    } else if (char === "/" && next === "*") {
      const end = source.indexOf("*/", i + 2);
      const comment = source.slice(i, end === -1 ? source.length : end + 2);
      out += comment.replace(/[^\n]/g, "");
      i = end === -1 ? source.length : end + 1;
    } else {
      if (char === '"' || char === "'" || char === "`") {
        quote = char;
      }
      out += char;
    }
  }
  return out;
};

/** The names declared in each `server: { … }` block of a createEnv call. */
export const serverVariables = (source: string): string[] => {
  const code = stripComments(source);
  const names: string[] = [];
  for (const match of code.matchAll(/\bserver\s*:\s*\{/g)) {
    let depth = 1;
    let i = (match.index ?? 0) + match[0].length;
    const start = i;
    while (i < code.length && depth > 0) {
      if (code[i] === "{") {
        depth++;
      } else if (code[i] === "}") {
        depth--;
      }
      i++;
    }
    const block = code.slice(start, i - 1);
    // Top-level keys only: names followed by a colon at nesting depth 0.
    let level = 0;
    for (const token of block.matchAll(/[{}()[\]]|\b([A-Z][A-Z0-9_]*)\s*:/g)) {
      const [text, name] = token;
      if ("{([".includes(text)) {
        level++;
      } else if ("})]".includes(text)) {
        level--;
      } else if (level === 0 && name) {
        names.push(name);
      }
    }
  }
  return names;
};

/** Runtime (not type-only) import specifiers, with their line numbers. */
export const runtimeImports = (source: string) => {
  const code = stripComments(source);
  const found: { line: number; specifier: string }[] = [];
  const patterns = [
    /\bimport\s+(?!type\s)(?:[\w*{}\s,$]+?\s+from\s+)?["']([^"']+)["']/g,
    /\bexport\s+(?!type\s)[\w*{}\s,$]*?\s+from\s+["']([^"']+)["']/g,
    /\b(?:import|require)\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const pattern of patterns) {
    for (const match of code.matchAll(pattern)) {
      const specifier = match[1] as string;
      // `import { type A, type B } from` brings in nothing at runtime.
      const clause = match[0].match(/\{([^}]*)\}/)?.[1];
      const onlyTypes =
        clause !== undefined &&
        !match[0].replace(/\{[^}]*\}/, "").match(/import\s+[\w$]+\s*,/) &&
        clause
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean)
          .every((part) => part.startsWith("type "));
      if (!onlyTypes) {
        const line = code.slice(0, match.index).split("\n").length;
        found.push({ line, specifier });
      }
    }
  }
  return found;
};

/** `process.env.X`, `process.env["X"]` and `env.X` reads, with lines. */
export const envReads = (source: string) => {
  const code = stripComments(source);
  const found: { line: number; name: string }[] = [];
  const pattern =
    /\b(?:process\.env|env)(?:\.([A-Z][A-Z0-9_]*)|\[\s*["']([A-Z][A-Z0-9_]*)["']\s*\])/g;
  for (const match of code.matchAll(pattern)) {
    const line = code.slice(0, match.index).split("\n").length;
    found.push({ line, name: (match[1] ?? match[2]) as string });
  }
  return found;
};

/** Variable names assigned in a `.env.example`. */
export const exampleVariables = (source: string) =>
  source
    .split("\n")
    .map((line, index) => ({
      line: index + 1,
      name: line.match(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=/)?.[1],
    }))
    .filter((entry): entry is { line: number; name: string } =>
      Boolean(entry.name)
    );

const walk = (directory: string): string[] => {
  if (!existsSync(directory)) {
    return [];
  }
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) {
      return IGNORED_DIRECTORIES.has(entry) ? [] : walk(path);
    }
    return SOURCE_EXTENSIONS.has(extname(entry)) && !entry.endsWith(".d.ts")
      ? [path]
      : [];
  });
};

const FILE_CANDIDATES = [
  "",
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  "/index.ts",
  "/index.tsx",
  "/index.js",
];

const resolveFile = (base: string) => {
  for (const suffix of FILE_CANDIDATES) {
    const path = base + suffix;
    if (existsSync(path) && statSync(path).isFile()) {
      return path;
    }
  }
  // `./x.js` written for a `./x.ts` source.
  const swapped = base.replace(/\.js$/, ".ts");
  return swapped !== base && existsSync(swapped) ? swapped : undefined;
};

interface Workspace {
  dir: string;
  exports?: Record<string, string | Record<string, string>>;
}

export class SecretScanner {
  readonly secretNames = new Set<string>();
  private readonly packages = new Map<string, Workspace>();
  private readonly tainted = new Map<string, string[] | null>();

  constructor(private readonly root: string) {
    const packagesDir = join(root, "packages");
    for (const entry of readdirSync(packagesDir)) {
      const manifest = join(packagesDir, entry, "package.json");
      if (existsSync(manifest)) {
        const { exports, name } = JSON.parse(readFileSync(manifest, "utf8"));
        this.packages.set(name, { dir: join(packagesDir, entry), exports });
      }
    }
    const keysFiles = [
      ...walk(packagesDir).filter((file) => file.endsWith("keys.ts")),
      join(root, "apps/api/env.ts"),
    ];
    for (const file of keysFiles) {
      for (const name of serverVariables(readFileSync(file, "utf8"))) {
        if (!PUBLIC_SERVER_VARIABLES.has(name)) {
          this.secretNames.add(name);
        }
      }
    }
  }

  isSecret = (name: string) => isSecretName(name, this.secretNames);

  /** The file an import names, or undefined for anything outside the repo. */
  resolve(specifier: string, from: string): string | undefined {
    if (specifier.startsWith(".")) {
      return resolveFile(resolve(dirname(from), specifier));
    }
    const match = specifier.match(/^(@repo\/[^/]+)(?:\/(.+))?$/);
    const workspace = match && this.packages.get(match[1] as string);
    if (!workspace) {
      return undefined;
    }
    const subpath = match[2] ? `./${match[2]}` : ".";
    if (workspace.exports) {
      for (const [key, value] of Object.entries(workspace.exports)) {
        const target = typeof value === "string" ? value : value.default;
        if (!target) {
          continue;
        }
        if (key === subpath) {
          return resolveFile(join(workspace.dir, target));
        }
        if (key.endsWith("*") && subpath.startsWith(key.slice(0, -1))) {
          const rest = subpath.slice(key.length - 1);
          return resolveFile(join(workspace.dir, target.replace("*", rest)));
        }
      }
      return undefined;
    }
    return resolveFile(
      join(workspace.dir, subpath === "." ? "index" : subpath)
    );
  }

  /**
   * How a package file reaches a secret (the chain of files, ending with
   * the reason), or null when it doesn't.
   */
  reachesSecret(file: string): string[] | null {
    if (this.tainted.has(file)) {
      return this.tainted.get(file) ?? null;
    }
    // Cycles: assume clean while visiting; a real path is found elsewhere.
    this.tainted.set(file, null);
    const source = readFileSync(file, "utf8");
    const label = relative(this.root, file);
    let chain: string[] | null = null;

    const secretServer = file.endsWith("keys.ts")
      ? serverVariables(source).find(this.isSecret)
      : undefined;
    const secretRead = envReads(source).find(
      (read) => read.name !== undefined && this.isSecret(read.name)
    );
    if (secretServer) {
      chain = [`${label} (declares ${secretServer})`];
    } else if (secretRead && file.includes(`${join(this.root, "packages")}`)) {
      chain = [`${label}:${secretRead.line} (reads ${secretRead.name})`];
    } else {
      for (const { specifier } of runtimeImports(source)) {
        const target = this.resolve(specifier, file);
        const below = target ? this.reachesSecret(target) : null;
        if (below) {
          chain = [label, ...below];
          break;
        }
      }
    }
    this.tainted.set(file, chain);
    return chain;
  }

  /** Every violation in one app's files, as printable lines. */
  checkApp(appDir: string): string[] {
    const problems: string[] = [];
    const example = join(appDir, ".env.example");
    if (existsSync(example)) {
      for (const { line, name } of exampleVariables(
        readFileSync(example, "utf8")
      )) {
        if (this.isSecret(name)) {
          problems.push(
            `${relative(this.root, example)}:${line} lists ${name}, a server-only variable`
          );
        }
      }
    }

    for (const file of walk(appDir)) {
      const source = readFileSync(file, "utf8");
      const label = relative(this.root, file);
      if (file === join(appDir, "env.ts")) {
        for (const name of serverVariables(source)) {
          if (this.isSecret(name)) {
            problems.push(`${label} declares ${name}, a server-only variable`);
          }
        }
      }
      for (const { line, name } of envReads(source)) {
        if (this.isSecret(name)) {
          problems.push(
            `${label}:${line} reads ${name}, a server-only variable`
          );
        }
      }
      for (const { line, specifier } of runtimeImports(source)) {
        if (!specifier.startsWith("@repo/")) {
          continue;
        }
        const target = this.resolve(specifier, file);
        const chain = target ? this.reachesSecret(target) : null;
        if (chain) {
          problems.push(
            `${label}:${line} imports ${specifier}, which reaches a secret: ${chain.join(" → ")}`
          );
        }
      }
    }
    return problems;
  }

  /** Every app except apps/api and apps/e2e. */
  check(): string[] {
    const appsDir = join(this.root, "apps");
    return readdirSync(appsDir)
      .filter(
        (app) =>
          !EXEMPT_APPS.has(app) && statSync(join(appsDir, app)).isDirectory()
      )
      .flatMap((app) => this.checkApp(join(appsDir, app)));
  }
}

if (import.meta.main) {
  const problems = new SecretScanner(
    resolve(import.meta.dirname, "..")
  ).check();
  if (problems.length > 0) {
    console.error(
      `Secrets live only in apps/api. ${problems.length} problem(s):\n`
    );
    for (const problem of problems) {
      console.error(`  ${problem}`);
    }
    console.error(
      "\nMove the operation to an apps/api endpoint and call it from the app (see AGENTS.md, Secrets)."
    );
    process.exit(1);
  }
  console.log("No server secrets outside apps/api.");
}

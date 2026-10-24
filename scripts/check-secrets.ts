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

/** Strings (group 1) or comments, in source order. */
const STRING_OR_COMMENT =
  /("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|\/\/[^\n]*|\/\*[\s\S]*?\*\//g;
const NOT_NEWLINE = /[^\n]/g;
const SERVER_BLOCK = /\bserver\s*:\s*\{/g;
const INNERMOST_GROUP = /\([^()]*\)|\{[^{}]*\}|\[[^[\]]*\]/g;
const KEY = /\b([A-Z][A-Z0-9_]*)\s*:/g;
const IMPORTS = [
  /\bimport\s+(?!type\s)(?:[\w*{}\s,$]+?\s+from\s+)?["']([^"']+)["']/g,
  /\bexport\s+(?!type\s)[\w*{}\s,$]*?\s+from\s+["']([^"']+)["']/g,
  /\b(?:import|require)\s*\(\s*["']([^"']+)["']\s*\)/g,
];
const NAMED_CLAUSE = /\{([^}]*)\}/;
const DEFAULT_AND_NAMED = /import\s+[\w$]+\s*,/;
const ENV_READ =
  /\b(?:process\.env|env)(?:\.([A-Z][A-Z0-9_]*)|\[\s*["']([A-Z][A-Z0-9_]*)["']\s*\])/g;
const EXAMPLE_LINE = /^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=/;
const REPO_IMPORT = /^(@repo\/[^/]+)(?:\/(.+))?$/;
const JS_SUFFIX = /\.js$/;

/** A server-only variable name (credential-shaped or known). */
export const isSecretName = (name: string, known: ReadonlySet<string>) =>
  !(name.startsWith("NEXT_PUBLIC_") || PUBLIC_SERVER_VARIABLES.has(name)) &&
  (known.has(name) || CREDENTIAL.test(name));

/**
 * Source without comments, keeping strings (and line breaks, so reported
 * line numbers stay right).
 */
export const stripComments = (source: string) =>
  source.replace(STRING_OR_COMMENT, (match, string?: string) =>
    string === undefined ? match.replace(NOT_NEWLINE, "") : match
  );

const lineOf = (code: string, index: number | undefined) =>
  code.slice(0, index).split("\n").length;

/** The text inside the braces that open just before `start`. */
const braceBlock = (code: string, start: number) => {
  let depth = 1;
  let end = start;
  while (end < code.length && depth > 0) {
    if (code[end] === "{") {
      depth += 1;
    } else if (code[end] === "}") {
      depth -= 1;
    }
    end += 1;
  }
  return code.slice(start, end - 1);
};

/** The names declared in each `server: { … }` block of a createEnv call. */
export const serverVariables = (source: string): string[] => {
  const code = stripComments(source);
  const names: string[] = [];
  for (const match of code.matchAll(SERVER_BLOCK)) {
    let block = braceBlock(code, (match.index ?? 0) + match[0].length);
    // Drop nested groups so only the top-level keys remain.
    let previous = "";
    while (previous !== block) {
      previous = block;
      block = block.replace(INNERMOST_GROUP, "");
    }
    for (const [, name] of block.matchAll(KEY)) {
      names.push(name as string);
    }
  }
  return names;
};

/** `import { type A, type B } from` brings in nothing at runtime. */
const isTypeOnly = (statement: string) => {
  const clause = statement.match(NAMED_CLAUSE)?.[1];
  if (clause === undefined || DEFAULT_AND_NAMED.test(statement)) {
    return false;
  }
  return clause
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .every((part) => part.startsWith("type "));
};

/** Runtime (not type-only) import specifiers, with their line numbers. */
export const runtimeImports = (source: string) => {
  const code = stripComments(source);
  return IMPORTS.flatMap((pattern) =>
    [...code.matchAll(pattern)]
      .filter((match) => !isTypeOnly(match[0]))
      .map((match) => ({
        line: lineOf(code, match.index),
        specifier: match[1] as string,
      }))
  );
};

/** `process.env.X`, `process.env["X"]` and `env.X` reads, with lines. */
export const envReads = (source: string) => {
  const code = stripComments(source);
  return [...code.matchAll(ENV_READ)].map((match) => ({
    line: lineOf(code, match.index),
    name: (match[1] ?? match[2]) as string,
  }));
};

/** Variable names assigned in a `.env.example`. */
export const exampleVariables = (source: string) =>
  source
    .split("\n")
    .map((line, index) => ({
      line: index + 1,
      name: line.match(EXAMPLE_LINE)?.[1],
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
  const found = FILE_CANDIDATES.map((suffix) => base + suffix).find(
    (path) => existsSync(path) && statSync(path).isFile()
  );
  if (found) {
    return found;
  }
  // `./x.js` written for a `./x.ts` source.
  const swapped = base.replace(JS_SUFFIX, ".ts");
  return swapped !== base && existsSync(swapped) ? swapped : undefined;
};

type Exports = Record<string, string | Record<string, string>>;

interface Workspace {
  dir: string;
  exports?: Exports;
}

/** The file a package's `exports` map gives for a subpath. */
const resolveExport = (workspace: Workspace, subpath: string) => {
  for (const [key, value] of Object.entries(workspace.exports ?? {})) {
    const target = typeof value === "string" ? value : value.default;
    if (target && key === subpath) {
      return resolveFile(join(workspace.dir, target));
    }
    if (target && key.endsWith("*") && subpath.startsWith(key.slice(0, -1))) {
      const rest = subpath.slice(key.length - 1);
      return resolveFile(join(workspace.dir, target.replace("*", rest)));
    }
  }
};

export class SecretScanner {
  readonly secretNames = new Set<string>();
  private readonly root: string;
  private readonly packagesDir: string;
  private readonly packages = new Map<string, Workspace>();
  private readonly tainted = new Map<string, string[] | null>();

  constructor(root: string) {
    this.root = root;
    this.packagesDir = join(root, "packages");
    for (const entry of readdirSync(this.packagesDir)) {
      const manifest = join(this.packagesDir, entry, "package.json");
      if (existsSync(manifest)) {
        const { exports, name } = JSON.parse(readFileSync(manifest, "utf8"));
        this.packages.set(name, {
          dir: join(this.packagesDir, entry),
          exports,
        });
      }
    }
    const keysFiles = [
      ...walk(this.packagesDir).filter((file) => file.endsWith("keys.ts")),
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
    const match = specifier.match(REPO_IMPORT);
    const workspace = match ? this.packages.get(match[1] as string) : undefined;
    if (!(match && workspace)) {
      return undefined;
    }
    const subpath = match[2] ? `./${match[2]}` : ".";
    if (workspace.exports) {
      return resolveExport(workspace, subpath);
    }
    return resolveFile(
      join(workspace.dir, subpath === "." ? "index" : subpath)
    );
  }

  /** Why a package file itself holds a secret, if it does. */
  private ownSecret(file: string, source: string): string | undefined {
    const label = relative(this.root, file);
    const declared = file.endsWith("keys.ts")
      ? serverVariables(source).find(this.isSecret)
      : undefined;
    if (declared) {
      return `${label} (declares ${declared})`;
    }
    if (!file.startsWith(this.packagesDir)) {
      return undefined;
    }
    const read = envReads(source).find(({ name }) => this.isSecret(name));
    return read ? `${label}:${read.line} (reads ${read.name})` : undefined;
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
    const own = this.ownSecret(file, source);
    let chain: string[] | null = own ? [own] : null;
    for (const { specifier } of own ? [] : runtimeImports(source)) {
      const target = this.resolve(specifier, file);
      const below = target ? this.reachesSecret(target) : null;
      if (below) {
        chain = [relative(this.root, file), ...below];
        break;
      }
    }
    this.tainted.set(file, chain);
    return chain;
  }

  private checkExample(appDir: string): string[] {
    const example = join(appDir, ".env.example");
    if (!existsSync(example)) {
      return [];
    }
    const label = relative(this.root, example);
    return exampleVariables(readFileSync(example, "utf8"))
      .filter(({ name }) => this.isSecret(name))
      .map(
        ({ line, name }) =>
          `${label}:${line} lists ${name}, a server-only variable`
      );
  }

  private checkFile(appDir: string, file: string): string[] {
    const source = readFileSync(file, "utf8");
    const label = relative(this.root, file);
    const declared =
      file === join(appDir, "env.ts")
        ? serverVariables(source)
            .filter(this.isSecret)
            .map((name) => `${label} declares ${name}, a server-only variable`)
        : [];
    const reads = envReads(source)
      .filter(({ name }) => this.isSecret(name))
      .map(
        ({ line, name }) =>
          `${label}:${line} reads ${name}, a server-only variable`
      );
    const imports = runtimeImports(source)
      .filter(({ specifier }) => specifier.startsWith("@repo/"))
      .flatMap(({ line, specifier }) => {
        const target = this.resolve(specifier, file);
        const chain = target ? this.reachesSecret(target) : null;
        return chain
          ? [
              `${label}:${line} imports ${specifier}, which reaches a secret: ${chain.join(" → ")}`,
            ]
          : [];
      });
    return [...declared, ...reads, ...imports];
  }

  /** Every violation in one app's files, as printable lines. */
  checkApp(appDir: string): string[] {
    return [
      ...this.checkExample(appDir),
      ...walk(appDir).flatMap((file) => this.checkFile(appDir, file)),
    ];
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

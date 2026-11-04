import { existsSync } from "node:fs";
import path from "node:path";
import { project } from "@repo/config";
import ar from "@repo/internationalization/messages/ar.json";
import en from "@repo/internationalization/messages/en.json";
import { describe, expect, test } from "vitest";
import { githubFile, runbooks, serviceConfigured, services } from "./handover";

const repoRoot = path.resolve(import.meta.dirname, "../../../..");
const ENV_NAME = /^[A-Z][A-Z0-9_]*$/;

describe("the services catalogue", () => {
  test("ids are unique and each has a name and a use in both languages", () => {
    const ids = services.map((service) => service.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const messages of [en, ar]) {
      const list = messages.admin.handover.services.list as Record<
        string,
        { name: string; use: string }
      >;
      expect(Object.keys(list).sort()).toEqual([...ids].sort());
      for (const id of ids) {
        expect(list[id].name.length, id).toBeGreaterThan(0);
        expect(list[id].use.length, id).toBeGreaterThan(0);
      }
    }
  });

  test("dashboards are https, variables are names, not values", () => {
    for (const service of services) {
      expect(new URL(service.dashboard).protocol, service.id).toBe("https:");
      for (const name of service.env) {
        expect(name, service.id).toMatch(ENV_NAME);
      }
      expect(new Set(service.env).size).toBe(service.env.length);
    }
  });

  test("GitHub is the project's repository", () => {
    expect(services.find((service) => service.id === "github")?.dashboard).toBe(
      project.repoUrl
    );
  });

  test("every integration a service checks has a label on Health", () => {
    for (const service of services) {
      for (const id of service.integrations) {
        expect(Object.keys(en.admin.health.integrations), service.id).toContain(
          id
        );
      }
    }
  });
});

describe("serviceConfigured", () => {
  const boxy = { integrations: ["boxy", "boxyWebhook"] };

  test("set only when every integration is", () => {
    expect(serviceConfigured(boxy, { boxy: true, boxyWebhook: true })).toBe(
      "set"
    );
    expect(serviceConfigured(boxy, { boxy: true, boxyWebhook: false })).toBe(
      "missing"
    );
    expect(serviceConfigured(boxy, { boxy: true })).toBe("missing");
  });

  test("unknown without the API's answer, unchecked when it can't see it", () => {
    expect(serviceConfigured(boxy, null)).toBe("unknown");
    expect(serviceConfigured({ integrations: [] }, { boxy: true })).toBe(
      "unchecked"
    );
  });
});

describe("runbooks", () => {
  test("every runbook exists in the repository and has a label", () => {
    for (const runbook of runbooks) {
      expect(existsSync(path.join(repoRoot, runbook.path)), runbook.path).toBe(
        true
      );
      expect(en.admin.handover.runbooks.list[runbook.id]).toBeTruthy();
      expect(ar.admin.handover.runbooks.list[runbook.id]).toBeTruthy();
    }
  });

  test("every platform runbook is listed", async () => {
    const { readdirSync } = await import("node:fs");
    const platform = readdirSync(path.join(repoRoot, "docs/platform"))
      .filter((file) => file.endsWith(".md"))
      .map((file) => `docs/platform/${file}`);
    const listed = runbooks.map((runbook) => runbook.path as string);
    for (const file of platform) {
      expect(listed).toContain(file);
    }
  });

  test("links point at main on GitHub", () => {
    expect(
      githubFile("https://github.com/theideaiq/monorepo/", "PROGRESS.md")
    ).toBe("https://github.com/theideaiq/monorepo/blob/main/PROGRESS.md");
  });
});

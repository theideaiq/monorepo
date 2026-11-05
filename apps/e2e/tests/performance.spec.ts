import { expect, test } from "@playwright/test";
import { product } from "../fixtures";
import { budget, MID_RANGE_ANDROID } from "../performance-budget";
import { urls } from "../playwright.config";

/**
 * Performance budget on a mid-range Android phone (A28). Each key page loads
 * cold with the CPU slowed and a slow 4G network, as on a mid-range phone in
 * Iraq, and must stay within `performance-budget.ts`: the JavaScript it
 * downloads (compressed, as sent), everything it downloads before it is
 * usable, Largest Contentful Paint, layout shift and main-thread blocking.
 * The numbers are attached to each test's report as `performance.json`.
 */

const pages = [
  { name: "home", path: "" },
  { name: "store", path: "/store" },
  { name: "product page", path: `/store/${product.slug}` },
  { name: "Plus", path: "/plus" },
  { name: "Club", path: "/club" },
];

interface Measured {
  cls: number;
  jsBytes: number;
  lcpMs: number;
  tbtMs: number;
  totalBytes: number;
}

test.describe("performance on a mid-range Android phone", () => {
  for (const locale of ["ar", "en"] as const) {
    for (const { name, path } of pages) {
      test(`${name} (${locale}) stays within the budget`, async ({
        page,
      }, testInfo) => {
        const cdp = await page.context().newCDPSession(page);
        await cdp.send("Network.enable");
        await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
        await cdp.send(
          "Network.emulateNetworkConditions",
          MID_RANGE_ANDROID.network
        );
        await cdp.send("Emulation.setCPUThrottlingRate", {
          rate: MID_RANGE_ANDROID.cpuSlowdown,
        });

        // Bytes as sent over the network (compressed), by resource type.
        const types = new Map<string, string>();
        let jsBytes = 0;
        let totalBytes = 0;
        cdp.on("Network.responseReceived", (event) => {
          types.set(event.requestId, event.type);
        });
        cdp.on("Network.loadingFinished", (event) => {
          totalBytes += event.encodedDataLength;
          if (types.get(event.requestId) === "Script") {
            jsBytes += event.encodedDataLength;
          }
        });

        // Largest Contentful Paint, layout shift and long tasks, observed
        // from the first byte.
        await page.addInitScript(() => {
          const vitals = { cls: 0, lcp: 0, tbt: 0 };
          (window as unknown as { __vitals: typeof vitals }).__vitals = vitals;
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              vitals.lcp = entry.startTime;
            }
          }).observe({ buffered: true, type: "largest-contentful-paint" });
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries() as (PerformanceEntry & {
              hadRecentInput: boolean;
              value: number;
            })[]) {
              if (!entry.hadRecentInput) {
                vitals.cls += entry.value;
              }
            }
          }).observe({ buffered: true, type: "layout-shift" });
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              vitals.tbt += Math.max(0, entry.duration - 50);
            }
          }).observe({ buffered: true, type: "longtask" });
        });

        const prefix = locale === "en" ? "" : `/${locale}`;
        const response = await page.goto(`${urls.web}${prefix}${path}`, {
          waitUntil: "load",
        });
        expect(response?.status()).toBe(200);
        // What the page needs to load; links prefetched afterwards (Next.js
        // prefetches visible links when idle) are not counted.
        const loaded = { jsBytes, totalBytes };
        await page.waitForLoadState("networkidle");
        // LCP is final once the person interacts; until then let late
        // entries arrive.
        await page.waitForTimeout(1000);

        const vitals = await page.evaluate(
          () =>
            (
              window as unknown as {
                __vitals: { cls: number; lcp: number; tbt: number };
              }
            ).__vitals
        );
        const measured: Measured = {
          cls: Math.round(vitals.cls * 1000) / 1000,
          jsBytes: loaded.jsBytes,
          lcpMs: Math.round(vitals.lcp),
          tbtMs: Math.round(vitals.tbt),
          totalBytes: loaded.totalBytes,
        };
        // One line per page in the log, to compare runs.
        console.log(
          `performance ${locale} ${name}: ${JSON.stringify(measured)}`
        );
        await testInfo.attach("performance.json", {
          body: JSON.stringify(
            { budget, locale, measured, page: name },
            null,
            2
          ),
          contentType: "application/json",
        });

        expect
          .soft(measured.jsBytes, "JavaScript downloaded (compressed bytes)")
          .toBeLessThanOrEqual(budget.jsBytes);
        expect
          .soft(
            measured.totalBytes,
            "everything downloaded to load (compressed bytes)"
          )
          .toBeLessThanOrEqual(budget.totalBytes);
        expect
          .soft(measured.lcpMs, "Largest Contentful Paint (ms)")
          .toBeLessThanOrEqual(budget.lcpMs);
        expect
          .soft(measured.cls, "Cumulative Layout Shift")
          .toBeLessThanOrEqual(budget.cls);
        expect
          .soft(measured.tbtMs, "Total Blocking Time (ms)")
          .toBeLessThanOrEqual(budget.tbtMs);
      });
    }
  }
});

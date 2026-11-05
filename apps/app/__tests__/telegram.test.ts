import { afterEach, describe, expect, it } from "vitest";
import {
  inTelegramMiniApp,
  markTelegramMiniApp,
  showsBackButton,
} from "@/lib/telegram";

afterEach(() => {
  window.sessionStorage.clear();
  window.history.replaceState(null, "", "/");
});

describe("the Mini App", () => {
  it("is not Telegram on an ordinary visit", () => {
    expect(inTelegramMiniApp()).toBe(false);
  });

  it("knows Telegram opened it, and remembers it after the hash goes", () => {
    window.history.replaceState(null, "", "/tg#tgWebAppData=query_id%3D1");
    expect(inTelegramMiniApp()).toBe(true);
    window.history.replaceState(null, "", "/store");
    expect(inTelegramMiniApp()).toBe(true);
  });

  it("remembers the /tg page's mark", () => {
    markTelegramMiniApp();
    expect(inTelegramMiniApp()).toBe(true);
  });

  it("shows the back button everywhere but the front pages", () => {
    expect(showsBackButton("/")).toBe(false);
    expect(showsBackButton("/store")).toBe(false);
    expect(showsBackButton("/store/")).toBe(false);
    expect(showsBackButton("/tg")).toBe(false);
    expect(showsBackButton("/store/music")).toBe(true);
    expect(showsBackButton("/pass")).toBe(true);
  });
});

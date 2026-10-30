import type { Database } from "@repo/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import capacitorConfig, {
  ALLOWED_NAVIGATION,
  resolveServerUrl,
} from "../capacitor.config";
import { canSellDigitalGoods } from "../lib/native/checkout";
import {
  registerPushNotifications,
  unregisterPushNotifications,
} from "../lib/native/push";
import { shareLink } from "../lib/native/share";
import {
  isNativeShellUserAgent,
  SHELL_USER_AGENT,
} from "../lib/native/user-agent";
import { shellScript } from "../native/prepare";

type Listener = (event: unknown) => void;

const plugin = vi.hoisted(() => ({
  listeners: new Map<string, (event: unknown) => void>(),
  permission: "prompt" as string,
  requested: "granted" as string,
}));

vi.mock("@capacitor/push-notifications", () => ({
  PushNotifications: {
    addListener: vi.fn((name: string, listener: Listener) => {
      plugin.listeners.set(name, listener);
      return Promise.resolve({
        remove: () => plugin.listeners.delete(name),
      });
    }),
    checkPermissions: vi.fn(() =>
      Promise.resolve({ receive: plugin.permission })
    ),
    register: vi.fn(() => Promise.resolve()),
    requestPermissions: vi.fn(() =>
      Promise.resolve({ receive: plugin.requested })
    ),
  },
}));

const nativeShare = vi.hoisted(() => vi.fn());
vi.mock("@capacitor/share", () => ({ Share: { share: nativeShare } }));

const fetchMock = vi.fn();

const supabase = {
  auth: {
    getSession: () =>
      Promise.resolve({ data: { session: { access_token: "jwt" } } }),
  },
} as unknown as SupabaseClient<Database>;

const asNative = (platform: "ios" | "android") => {
  (globalThis as { Capacitor?: unknown }).Capacitor = {
    getPlatform: () => platform,
    isNativePlatform: () => true,
  };
};

beforeEach(() => {
  plugin.listeners.clear();
  plugin.permission = "prompt";
  plugin.requested = "granted";
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(Response.json({ ok: true }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  (globalThis as { Capacitor?: unknown }).Capacitor = undefined;
  vi.unstubAllGlobals();
});

describe("capacitor.config", () => {
  test("loads the website and bundles only the offline screen", () => {
    expect(capacitorConfig.webDir).toBe("native/www");
    expect(capacitorConfig.server?.errorPath).toBe("offline.html");
    expect(capacitorConfig.server?.allowNavigation).toEqual(ALLOWED_NAVIGATION);
    expect(capacitorConfig.appName).toBe("The IDEA");
    expect(capacitorConfig.appendUserAgent).toBe(SHELL_USER_AGENT);
  });

  test("the server recognizes the shell by its user agent", () => {
    const safari =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148";
    expect(isNativeShellUserAgent(`${safari} ${SHELL_USER_AGENT}`)).toBe(true);
    expect(isNativeShellUserAgent(safari)).toBe(false);
    expect(isNativeShellUserAgent(null)).toBe(false);
  });

  test("prefers CAP_SERVER_URL, then NEXT_PUBLIC_WEB_URL, then production", () => {
    expect(resolveServerUrl({})).toEqual({
      cleartext: false,
      isLiveReload: false,
      url: "https://theideaiq.com",
    });
    expect(
      resolveServerUrl({
        NEXT_PUBLIC_WEB_URL: "https://preview.theideaiq.com/ar",
      }).url
    ).toBe("https://preview.theideaiq.com");
    expect(
      resolveServerUrl({
        CAP_SERVER_URL: "http://192.168.1.20:3000",
        NEXT_PUBLIC_WEB_URL: "https://theideaiq.com",
      })
    ).toEqual({
      cleartext: true,
      isLiveReload: true,
      url: "http://192.168.1.20:3000",
    });
  });

  test("refuses anything but http(s)", () => {
    expect(() => resolveServerUrl({ CAP_SERVER_URL: "file:///x" })).toThrow(
      "must be http(s)"
    );
  });

  test("the offline screen gets the URL and its text", () => {
    const script = shellScript("https://theideaiq.com");
    const shell = JSON.parse(
      script.slice(script.indexOf("{"), script.lastIndexOf("}") + 1)
    );
    expect(shell.url).toBe("https://theideaiq.com");
    expect(shell.messages.en.retry).toBe("Try again");
    expect(shell.messages.ar.title).toBe("أنت غير متصل");
  });
});

describe("registerPushNotifications", () => {
  test("does nothing on the web", async () => {
    const onOpen = vi.fn();
    const dispose = await registerPushNotifications({ onOpen, supabase });
    dispose();
    expect(plugin.listeners.size).toBe(0);
  });

  test("respects a refused permission", async () => {
    asNative("ios");
    plugin.requested = "denied";
    await registerPushNotifications({ onOpen: vi.fn(), supabase });
    expect(plugin.listeners.size).toBe(0);
  });

  test("sends the token to the API and routes taps", async () => {
    asNative("android");
    const onOpen = vi.fn();
    const dispose = await registerPushNotifications({ onOpen, supabase });

    plugin.listeners.get("registration")?.({ value: "fcm-token-123" });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:3002/push/register");
    expect(JSON.parse(init.body)).toEqual({
      platform: "android",
      token: "fcm-token-123",
    });
    expect(init.headers.Authorization).toBe("Bearer jwt");

    const tap = plugin.listeners.get("pushNotificationActionPerformed");
    tap?.({ notification: { data: { link: "/orders/view?id=1" } } });
    tap?.({ notification: { data: { link: "https://evil.example" } } });
    expect(onOpen.mock.calls).toEqual([["/pass/orders/1"], ["/"]]);

    await unregisterPushNotifications(supabase);
    expect(fetchMock.mock.calls[1][0]).toBe(
      "http://localhost:3002/push/unregister"
    );
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
      token: "fcm-token-123",
    });

    dispose();
    expect(plugin.listeners.size).toBe(0);
  });

  test("unregistering without a token is a no-op", async () => {
    asNative("ios");
    await unregisterPushNotifications(supabase);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("shareLink", () => {
  const content = { title: "The IDEA Plus", url: "https://theideaiq.com/plus" };

  test("uses the native share sheet in the apps", async () => {
    asNative("ios");
    nativeShare.mockResolvedValueOnce({});
    await expect(shareLink(content)).resolves.toBe("shared");
    expect(nativeShare).toHaveBeenCalledWith({
      ...content,
      dialogTitle: content.title,
    });
  });

  test("uses Web Share, then the clipboard, in browsers", async () => {
    const share = vi.fn(() => Promise.resolve());
    const writeText = vi.fn(() => Promise.resolve());
    const withShare = {
      clipboard: { writeText },
      share,
    } as unknown as Navigator;
    const without = { clipboard: { writeText } } as unknown as Navigator;

    await expect(shareLink(content, withShare)).resolves.toBe("shared");
    await expect(shareLink(content, without)).resolves.toBe("copied");
    expect(writeText).toHaveBeenCalledWith(content.url);
  });

  test("reports a dismissed sheet and a missing clipboard", async () => {
    const abort = Object.assign(new Error("Share canceled"), {
      name: "AbortError",
    });
    const dismissed = {
      share: () => Promise.reject(abort),
    } as unknown as Navigator;
    const broken = {
      clipboard: { writeText: () => Promise.reject(new Error("denied")) },
    } as unknown as Navigator;

    await expect(shareLink(content, dismissed)).resolves.toBe("dismissed");
    await expect(shareLink(content, broken)).resolves.toBe("unavailable");
  });
});

describe("canSellDigitalGoods", () => {
  test("always on the web; in the apps only with allowNativeCheckout", () => {
    expect(canSellDigitalGoods("web", false)).toBe(true);
    expect(canSellDigitalGoods("ios", false)).toBe(false);
    expect(canSellDigitalGoods("android", true)).toBe(true);
  });
});

import { project } from "@repo/config";
import type { PostHog } from "posthog-js";
import { type ConsentState, toGoogleConsent } from "./consent";
import {
  type AnalyticsEvent,
  defaultEventId,
  type EventProperties,
  toGa4,
  toMeta,
  toTikTok,
} from "./events";

type Command = (...args: unknown[]) => void;

interface TikTok {
  grantConsent: Command;
  page: Command;
  revokeConsent: Command;
  track: Command;
}

interface AnalyticsWindow {
  Capacitor?: { isNativePlatform?: () => boolean };
  dataLayer?: unknown[];
  fbq?: Command;
  gtag?: Command;
  ttq?: TikTok;
}

const CLICK_ID_STORAGE = "analytics:click-ids";

const browser = () =>
  typeof window === "undefined"
    ? undefined
    : (window as unknown as AnalyticsWindow);

/** True inside the Capacitor iOS/Android apps. */
export const isNativeApp = () =>
  browser()?.Capacitor?.isNativePlatform?.() === true;

/**
 * PostHog, once `initializeAnalytics` has loaded it: it is downloaded only
 * when its key is set, so pages without it don't carry the library (A28).
 */
let posthogInstance: PostHog | undefined;

/** Called by `initializeAnalytics` once PostHog has started. */
export const setPostHog = (instance: PostHog) => {
  posthogInstance = instance;
};

const posthog = () => (posthogInstance?.__loaded ? posthogInstance : undefined);

/** Records an event in every configured destination. */
export const track = <E extends AnalyticsEvent>(
  event: E,
  properties: EventProperties[E],
  { eventId = defaultEventId(event, properties) }: { eventId?: string } = {}
) => {
  const w = browser();
  if (!w) {
    return;
  }
  posthog()?.capture(event, properties);

  const { currency } = project.region;
  const ga4 = toGa4(event, properties, currency);
  const meta = toMeta(event, properties, currency);
  const tiktok = toTikTok(event, properties, currency);

  w.gtag?.("event", ga4.name, ga4.params);
  if (meta) {
    w.fbq?.(
      "track",
      meta.name,
      meta.params,
      eventId ? { eventID: eventId } : {}
    );
  }
  if (tiktok) {
    w.ttq?.track(
      tiktok.name,
      tiktok.params,
      eventId ? { event_id: eventId } : {}
    );
  }
};

/** Sent by the page-view tracker on every navigation. */
export const trackPageView = (url: string) => {
  const w = browser();
  if (!w) {
    return;
  }
  w.gtag?.("event", "page_view", { page_location: url });
  w.fbq?.("track", "PageView");
  w.ttq?.page();
};

/** Applies the visitor's choice from a consent banner. */
export const setConsent = (consent: ConsentState) => {
  const w = browser();
  if (!w) {
    return;
  }
  w.gtag?.("consent", "update", toGoogleConsent(consent));
  w.fbq?.("consent", consent.ads ? "grant" : "revoke");
  if (consent.ads) {
    w.ttq?.grantConsent();
  } else {
    w.ttq?.revokeConsent();
  }
  const ph = posthog();
  if (consent.analytics) {
    ph?.opt_in_capturing();
  } else {
    ph?.opt_out_capturing();
  }
};

/** Links events to a signed-in user in product analytics (PostHog). */
export const identify = (userId: string, traits?: Record<string, unknown>) => {
  posthog()?.identify(userId, traits);
};

/** Call on sign-out so the next visitor on this device starts fresh. */
export const resetIdentity = () => {
  posthog()?.reset();
};

/** Keeps ad click ids from the landing URL for the rest of the visit. */
export const rememberClickIds = () => {
  const params = new URLSearchParams(window.location.search);
  const ids = Object.fromEntries(
    ["fbclid", "ttclid"].flatMap((key) => {
      const value = params.get(key);
      return value ? [[key, value]] : [];
    })
  );
  if (Object.keys(ids).length === 0) {
    return;
  }
  try {
    const stored = JSON.parse(sessionStorage.getItem(CLICK_ID_STORAGE) ?? "{}");
    sessionStorage.setItem(
      CLICK_ID_STORAGE,
      JSON.stringify({ ...stored, ...ids, at: Date.now() })
    );
  } catch {
    // Storage can be unavailable (private mode); attribution is best effort.
  }
};

const readCookie = (name: string) =>
  document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${name}=`))
    ?.slice(name.length + 1);

const readClickIds = (): { at?: number; fbclid?: string; ttclid?: string } => {
  try {
    return JSON.parse(sessionStorage.getItem(CLICK_ID_STORAGE) ?? "{}");
  } catch {
    return {};
  }
};

/**
 * Browser identifiers for server-side conversions. Send them with the
 * checkout request so the purchase reported from the payment webhook is
 * matched to the ad click. Returns nothing inside the native apps.
 */
export const getAttribution = () => {
  if (!browser() || isNativeApp()) {
    return;
  }
  const clicks = readClickIds();
  const fbp = readCookie("_fbp");
  const fbc =
    readCookie("_fbc") ??
    (clicks.fbclid
      ? `fb.1.${clicks.at ?? Date.now()}.${clicks.fbclid}`
      : undefined);

  return {
    fbc,
    fbp,
    sourceUrl: window.location.href,
    ttclid: clicks.ttclid,
    ttp: readCookie("_ttp"),
  };
};

export type { ConsentState } from "./consent";
export type { AnalyticsEvent, AnalyticsItem, EventProperties } from "./events";

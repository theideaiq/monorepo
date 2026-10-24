import type { CapacitorConfig } from "@capacitor/cli";
import project from "@repo/config/project.json" with { type: "json" };

if (project.bundleId.startsWith("{{")) {
  throw new Error(
    "Run `bun run init` first: the app id comes from packages/config/project.json."
  );
}

/** The IDEA Spark in production. */
export const DEFAULT_SERVER_URL = "https://spark.theideaiq.com";

/**
 * Hosts the WebView may open in place (Spark itself is always allowed).
 * Everything else, such as Wayl checkout or a link to another site, opens
 * in the system browser.
 */
export const ALLOWED_NAVIGATION = ["theideaiq.com", "*.theideaiq.com"];

type ServerEnv = Record<string, string | undefined>;

/**
 * CAP_SERVER_URL (live reload against `next dev` on your LAN) wins over
 * NEXT_PUBLIC_APP_URL (a preview or staging Spark), which wins over the
 * production URL. Only http(s) URLs; anything else throws so a typo never
 * ships a broken app.
 */
export const resolveServerUrl = (env: ServerEnv) => {
  const raw =
    env.CAP_SERVER_URL || env.NEXT_PUBLIC_APP_URL || DEFAULT_SERVER_URL;
  const url = new URL(raw);
  if (!(url.protocol === "https:" || url.protocol === "http:")) {
    throw new Error(`The app URL must be http(s), got ${raw}`);
  }
  return {
    // Plain HTTP is only for a development server on the local network.
    cleartext: url.protocol === "http:",
    isLiveReload: Boolean(env.CAP_SERVER_URL),
    url: url.origin,
  };
};

/**
 * The iOS and Android apps are a native shell around the live The IDEA
 * Spark (`server.url`): the same server-rendered pages, cookie session and
 * deployments as the website, plus native extras (push, share, splash,
 * status bar, app links). Only the offline screen is bundled
 * (`native/www`). See ARCHITECTURE_AND_INTEGRATIONS.md, section 3.
 *
 * The URL is read when `cap sync` runs (`bun run cap:sync`):
 *   NEXT_PUBLIC_APP_URL=https://spark-preview.theideaiq.com bun run cap:sync
 *   CAP_SERVER_URL=http://192.168.1.20:3000 bun run cap:sync   # live reload
 * Without either it is https://spark.theideaiq.com.
 */
const server = resolveServerUrl(process.env);

const BACKGROUND = "#0f1014";

const config: CapacitorConfig = {
  // Lets Spark's server recognize the shell (lib/native/user-agent.ts), e.g.
  // to hide digital-goods checkout and ad pixels before any JavaScript runs.
  // Keep in sync with SHELL_USER_AGENT there (a test checks it).
  appendUserAgent: "TheIDEASpark/1",
  appId: project.bundleId,
  appName: "The IDEA Spark",
  backgroundColor: BACKGROUND,
  ios: {
    // The WebView draws under the status bar; Spark pads with the
    // --safe-area-inset-* variables.
    contentInset: "never",
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "banner", "list"],
    },
    SplashScreen: {
      backgroundColor: BACKGROUND,
      launchAutoHide: true,
      launchFadeOutDuration: 200,
      launchShowDuration: 1500,
      showSpinner: false,
      splashFullScreen: false,
      splashImmersive: false,
    },
    StatusBar: {
      backgroundColor: BACKGROUND,
      overlaysWebView: true,
      style: "DARK",
    },
    SystemBars: {
      // Edge-to-edge with --safe-area-inset-* CSS variables (Android).
      initialViewportFitValueHint: "cover",
      insetsHandling: "css",
      style: "DARK",
    },
  },
  server: {
    allowNavigation: ALLOWED_NAVIGATION,
    androidScheme: "https",
    cleartext: server.cleartext,
    // Shown when Spark can't be loaded (offline, DNS, TLS): native/www.
    errorPath: "offline.html",
    url: server.url,
  },
  webDir: "native/www",
};

export default config;

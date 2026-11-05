import "server-only";
import { keys } from "./keys";
import type {
  BetterStackResponse,
  Service,
  ServiceStatus,
  SystemStatus,
} from "./types";

type MonitorStatus =
  BetterStackResponse["data"][number]["attributes"]["status"];

const ORDER: readonly Service[] = [
  "website",
  "partners",
  "staff",
  "api",
  "docs",
  "feed",
];

/** Worst first: a service shows the worst state among its monitors. */
const SEVERITY: readonly ServiceStatus["state"][] = [
  "down",
  "unknown",
  "maintenance",
  "up",
];

/**
 * Which service a monitor watches, from its address: the subdomain
 * (partners., staff., api.) and, on the website, the product feed.
 */
export const serviceOf = (url: string): Service | null => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const [sub] = parsed.hostname.split(".");
  if (sub === "partners" || sub === "staff") {
    return sub;
  }
  if (sub === "api") {
    return parsed.pathname.startsWith("/health") ? "api" : "docs";
  }
  return parsed.pathname.startsWith("/feeds/") ? "feed" : "website";
};

const stateOf = (status: MonitorStatus): ServiceStatus["state"] => {
  if (status === "up" || status === "down") {
    return status;
  }
  return status === "maintenance" || status === "paused"
    ? "maintenance"
    : "unknown";
};

/** The services in a fixed order, each with its worst monitor's state. */
export const servicesOf = (
  monitors: BetterStackResponse["data"]
): ServiceStatus[] => {
  const worst = new Map<Service, ServiceStatus["state"]>();
  for (const monitor of monitors) {
    const service = serviceOf(monitor.attributes.url);
    if (!service) {
      continue;
    }
    const state = stateOf(monitor.attributes.status);
    const current = worst.get(service);
    if (!current || SEVERITY.indexOf(state) < SEVERITY.indexOf(current)) {
      worst.set(service, state);
    }
  }
  return ORDER.flatMap((service) => {
    const state = worst.get(service);
    return state ? [{ service, state }] : [];
  });
};

/**
 * The overall state of the Better Stack monitors, or null when Better Stack
 * isn't configured. Never throws: an unreachable API reads as "unknown".
 */
export const fetchStatus = async (
  fetcher: typeof fetch = fetch
): Promise<SystemStatus | null> => {
  const { BETTERSTACK_API_KEY: apiKey, BETTERSTACK_URL: url } = keys();
  if (!(apiKey && url)) {
    return null;
  }

  try {
    const response = await fetcher(
      "https://uptime.betterstack.com/api/v2/monitors",
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    if (!response.ok) {
      return { state: "unknown", url };
    }

    const { data } = (await response.json()) as BetterStackResponse;
    const up =
      data.filter((monitor) => monitor.attributes.status === "up").length /
      data.length;
    const services = servicesOf(data);

    if (up === 0) {
      return { services, state: "degraded", url };
    }
    return { services, state: up < 1 ? "partial" : "operational", url };
  } catch {
    return { state: "unknown", url };
  }
};

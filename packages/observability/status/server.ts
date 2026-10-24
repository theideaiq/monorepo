import "server-only";
import { keys } from "./keys";
import type { BetterStackResponse, SystemStatus } from "./types";

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

    if (up === 0) {
      return { state: "degraded", url };
    }
    return { state: up < 1 ? "partial" : "operational", url };
  } catch {
    return { state: "unknown", url };
  }
};

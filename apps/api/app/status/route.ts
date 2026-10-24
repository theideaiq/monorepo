import { fetchStatus } from "@repo/observability/status/server";
import { webCorsHeaders, webPreflight } from "@/lib/cors";

export const OPTIONS = webPreflight;

/**
 * The state of the Better Stack monitors for the website's footer badge, so
 * the Better Stack API token stays in this app. 204 when Better Stack isn't
 * configured (the badge is hidden). Cached at the edge for a minute.
 */
export const GET = async (request: Request) => {
  const headers = {
    ...webCorsHeaders(request, "GET, OPTIONS"),
    "Cache-Control": "public, max-age=60, s-maxage=60",
  };
  const status = await fetchStatus();
  if (!status) {
    return new Response(null, { headers, status: 204 });
  }
  return Response.json(status, { headers });
};

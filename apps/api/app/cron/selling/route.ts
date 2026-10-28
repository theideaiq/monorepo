import { createAdminClient } from "@repo/database/admin";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { isAuthorizedCronRequest, unauthorized } from "@/lib/cron";
import { sweepSelling } from "@/lib/selling-sweep";

// Daily: return and offer deadlines, and shop scores.
export const GET = async (request: Request) => {
  if (!isAuthorizedCronRequest(request)) {
    return unauthorized();
  }
  try {
    return Response.json(await sweepSelling(createAdminClient()));
  } catch (error) {
    log.error(`Selling sweep failed: ${parseError(error)}`);
    return new Response("Sweep failed", { status: 500 });
  }
};

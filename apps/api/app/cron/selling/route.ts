import { createAdminClient } from "@repo/database/admin";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { getPaymentProvider } from "@repo/payments/server";
import { isAuthorizedCronRequest, unauthorized } from "@/lib/cron";
import { refundReturns } from "@/lib/return-refunds";
import { sweepSelling } from "@/lib/selling-sweep";

// Daily: return and offer deadlines, shop scores and "was" prices, then the refunds of
// returns paid online through Wayl (while store_settings allow it).
export const GET = async (request: Request) => {
  if (!isAuthorizedCronRequest(request)) {
    return unauthorized();
  }
  try {
    const admin = createAdminClient();
    const sweep = await sweepSelling(admin);
    const refunds = await refundReturns(admin, getPaymentProvider());
    return Response.json({ ...sweep, refunds });
  } catch (error) {
    log.error(`Selling sweep failed: ${parseError(error)}`);
    return new Response("Sweep failed", { status: 500 });
  }
};

import { createAdminClient } from "@repo/database/admin";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { getPaymentProvider } from "@repo/payments/server";
import { isAuthorizedCronRequest, unauthorized } from "@/lib/cron";
import { refundReturns } from "@/lib/return-refunds";
import { sweepSelling } from "@/lib/selling-sweep";
import { sweepSurveys } from "@/lib/survey-refunds";

// Daily: return and offer deadlines, shop scores and "was" prices, then the refunds of
// returns paid online through Wayl (while store_settings allow it); surveys past their
// 60 days close and closed Boosted surveys refund what they didn't use.
export const GET = async (request: Request) => {
  if (!isAuthorizedCronRequest(request)) {
    return unauthorized();
  }
  try {
    const admin = createAdminClient();
    const sweep = await sweepSelling(admin);
    const provider = getPaymentProvider();
    const refunds = await refundReturns(admin, provider);
    const surveys = await sweepSurveys(admin, provider);
    return Response.json({ ...sweep, refunds, surveys });
  } catch (error) {
    log.error(`Selling sweep failed: ${parseError(error)}`);
    return new Response("Sweep failed", { status: 500 });
  }
};

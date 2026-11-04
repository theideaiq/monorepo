import { createAdminClient } from "@repo/database/admin";
import { sendEmail } from "@repo/email";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { isAuthorizedCronRequest, unauthorized } from "@/lib/cron";
import { recordJobRun } from "@/lib/job-runs";
import { sweepProgramDocuments } from "@/lib/program-documents";
import { sendReminderEmails } from "@/lib/reminder-emails";
import { notificationUrl } from "@/lib/telegram-notify";

const failed = (error: string) => NextResponse.json({ error }, { status: 500 });

const run = async () => {
  const admin = createAdminClient();
  const followers = await admin.rpc("notify_opportunity_followers");
  if (followers.error) {
    log.error(`Opportunity reminders failed: ${parseError(followers.error)}`);
    return failed("reminders_failed");
  }
  const travel = await admin.rpc("notify_travel_kits");
  if (travel.error) {
    log.error(`Travel Kit reminders failed: ${parseError(travel.error)}`);
    return failed("travel_failed");
  }
  let emails: Awaited<ReturnType<typeof sendReminderEmails>>;
  try {
    emails = await sendReminderEmails({
      admin,
      logger: log,
      send: sendEmail,
      url: notificationUrl,
    });
  } catch (emailError) {
    log.error(`Reminder emails failed: ${parseError(emailError)}`);
    return failed("emails_failed");
  }
  try {
    const removed = await sweepProgramDocuments(admin);
    return NextResponse.json({
      emails,
      ok: true,
      removed,
      sent: followers.data,
      travel: travel.data,
    });
  } catch (sweepError) {
    log.error(`Program documents sweep failed: ${parseError(sweepError)}`);
    return failed("sweep_failed");
  }
};

/**
 * Daily (10:05 Baghdad, `apps/api/vercel.json`): members following an
 * opportunity hear when it opens and three days before its deadline, and
 * listings past their deadline close (`notify_opportunity_followers`,
 * migration 20270303000000_opportunities); members hear about Travel Kit
 * lines due in the next three days, once per line and due date
 * (`notify_travel_kits`, migration 20270328000000_reminders_and_health).
 * Both reach the app, Droid, push and WhatsApp as every notification does;
 * then the deadline reminders are also emailed, each once
 * (`sendReminderEmails`). Last, passport scans for The IDEA's programs are
 * deleted 30 days after the application or the program ends
 * (`sweepProgramDocuments`). Recorded in `job_runs` as `opportunities`.
 */
export const GET = (request: Request) => {
  if (!isAuthorizedCronRequest(request)) {
    return unauthorized();
  }
  return recordJobRun(createAdminClient, "opportunities", run);
};

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { PageBody, PageHeader, Panel } from "@/components/admin/page";
import { StatusBadge, type Tone } from "@/components/admin/status-badge";
import { callApi } from "@/lib/admin/api";
import { formatters } from "@/lib/admin/format";
import {
  type HealthAnswer,
  type JobRow,
  type JobState,
  jobRows,
  type QueueChannel,
  type QueueCount,
} from "@/lib/admin/health";
import { requireSection } from "@/lib/admin/session";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.health");
  return { title: t("title") };
};

const stateTone: Record<JobState, Tone> = {
  failing: "danger",
  never: "warning",
  ok: "success",
  overdue: "warning",
};

const monitorTone: Record<NonNullable<HealthAnswer["status"]>["state"], Tone> =
  {
    degraded: "danger",
    operational: "success",
    partial: "warning",
    unknown: "neutral",
  };

const CHANNELS: QueueChannel[] = ["push", "telegram", "whatsapp", "email"];

const JobsTable = async ({ rows }: { readonly rows: JobRow[] }) => {
  const t = await getTranslations("admin.health");
  const format = formatters(await getLocale());
  const purpose = (row: JobRow) => {
    const key = `jobPurpose.${row.id}`;
    return t.has(key as never) ? t(key as never) : (row.job?.purpose ?? "");
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("jobs.job")}</TableHead>
          <TableHead>{t("jobs.schedule")}</TableHead>
          <TableHead>{t("jobs.lastOk")}</TableHead>
          <TableHead>{t("jobs.lastFailure")}</TableHead>
          <TableHead>{t("jobs.state")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="max-w-xs whitespace-normal">
              <span className="font-medium font-mono text-xs" dir="ltr">
                {row.id}
              </span>
              <span className="block text-muted-foreground text-xs">
                {purpose(row) || t("jobs.unknownJob")}
              </span>
            </TableCell>
            <TableCell className="whitespace-normal text-xs">
              {row.job ? (
                <>
                  {row.job.schedules.map((schedule) => (
                    <span
                      className="block"
                      key={`${schedule.runner}-${schedule.cron}`}
                    >
                      {t("jobs.cron", {
                        cron: schedule.cron,
                        runner: t(`jobs.runner.${schedule.runner}`),
                      })}
                    </span>
                  ))}
                  <span className="block text-muted-foreground">
                    {t("jobs.gap", {
                      hours: format.number(row.job.maxGapMinutes / 60),
                    })}
                  </span>
                </>
              ) : (
                "—"
              )}
            </TableCell>
            <TableCell className="text-xs">
              {format.dateTime(row.run?.last_ok_at)}
            </TableCell>
            <TableCell className="max-w-xs whitespace-normal text-xs">
              {format.dateTime(row.run?.last_failed_at)}
              {row.run?.last_error ? (
                <span className="block break-words text-muted-foreground">
                  {row.run.last_error}
                </span>
              ) : null}
            </TableCell>
            <TableCell>
              <StatusBadge tone={stateTone[row.health.state]}>
                {t(`jobs.states.${row.health.state}`)}
              </StatusBadge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

const IntegrationsPanel = async ({
  integrations,
}: {
  readonly integrations: HealthAnswer["integrations"];
}) => {
  const t = await getTranslations("admin.health");
  const label = (id: string) => {
    const key = `integrations.${id}`;
    return t.has(key as never) ? t(key as never) : id;
  };
  const entries = Object.entries(integrations).sort(([a], [b]) =>
    label(a).localeCompare(label(b))
  );
  return (
    <Panel
      description={t("integrationsDescription")}
      title={t("integrationsTitle")}
    >
      <div className="grid gap-x-6 sm:grid-cols-2">
        {entries.map(([id, configured]) => (
          <div
            className="flex items-center justify-between gap-2 border-b py-2 text-sm"
            key={id}
          >
            <span>{label(id)}</span>
            <StatusBadge tone={configured ? "success" : "neutral"}>
              {configured ? t("set") : t("notSet")}
            </StatusBadge>
          </div>
        ))}
      </div>
    </Panel>
  );
};

const MonitorsPanel = async ({
  status,
}: {
  readonly status: HealthAnswer["status"];
}) => {
  const t = await getTranslations("admin.health");
  return (
    <Panel description={t("monitors.description")} title={t("monitors.title")}>
      {status ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <StatusBadge tone={monitorTone[status.state]}>
            {t(`monitors.states.${status.state}`)}
          </StatusBadge>
          <a
            className="break-all underline-offset-4 hover:underline"
            dir="ltr"
            href={status.url}
            rel="noopener noreferrer"
            target="_blank"
          >
            {status.url}
          </a>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          {t("monitors.notConfigured")}
        </p>
      )}
    </Panel>
  );
};

const QueueRow = async ({
  channel,
  queue,
}: {
  readonly channel: QueueChannel;
  readonly queue: QueueCount | null;
}) => {
  const t = await getTranslations("admin.health.queues");
  const format = formatters(await getLocale());
  let value = t("notConfigured");
  if (queue) {
    value = queue.capped
      ? t("atLeast", { count: format.number(queue.count) })
      : format.number(queue.count);
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b py-2 text-sm last:border-0">
      <span className="font-medium">{t(`channels.${channel}`)}</span>
      <span className="flex items-center gap-2">
        {value}
        {queue ? (
          <StatusBadge tone={queue.count > 0 ? "warning" : "success"}>
            {queue.count > 0 ? t("stuck") : t("clear")}
          </StatusBadge>
        ) : null}
      </span>
    </div>
  );
};

const QueuesPanel = async ({
  queues,
}: {
  readonly queues: HealthAnswer["queues"];
}) => {
  const t = await getTranslations("admin.health.queues");
  return (
    <Panel description={t("description")} title={t("title")}>
      {queues ? (
        <div className="grid">
          {CHANNELS.map((channel) => (
            <QueueRow channel={channel} key={channel} queue={queues[channel]} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">{t("unavailable")}</p>
      )}
    </Panel>
  );
};

/**
 * Staff → Settings → Health (admins): each scheduled job's last success
 * and failure from `job_runs` (read as the staff member) against the job
 * catalogue, then the integrations, the Better Stack monitors and the
 * notifications stuck on a channel, from apps/api.
 */
const HealthPage = async () => {
  const { supabase } = await requireSection("health");
  const t = await getTranslations("admin.health");
  const format = formatters(await getLocale());

  const [result, { data: runs, error: runsError }] = await Promise.all([
    callApi<HealthAnswer>(supabase, "/admin/health", {}),
    supabase
      .from("job_runs")
      .select(
        "job, last_started_at, last_ok_at, last_failed_at, last_error, last_duration_ms"
      ),
  ]);
  const answer = result.ok ? result.data : null;
  const now = new Date(answer?.checkedAt ?? Date.now());
  const rows = jobRows(answer?.jobs ?? null, runs ?? [], now);
  const overdue = rows.filter((row) => row.health.overdue).length;
  const failing = rows.filter((row) => row.health.failing).length;

  return (
    <>
      <PageHeader
        description={
          answer
            ? t("checkedAt", { time: format.dateTime(answer.checkedAt) })
            : t("description")
        }
        title={t("title")}
      />
      <PageBody className="max-w-6xl">
        {answer ? null : (
          <p className="text-destructive text-sm" role="alert">
            {t("unreachable")}
          </p>
        )}

        <Panel
          description={t("jobs.description")}
          title={t("jobs.title", {
            failing: format.number(failing),
            overdue: format.number(overdue),
          })}
        >
          {runsError ? (
            <p className="text-destructive text-sm" role="alert">
              {t("jobs.readFailed")}
            </p>
          ) : null}
          {rows.length > 0 ? (
            <JobsTable rows={rows} />
          ) : (
            <p className="text-muted-foreground text-sm">{t("jobs.none")}</p>
          )}
        </Panel>

        {answer ? (
          <>
            <IntegrationsPanel integrations={answer.integrations} />
            <MonitorsPanel status={answer.status} />
            <QueuesPanel queues={answer.queues} />
          </>
        ) : null}
      </PageBody>
    </>
  );
};

export default HealthPage;

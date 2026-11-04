import { project } from "@repo/config";
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
import type { ReactNode } from "react";
import {
  DetailList,
  PageBody,
  PageHeader,
  Panel,
} from "@/components/admin/page";
import { StatusBadge, type Tone } from "@/components/admin/status-badge";
import { env } from "@/env";
import { callApi } from "@/lib/admin/api";
import { formatters } from "@/lib/admin/format";
import {
  type Configured,
  githubFile,
  runbooks,
  serviceConfigured,
  services,
} from "@/lib/admin/handover";
import type { HealthAnswer } from "@/lib/admin/health";
import { Link } from "@/lib/admin/navigation";
import { profileNames } from "@/lib/admin/profiles";
import { sectionHref, staffRoles } from "@/lib/admin/roles";
import { requireSection } from "@/lib/admin/session";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.handover");
  return { title: t("title") };
};

const configuredTone: Record<Configured, Tone> = {
  missing: "warning",
  set: "success",
  unchecked: "neutral",
  unknown: "neutral",
};

const REPO_URL = project.repoUrl ?? "https://github.com/theideaiq/monorepo";

const External = ({
  children,
  href,
}: {
  readonly children?: ReactNode;
  readonly href: string;
}) => (
  <a
    className="break-all underline-offset-4 hover:underline"
    dir={children ? undefined : "ltr"}
    href={href}
    rel="noopener noreferrer"
    target="_blank"
  >
    {children ?? href}
  </a>
);

const Url = ({ value }: { readonly value: string | undefined }) =>
  value ? <External href={value} /> : "—";

/**
 * Staff → Settings → Handover (superadmins): what someone taking over the
 * business needs. Who has access (and whether each has an authenticator
 * app, from apps/api), the services the code depends on with their
 * dashboards and variable names (configured or not, from Health), the
 * domains and apps, and the runbooks.
 */
const HandoverPage = async () => {
  const { supabase } = await requireSection("handover");
  const t = await getTranslations("admin.handover");
  const tRoles = await getTranslations("admin.roles");
  const format = formatters(await getLocale());

  const [{ data: rows }, health, factors] = await Promise.all([
    supabase.from("staff").select("user_id, role, title, created_at"),
    callApi<HealthAnswer>(supabase, "/admin/health", {}),
    callApi<{ authenticator: Record<string, boolean> }>(
      supabase,
      "/admin/staff/factors",
      {}
    ),
  ]);
  const names = await profileNames(
    supabase,
    (rows ?? []).map((row) => row.user_id)
  );
  const members = [...(rows ?? [])].sort(
    (a, b) =>
      staffRoles.indexOf(a.role) - staffRoles.indexOf(b.role) ||
      (names.get(a.user_id) ?? "").localeCompare(names.get(b.user_id) ?? "")
  );
  const authenticator = factors.ok ? factors.data.authenticator : null;
  const integrations = health.ok ? health.data.integrations : null;

  const domains = [
    { label: t("domains.main"), value: project.url },
    { label: t("domains.website"), value: env.NEXT_PUBLIC_WEB_URL },
    { label: t("domains.partners"), value: env.NEXT_PUBLIC_APP_URL },
    { label: t("domains.staff"), value: env.NEXT_PUBLIC_STAFF_URL },
    { label: t("domains.api"), value: env.NEXT_PUBLIC_API_URL },
    { label: t("domains.docs"), value: env.NEXT_PUBLIC_DOCS_URL },
    { label: t("domains.supabase"), value: env.NEXT_PUBLIC_SUPABASE_URL },
  ];

  return (
    <>
      <PageHeader description={t("description")} title={t("title")} />
      <PageBody className="max-w-6xl">
        <Panel
          actions={
            <Link
              className="text-sm underline-offset-4 hover:underline"
              href={sectionHref.staff}
            >
              {t("access.manage")}
            </Link>
          }
          description={
            authenticator ? t("access.description") : t("access.noFactors")
          }
          title={t("access.title", { count: format.number(members.length) })}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("access.person")}</TableHead>
                <TableHead>{t("access.role")}</TableHead>
                <TableHead>{t("access.since")}</TableHead>
                {authenticator ? (
                  <TableHead>{t("access.authenticator")}</TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.user_id}>
                  <TableCell>
                    <span className="font-medium">
                      {names.get(member.user_id) ?? t("access.unnamed")}
                    </span>
                    {member.title ? (
                      <span className="block text-muted-foreground text-xs">
                        {member.title}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      tone={member.role === "superadmin" ? "brand" : "neutral"}
                    >
                      {tRoles(member.role)}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {format.date(member.created_at)}
                  </TableCell>
                  {authenticator ? (
                    <TableCell>
                      {authenticator[member.user_id] ? (
                        <StatusBadge tone="success">
                          {t("access.hasApp")}
                        </StatusBadge>
                      ) : (
                        <StatusBadge tone="warning">
                          {t("access.noApp")}
                        </StatusBadge>
                      )}
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>

        <Panel
          description={
            integrations
              ? t("services.description")
              : t("services.healthUnavailable")
          }
          title={t("services.title")}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("services.service")}</TableHead>
                <TableHead>{t("services.dashboard")}</TableHead>
                <TableHead>{t("services.env")}</TableHead>
                <TableHead>{t("services.configured")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((service) => {
                const configured = serviceConfigured(service, integrations);
                return (
                  <TableRow key={service.id}>
                    <TableCell className="max-w-xs whitespace-normal">
                      <span className="font-medium">
                        {t(`services.list.${service.id}.name`)}
                      </span>
                      <span className="block text-muted-foreground text-xs">
                        {t(`services.list.${service.id}.use`)}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">
                      <External href={service.dashboard} />
                    </TableCell>
                    <TableCell className="max-w-sm whitespace-normal">
                      {service.env.length > 0 ? (
                        <span className="flex flex-wrap gap-1" dir="ltr">
                          {service.env.map((name) => (
                            <code
                              className="rounded bg-muted px-1 py-0.5 text-xs"
                              key={name}
                            >
                              {name}
                            </code>
                          ))}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">
                          {t("services.noEnv")}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={configuredTone[configured]}>
                        {t(`services.states.${configured}`)}
                      </StatusBadge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Panel>

        <Panel
          description={t("domains.description")}
          title={t("domains.title")}
        >
          <DetailList
            items={[
              ...domains.map((domain) => ({
                label: domain.label,
                value: <Url value={domain.value} />,
              })),
              {
                label: t("domains.appId"),
                value: (
                  <code className="text-xs" dir="ltr">
                    {project.bundleId ?? "—"}
                  </code>
                ),
              },
              {
                label: t("domains.support"),
                value: project.supportEmail ? (
                  <External href={`mailto:${project.supportEmail}`}>
                    <span dir="ltr">{project.supportEmail}</span>
                  </External>
                ) : (
                  "—"
                ),
              },
              { label: t("domains.code"), value: <Url value={REPO_URL} /> },
            ]}
          />
        </Panel>

        <Panel description={t("jobs.description")} title={t("jobs.title")}>
          <div>
            <Link
              className="text-sm underline-offset-4 hover:underline"
              href={sectionHref.health}
            >
              {t("jobs.open")}
            </Link>
          </div>
        </Panel>

        <Panel
          description={t("runbooks.description")}
          title={t("runbooks.title")}
        >
          <ul className="grid gap-2 text-sm">
            {runbooks.map((runbook) => (
              <li key={runbook.id}>
                <External href={githubFile(REPO_URL, runbook.path)}>
                  {t(`runbooks.list.${runbook.id}`)}
                </External>
                <span
                  className="ms-2 font-mono text-muted-foreground text-xs"
                  dir="ltr"
                >
                  {runbook.path}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </PageBody>
    </>
  );
};

export default HandoverPage;

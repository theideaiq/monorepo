import type { Locale } from "@repo/internationalization";
import type { ServiceStatus, SystemStatus } from "@repo/observability/status";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHero } from "@/components/page-hero";
import { EmptyState, Section } from "@/components/section";
import { env } from "@/env";
import { staticPageMetadata } from "@/lib/metadata";

export const revalidate = 60;

interface StatusProps {
  params: Promise<{ locale: Locale }>;
}

export const generateMetadata = staticPageMetadata("status", "/status");

/** The API's `GET /status` (Better Stack), or null when it isn't set up. */
const loadStatus = async (): Promise<SystemStatus | null> => {
  if (!env.NEXT_PUBLIC_API_URL) {
    return null;
  }
  try {
    const response = await fetch(`${env.NEXT_PUBLIC_API_URL}/status`, {
      next: { revalidate: 60 },
    });
    return response.status === 200
      ? ((await response.json()) as SystemStatus)
      : null;
  } catch {
    return null;
  }
};

const DOT: Record<ServiceStatus["state"], string> = {
  down: "bg-destructive",
  maintenance: "bg-warning",
  unknown: "bg-muted-foreground",
  up: "bg-success",
};

/**
 * Is The IDEA working (A29): each part (the website, Partners, Staff, the
 * API, the developer docs, the product feed) with its state from the
 * Better Stack monitors, in both languages, refreshed every minute, and a
 * link to the full history on the Better Stack status page.
 */
const StatusPage = async ({ params }: StatusProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, common, status] = await Promise.all([
    getTranslations({ locale, namespace: "web.status" }),
    getTranslations({ locale, namespace: "common.status" }),
    loadStatus(),
  ]);
  const services = status?.services ?? [];

  return (
    <>
      <PageHero
        highlight={status ? common(status.state) : undefined}
        subtitle={t("subtitle")}
        title={t("title")}
      />
      <Section>
        {services.length === 0 ? (
          <EmptyState action={{ href: "/help#contact", label: t("ask") }}>
            {t("empty")}
          </EmptyState>
        ) : (
          <div className="grid gap-4">
            <ul className="divide-y rounded-lg border">
              {services.map(({ service, state }) => (
                <li
                  className="flex items-center justify-between gap-4 p-4"
                  key={service}
                >
                  <span className="grid gap-0.5">
                    <span className="font-medium">
                      {t(`services.${service}.name`)}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      {t(`services.${service}.what`)}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-sm">
                    <span
                      aria-hidden="true"
                      className={`size-2.5 rounded-full ${DOT[state]}`}
                    />
                    {t(`states.${state}`)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-muted-foreground text-sm">
              {t("refresh")}{" "}
              {status ? (
                <a
                  className="font-medium text-foreground underline underline-offset-2"
                  href={status.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  {t("history")}
                </a>
              ) : null}
            </p>
          </div>
        )}
      </Section>
    </>
  );
};

export default StatusPage;

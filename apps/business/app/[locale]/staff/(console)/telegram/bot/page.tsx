import { Badge } from "@repo/design-system/components/ui/badge";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { ActionButton } from "@/components/admin/action-button";
import { PageBody, PageHeader, Panel } from "@/components/admin/page";
import { callApi } from "@/lib/admin/api";
import { formatters } from "@/lib/admin/format";
import { requireSection } from "@/lib/admin/session";
import { TelegramTabs } from "../_components/telegram-tabs";
import { setUpTelegramBot } from "../actions";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.telegram.bot");
  return { title: t("title") };
};

interface BotAnswer {
  configured: { bot: boolean; login: boolean; webhookSecret: boolean };
  status: {
    commands: number;
    description: boolean;
    lastError: { at: string; message: string } | null;
    menu: string | null;
    pending: number;
    username: string;
    webhook: { matches: boolean; url: string | null };
  } | null;
}

const Row = ({
  children,
  label,
  ok,
}: {
  readonly children: ReactNode;
  readonly label: string;
  readonly ok: boolean;
}) => (
  <div className="flex flex-wrap items-start justify-between gap-2 border-b py-2 text-sm last:border-0">
    <span className="font-medium">{label}</span>
    <span className="flex flex-wrap items-center gap-2 text-end">
      {children}
      <Badge variant={ok ? "default" : "destructive"}>{ok ? "✓" : "!"}</Badge>
    </span>
  </div>
);

/** What Telegram says about the bot: webhook, queue, commands, menu, texts. */
const StatusRows = async ({
  status,
}: {
  readonly status: NonNullable<BotAnswer["status"]>;
}) => {
  const t = await getTranslations("admin.telegram.bot");
  const format = formatters(await getLocale());
  return (
    <>
      <Row label={t("webhook")} ok={status.webhook.matches}>
        <span className="break-all" dir="ltr">
          {status.webhook.url ?? t("none")}
        </span>
      </Row>
      <Row label={t("pending")} ok={status.pending < 50}>
        {format.number(status.pending)}
      </Row>
      <Row label={t("lastError")} ok={!status.lastError}>
        {status.lastError
          ? `${format.dateTime(status.lastError.at)} · ${status.lastError.message}`
          : t("none")}
      </Row>
      <Row label={t("commands")} ok={status.commands > 0}>
        {format.number(status.commands)}
      </Row>
      <Row label={t("menu")} ok={Boolean(status.menu)}>
        <span className="break-all" dir="ltr">
          {status.menu ?? t("none")}
        </span>
      </Row>
      <Row label={t("texts")} ok={status.description}>
        {status.description ? t("set") : t("missing")}
      </Row>
    </>
  );
};

/**
 * Droid, The IDEA's Telegram bot: whether it's configured and set up (the
 * webhook here, pending updates and the last error, commands, the Mini App
 * button, descriptions, sign-in with Telegram), and setting it up again.
 */
const BotPage = async () => {
  const { canWrite, staff, supabase } = await requireSection("telegram");
  const t = await getTranslations("admin.telegram.bot");
  const result = await callApi<BotAnswer>(supabase, "/admin/telegram", {
    action: "status",
  });
  const answer = result.ok ? result.data : null;
  const status = answer?.status ?? null;
  const admin = staff.role === "superadmin" || staff.role === "admin";

  return (
    <>
      <PageHeader title={t("title")} />
      <TelegramTabs />
      <PageBody>
        <Panel description={t("description")} title={t("statusTitle")}>
          {answer ? null : (
            <p className="text-destructive text-sm" role="alert">
              {t("unreachable")}
            </p>
          )}
          {answer ? (
            <div className="grid">
              <Row label={t("token")} ok={answer.configured.bot}>
                {status ? (
                  <span dir="ltr">@{status.username}</span>
                ) : (
                  t("tokenMissing")
                )}
              </Row>
              <Row label={t("secret")} ok={answer.configured.webhookSecret}>
                {answer.configured.webhookSecret ? t("set") : t("missing")}
              </Row>
              {status ? <StatusRows status={status} /> : null}
              <Row label={t("login")} ok={answer.configured.login}>
                {answer.configured.login ? t("set") : t("loginMissing")}
              </Row>
            </div>
          ) : null}
        </Panel>
        {canWrite && admin && answer?.configured.bot ? (
          <Panel description={t("setupDescription")} title={t("setupTitle")}>
            <div>
              <ActionButton action={setUpTelegramBot} fields={{}} size="sm">
                {t("setup")}
              </ActionButton>
            </div>
          </Panel>
        ) : null}
        <Panel description={t("ownerDescription")} title={t("ownerTitle")}>
          <ol className="grid list-decimal gap-1 ps-5 text-sm">
            <li>{t("owner.token")}</li>
            <li>{t("owner.secret")}</li>
            <li>{t("owner.login")}</li>
            <li>{t("owner.setup")}</li>
          </ol>
        </Panel>
      </PageBody>
    </>
  );
};

export default BotPage;

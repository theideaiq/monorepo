import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import {
  type TelegramError,
  TelegramFinish,
} from "@/components/pass/telegram-finish";
import { env } from "@/env";
import { readReturnTo, type SearchParams } from "@/lib/pass/return-to";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("pass.telegram");
  return { robots: { follow: false, index: false }, title: t("title") };
};

const errors = new Set<TelegramError>([
  "cancelled",
  "failed",
  "suspended",
  "taken",
  "unavailable",
]);

const text = (value: string | string[] | undefined) =>
  typeof value === "string" && value.length <= 4000 ? value : null;

/** Where the API sends people back after Telegram (apps/api/auth/telegram). */
const TelegramPage = async ({
  searchParams,
}: {
  readonly searchParams: SearchParams;
}) => {
  const locale = await getLocale();
  const [params, returnTo, t] = await Promise.all([
    searchParams,
    readReturnTo(searchParams, locale),
    getTranslations("pass.telegram"),
  ]);
  const error = text(params.error) as TelegramError | null;

  return (
    <div className="grid gap-6">
      <h1 className="text-center font-semibold text-2xl tracking-tight">
        {t("title")}
      </h1>
      <TelegramFinish
        error={error && errors.has(error) ? error : null}
        name={text(params.name)?.slice(0, 64) ?? null}
        returnTo={returnTo}
        ticket={text(params.ticket)}
        tokenHash={text(params.token_hash)}
        turnstileSiteKey={env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
      />
    </div>
  );
};

export default TelegramPage;

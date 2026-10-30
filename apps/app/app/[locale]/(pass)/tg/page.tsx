import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { TelegramMiniApp } from "@/components/pass/telegram-mini-app";
import { env } from "@/env";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("pass.telegram.miniApp");
  return { robots: { follow: false, index: false }, title: t("title") };
};

/** The Droid's Mini App: Telegram opens the website here (its menu button). */
const MiniAppPage = async () => {
  const t = await getTranslations("pass.telegram.miniApp");
  return (
    <div className="grid gap-6">
      <h1 className="text-center font-semibold text-2xl tracking-tight">
        {t("title")}
      </h1>
      <TelegramMiniApp apiUrl={env.NEXT_PUBLIC_API_URL ?? null} />
    </div>
  );
};

export default MiniAppPage;

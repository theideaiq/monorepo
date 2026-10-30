import { Button } from "@repo/design-system/components/ui/button";
import { cn } from "@repo/design-system/lib/utils";
import type { Locale } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { Send } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { joinPath, topicPath } from "@/lib/club";
import { telegram } from "@/lib/links";

export type ClubPart = "events" | "home" | "opportunities" | "read" | "surveys";

const PARTS: readonly { href: string; id: ClubPart }[] = [
  { href: joinPath(), id: "home" },
  { href: joinPath("events"), id: "events" },
  { href: joinPath("opportunities"), id: "opportunities" },
  { href: joinPath("surveys"), id: "surveys" },
  { href: topicPath(), id: "read" },
];

/** The Club's pages, as links (each part is its own address). */
export const ClubNav = async ({
  current,
  locale,
}: {
  readonly current: ClubPart;
  readonly locale: Locale;
}) => {
  const t = await getTranslations({ locale, namespace: "web.club.pages.nav" });
  return (
    <nav aria-label={t("label")} className="-mx-4 overflow-x-auto px-4">
      <ul className="flex gap-2 border-b pb-3">
        {PARTS.map((part) => (
          <li className="shrink-0" key={part.id}>
            <Link
              aria-current={part.id === current ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center rounded-full px-4 font-medium text-muted-foreground text-sm hover:bg-muted hover:text-foreground",
                part.id === current && "bg-muted text-foreground"
              )}
              href={part.href}
            >
              {t(part.id)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
};

/** The rooms, as on Telegram (topics of The IDEA Club group). */
const rooms = [
  "stage",
  "lounge",
  "arcade",
  "vibe",
  "library",
  "studio",
  "office",
] as const;

/** The IDEA Club on Telegram: the rooms and the way in, as one card. */
export const TelegramCard = async ({ locale }: { readonly locale: Locale }) => {
  const t = await getTranslations({ locale, namespace: "web.club.telegram" });
  return (
    <section className="flex flex-col gap-4 rounded-lg border bg-surface-raised p-6 shadow-1 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-col gap-2">
        <h2 className="font-semibold text-lg">{t("title")}</h2>
        <p className="max-w-2xl text-muted-foreground text-sm">
          {t("description")}
        </p>
        <ul className="flex flex-wrap gap-1.5">
          {rooms.map((room) => (
            <li
              className="rounded-full bg-muted px-2.5 py-0.5 text-muted-foreground text-xs"
              key={room}
            >
              {t(`rooms.${room}`)}
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground text-xs">
          {t("guidelines")}{" "}
          <Link className="text-pink-text underline" href="/legal/club">
            {t("guidelinesLink")}
          </Link>
        </p>
      </div>
      <Button asChild className="shrink-0 gap-2">
        <a href={telegram.club} rel="noopener noreferrer" target="_blank">
          <Send className="size-4" />
          {t("join")}
        </a>
      </Button>
    </section>
  );
};

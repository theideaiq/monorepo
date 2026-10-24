import { Highlight } from "@repo/design-system/components/brand/highlight";
import { PinkBand } from "@repo/design-system/components/brand/pink-band";
import { Button } from "@repo/design-system/components/ui/button";
import type { Locale, Messages } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import {
  ArrowUpRight,
  BookOpen,
  Briefcase,
  Clapperboard,
  Gamepad2,
  Megaphone,
  Music,
  Palette,
  Send,
  Trophy,
} from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHero } from "@/components/page-hero";
import { Section } from "@/components/section";
import { telegram } from "@/lib/links";
import { staticPageMetadata } from "@/lib/metadata";

interface ClubProps {
  params: Promise<{ locale: Locale }>;
}

type Rooms = Messages["web"]["club"]["rooms"];

/** The eight rooms, in the order of `web.club.rooms`. */
const roomIcons = [
  Megaphone,
  Music,
  BookOpen,
  Clapperboard,
  Gamepad2,
  Trophy,
  Palette,
  Briefcase,
];
// The bento layout: wide tiles for the first and fourth rooms.
const WIDE = new Set([0, 3]);

export const generateMetadata = staticPageMetadata("club", "/club");

const Club = async ({ params }: ClubProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.club" });
  const rooms = t.raw("rooms") as Rooms;
  const external = { rel: "noopener noreferrer", target: "_blank" } as const;

  return (
    <>
      <PageHero
        highlight={t("highlight")}
        subtitle={t("subtitle")}
        title={t("title")}
      >
        <Button asChild className="gap-2" size="lg">
          <a href={telegram.club} {...external}>
            <Send className="size-4" />
            {t("join")}
          </a>
        </Button>
      </PageHero>

      <Section title={t("roomsTitle")}>
        <ul className="grid gap-4 md:grid-cols-4">
          {rooms.map((room, index) => {
            const Icon = roomIcons[index] ?? Megaphone;
            return (
              <li
                className={WIDE.has(index) ? "md:col-span-2" : undefined}
                key={room.title}
              >
                <a
                  className="group flex h-full flex-col gap-4 rounded-lg border bg-card p-6 shadow-1 transition-colors hover:border-club"
                  href={telegram.club}
                  {...external}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex size-11 items-center justify-center rounded-lg bg-club text-on-accent-warm">
                      <Icon aria-hidden="true" className="size-5" />
                    </span>
                    <ArrowUpRight className="size-5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 rtl:-scale-x-100" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <h3 className="font-bold text-xl">{room.title}</h3>
                    <p className="text-muted-foreground text-sm">
                      {room.description}
                    </p>
                  </div>
                </a>
              </li>
            );
          })}
        </ul>
        <p className="mt-6 text-muted-foreground text-sm">
          {t("guidelines")}{" "}
          <Link className="text-pink-text underline" href="/legal/community">
            {t("guidelinesLink")}
          </Link>
        </p>
      </Section>

      <PinkBand
        action={
          <Button asChild size="lg" variant="brand">
            <a href={telegram.club} {...external}>
              {t("cta.button")}
            </a>
          </Button>
        }
        description={t("cta.description")}
        title={
          <>
            {t("cta.title")} <Highlight>{t("cta.highlight")}</Highlight>
          </>
        }
      />
    </>
  );
};

export default Club;

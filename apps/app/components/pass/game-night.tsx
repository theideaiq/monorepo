"use client";

import { localized } from "@repo/commerce";
import { type Locale, localePath } from "@repo/internationalization";
import { formatDate } from "@repo/internationalization/format";
import { Gamepad2Icon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { ShareButton } from "@/components/share-button";
import { type GameNight, useMyGameNights } from "@/lib/kits";

const Night = ({ night }: { readonly night: GameNight }) => {
  const t = useTranslations("app.pass.gameNight");
  const locale = useLocale() as Locale;
  const kit = localized(
    { name_ar: night.kitNameAr, name_en: night.kitNameEn },
    "name",
    locale
  );
  const day = formatDate(night.startsOn, locale, "full");
  const contents = locale === "ar" ? night.contentsAr : night.contentsEn;
  const games = night.games.map((game) => localized(game, "name", locale));
  const url =
    typeof window === "undefined"
      ? ""
      : `${window.location.origin}${localePath(locale, `/store/kits/${night.kitType}`)}`;

  return (
    <li className="grid gap-3 p-4">
      <div className="flex items-start gap-3">
        <Gamepad2Icon
          aria-hidden="true"
          className="size-5 shrink-0 text-pink-text"
        />
        <div className="grid gap-1">
          <p className="font-medium text-sm">{kit}</p>
          <p className="text-muted-foreground text-sm">
            {t(night.status === "out" ? "atHome" : "arrives", {
              from: day,
              to: formatDate(night.endsOn, locale, "full"),
            })}
          </p>
        </div>
      </div>
      {games.length > 0 ? (
        <div className="grid gap-1 text-sm">
          <p className="font-medium">{t("games")}</p>
          <ul className="list-disc ps-5 text-muted-foreground">
            {games.map((game) => (
              <li key={game}>{game}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {contents.length > 0 ? (
        <div className="grid gap-1 text-sm">
          <p className="font-medium">{t("inTheBox")}</p>
          <ul className="list-disc ps-5 text-muted-foreground">
            {contents.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <div>
        <ShareButton
          contentType="game_night"
          itemId={night.id}
          label={t("invite")}
          title={t("inviteText", { date: day, kit })}
          url={url}
        />
      </div>
    </li>
  );
};

/**
 * A3, the game night planner: each game night ahead on Pass, with when the
 * kit comes and goes, the games picked, what's in the box (when staff have
 * written it) and a way to invite friends. Nothing when none is booked.
 */
export const GameNights = () => {
  const t = useTranslations("app.pass.gameNight");
  const nights = useMyGameNights().data ?? [];
  if (nights.length === 0) {
    return null;
  }
  return (
    <section aria-labelledby="pass-game-night" className="grid gap-3">
      <h2 className="font-semibold text-lg" id="pass-game-night">
        {t("title")}
      </h2>
      <ul className="divide-y rounded-lg border bg-card">
        {nights.map((night) => (
          <Night key={night.id} night={night} />
        ))}
      </ul>
    </section>
  );
};

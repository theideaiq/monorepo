"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import type { Locale } from "@repo/internationalization";
import { localePath } from "@repo/internationalization";
import { formatNumber } from "@repo/internationalization/format";
import { usePathname } from "@repo/internationalization/navigation";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";
import { SectionSpinner } from "@/components/states";
import { ProductCard } from "@/components/store/product-card";
import { ApiError } from "@/lib/api";
import {
  useConnectLastfm,
  useConnectSpotify,
  useDisconnectMusic,
  useMusicServices,
  useVinylForYou,
} from "@/lib/music-queries";

/** Connect Spotify (sign-in) or Last.fm (a username). */
const ConnectMusic = () => {
  const t = useTranslations("app.wishlist.vinyl");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const id = useId();
  const services = useMusicServices();
  const lastfm = useConnectLastfm();
  const spotify = useConnectSpotify();
  const [username, setUsername] = useState("");

  const connectLastfm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (username.trim()) {
      lastfm.mutate(username);
    }
  };
  const lastfmProblem =
    lastfm.error instanceof ApiError && lastfm.error.code === "not_found"
      ? t("lastfmNotFound")
      : t("failed");

  return (
    <div className="grid gap-3 rounded-md border p-3 text-sm">
      {services.data?.spotify ? (
        <Button
          className="justify-self-start"
          disabled={spotify.isPending}
          onClick={() => spotify.mutate(localePath(locale, pathname))}
        >
          {t("spotify")}
        </Button>
      ) : null}
      {services.data?.lastfm ? (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={connectLastfm}
        >
          <div className="grid gap-1">
            <Label htmlFor={`${id}-lastfm`}>{t("lastfm")}</Label>
            <Input
              autoComplete="off"
              dir="ltr"
              id={`${id}-lastfm`}
              maxLength={15}
              onChange={(event) => setUsername(event.target.value)}
              value={username}
            />
          </div>
          <Button
            disabled={lastfm.isPending || !username.trim()}
            type="submit"
            variant="outline"
          >
            {t("connect")}
          </Button>
        </form>
      ) : null}
      {services.data && !(services.data.spotify || services.data.lastfm) ? (
        <p className="text-muted-foreground">{t("unavailable")}</p>
      ) : null}
      {lastfm.isError || spotify.isError ? (
        <p className="text-destructive" role="alert">
          {lastfm.isError ? lastfmProblem : t("failed")}
        </p>
      ) : null}
    </div>
  );
};

/**
 * Pass → Saved → Vinyl: connect Spotify or Last.fm, then see the Store's
 * vinyl by the artists you listen to. Shown once The IDEA has set up at
 * least one of them (apps/api).
 */
export const VinylForYou = () => {
  const t = useTranslations("app.wishlist.vinyl");
  const locale = useLocale() as Locale;
  const outcome = useSearchParams().get("music");
  const vinyl = useVinylForYou();
  const disconnect = useDisconnectMusic();

  if (vinyl.isPending) {
    return <SectionSpinner />;
  }
  const taste = vinyl.data?.taste ?? null;
  const products = vinyl.data?.products ?? [];

  return (
    <div className="grid gap-4">
      <p className="text-muted-foreground text-sm">{t("description")}</p>
      {outcome === "connected" ? (
        <p className="text-sm" role="status">
          {t("connected")}
        </p>
      ) : null}
      {outcome === "failed" ? (
        <p className="text-destructive text-sm" role="alert">
          {t("failed")}
        </p>
      ) : null}

      {taste ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm">
          <span>
            {t(`connectedTo.${taste.provider}`, {
              account: taste.account,
              artists: formatNumber(taste.artists, locale),
            })}
          </span>
          <Button
            disabled={disconnect.isPending}
            onClick={() => disconnect.mutate(undefined)}
            size="sm"
            variant="ghost"
          >
            {t("disconnect")}
          </Button>
        </div>
      ) : (
        <ConnectMusic />
      )}

      {taste && products.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("none")}</p>
      ) : null}
      {products.length > 0 ? (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </ul>
      ) : null}
    </div>
  );
};

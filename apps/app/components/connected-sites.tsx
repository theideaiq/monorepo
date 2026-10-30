"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import type { Locale } from "@repo/internationalization";
import { formatDate, formatDateTime } from "@repo/internationalization/format";
import { LinkIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { askedFor } from "@/lib/pass-sign-in";
import {
  useCardChecks,
  useCardEmbeds,
  useConnectedSites,
  useDisconnectSite,
  useEndCardEmbed,
} from "@/lib/pass-sign-in-queries";

/**
 * Pass → Settings → Connected sites: the partner sites the member signed
 * in to with their Pass, what each was told, Disconnect, the sites showing
 * their live card in a frame (Stop), and the latest checks of their card by
 * partner apps.
 */
export const ConnectedSites = () => {
  const t = useTranslations("app.settings.sites");
  const tScopes = useTranslations("pass.authorize.scopes");
  const locale = useLocale() as Locale;
  const sites = useConnectedSites();
  const checks = useCardChecks();
  const embeds = useCardEmbeds();
  const disconnect = useDisconnectSite();
  const stop = useEndCardEmbed();
  const connected = sites.data ?? [];
  const checked = checks.data ?? [];
  const shown = embeds.data ?? [];

  if (connected.length === 0 && checked.length === 0 && shown.length === 0) {
    return null;
  }
  return (
    <Card id="sites">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LinkIcon aria-hidden="true" className="size-5 text-pink-text" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {connected.map((site) => (
          <div
            className="flex flex-wrap items-start justify-between gap-3 rounded-lg border p-3"
            key={site.client_id}
          >
            <div className="grid gap-1">
              <p className="font-medium">{site.pass_partners?.name}</p>
              <p className="text-muted-foreground text-xs">
                {t("since", { date: formatDate(site.granted_at, locale) })}
              </p>
              <p className="text-muted-foreground text-xs">
                {[
                  tScopes("openid"),
                  ...askedFor(site.scopes).map((scope) => tScopes(scope)),
                ].join(" · ")}
              </p>
            </div>
            <Button
              disabled={disconnect.isPending}
              onClick={() => disconnect.mutate(site.client_id)}
              size="sm"
              variant="outline"
            >
              {t("disconnect")}
            </Button>
          </div>
        ))}
        {shown.length > 0 ? (
          <div className="grid gap-2">
            <p className="font-medium text-sm">{t("embedded")}</p>
            {shown.map((embed) => (
              <div
                className="flex flex-wrap items-start justify-between gap-3 rounded-lg border p-3"
                key={embed.client_id}
              >
                <div className="grid gap-1 text-xs">
                  <p className="font-medium text-sm">
                    {embed.pass_partners?.name ?? t("aSite")}
                  </p>
                  <p className="text-muted-foreground">
                    {t("embeddedSince", {
                      date: formatDate(embed.created_at, locale),
                    })}
                  </p>
                  {embed.last_shown_at ? (
                    <p className="text-muted-foreground">
                      {t("lastShown", {
                        date: formatDateTime(embed.last_shown_at, locale),
                      })}
                    </p>
                  ) : null}
                </div>
                <Button
                  disabled={stop.isPending}
                  onClick={() => stop.mutate(embed.client_id)}
                  size="sm"
                  variant="outline"
                >
                  {t("stop")}
                </Button>
              </div>
            ))}
          </div>
        ) : null}
        {checked.length > 0 ? (
          <div className="grid gap-1">
            <p className="font-medium text-sm">{t("checks")}</p>
            <ul className="grid gap-1 text-muted-foreground text-xs">
              {checked.map((check) => (
                <li key={check.id}>
                  {t("checked", {
                    date: formatDateTime(check.checked_at, locale),
                    site: check.pass_partners?.name ?? t("aSite"),
                  })}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {disconnect.isError || stop.isError ? (
          <p className="text-destructive text-sm" role="alert">
            {t("failed")}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
};

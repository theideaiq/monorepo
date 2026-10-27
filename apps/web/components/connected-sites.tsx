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
import { formatDate } from "@repo/internationalization/format";
import { LinkIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { askedFor } from "@/lib/pass-sign-in";
import {
  useConnectedSites,
  useDisconnectSite,
} from "@/lib/pass-sign-in-queries";

/**
 * Pass → Settings → Connected sites: the partner sites the member signed
 * in to with their Pass, what each was told, and Disconnect.
 */
export const ConnectedSites = () => {
  const t = useTranslations("app.settings.sites");
  const tScopes = useTranslations("pass.authorize.scopes");
  const locale = useLocale() as Locale;
  const sites = useConnectedSites();
  const disconnect = useDisconnectSite();

  if (!sites.isSuccess || sites.data.length === 0) {
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
        {sites.data.map((site) => (
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
        {disconnect.isError ? (
          <p className="text-destructive text-sm" role="alert">
            {t("failed")}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
};

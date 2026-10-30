"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { IdCardIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { SectionSpinner } from "@/components/states";
import { type EmbedTokenMessage, embedClientId } from "@/lib/pass-embed";
import { usePassPartner, useStartCardEmbed } from "@/lib/pass-sign-in-queries";

/**
 * /pass/embed/connect: the popup a partner's frame opens. The signed-in
 * member allows the site to show their live card; the token goes to the
 * frame that opened the popup (our own origin, never the partner's page),
 * and the popup closes. After signing in here the browser forgets which
 * frame opened it, so the member presses the frame's button again.
 */
export const PassEmbedConnect = () => {
  const t = useTranslations("pass.embed.connect");
  const params = useSearchParams();
  const clientId = embedClientId(params.get("client_id")) ?? "";
  const partner = usePassPartner(clientId);
  const start = useStartCardEmbed();
  const [state, setState] = useState<"again" | "ask" | "done">("ask");
  const [opener, setOpener] = useState<Window | null>(null);

  useEffect(() => {
    setOpener(window.opener as Window | null);
  }, []);

  if (!clientId) {
    return <p className="text-sm">{t("notAllowed")}</p>;
  }
  if (partner.isPending) {
    return <SectionSpinner />;
  }
  const site = partner.data?.name ?? "";
  if (!partner.data?.answers.includes("card_embed")) {
    return <p className="text-sm">{t("notAllowed")}</p>;
  }

  const allow = () =>
    start.mutate(clientId, {
      onSuccess: (token) => {
        if (!(token && opener && !opener.closed)) {
          setState("again");
          return;
        }
        const message: EmbedTokenMessage = {
          clientId,
          token,
          type: "idea-pass-embed-token",
        };
        opener.postMessage(message, window.location.origin);
        setState("done");
        window.close();
      },
    });

  if (state === "done") {
    return <p className="text-sm">{t("done")}</p>;
  }
  if (state === "again" || !opener) {
    return <p className="text-sm">{t("again", { site })}</p>;
  }
  return (
    <div className="grid gap-5">
      <div className="grid gap-2 text-center">
        <IdCardIcon
          aria-hidden="true"
          className="mx-auto size-8 text-pink-text"
        />
        <h1 className="font-semibold text-lg">{t("title", { site })}</h1>
      </div>
      <p className="text-muted-foreground text-sm">{t("body", { site })}</p>
      <div className="grid gap-2">
        <Button disabled={start.isPending} onClick={allow}>
          {t("allow")}
        </Button>
        <Button onClick={() => window.close()} variant="ghost">
          {t("cancel")}
        </Button>
      </div>
      {start.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {t("failed")}
        </p>
      ) : null}
    </div>
  );
};

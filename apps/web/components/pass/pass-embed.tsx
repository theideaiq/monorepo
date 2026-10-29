"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { type Locale, localePath } from "@repo/internationalization";
import { formatDate, formatNumber } from "@repo/internationalization/format";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import {
  embedTokenKey,
  heightMessage,
  isEmbedTokenMessage,
  originAllowed,
} from "@/lib/pass-embed";
import { type EmbeddedCard, useEmbeddedCard } from "@/lib/pass-sign-in-queries";
import { CardFace, usePassClock } from "./live-card";

/** Student, or Educator for a verified educator who isn't one. */
const embedBadges = (
  card: { educator?: boolean; student: boolean },
  label: (key: "badges.educator" | "badges.student") => string
) => {
  if (card.student) {
    return [label("badges.student")];
  }
  return card.educator ? [label("badges.educator")] : [];
};

/** The frame's token for this partner (kept in this site's own storage). */
const readToken = (clientId: string) => {
  try {
    return localStorage.getItem(embedTokenKey(clientId));
  } catch {
    return null;
  }
};

const writeToken = (clientId: string, token: string | null) => {
  try {
    if (token) {
      localStorage.setItem(embedTokenKey(clientId), token);
    } else {
      localStorage.removeItem(embedTokenKey(clientId));
    }
  } catch {
    // Storage blocked: the card shows until the frame reloads.
  }
};

/** The partner's page, when it's one of the app's domains. */
const parentOrigin = (origins: readonly string[]) => {
  if (window.parent === window) {
    return null;
  }
  const ancestor =
    window.location.ancestorOrigins?.[0] ??
    (document.referrer ? new URL(document.referrer).origin : null);
  return originAllowed(ancestor, origins) ? ancestor : null;
};

/** Tells the partner's page how tall the card is, so the frame fits it. */
const useReportHeight = (origins: readonly string[]) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    const target = parentOrigin(origins);
    if (!(element && target)) {
      return;
    }
    const observer = new ResizeObserver(() =>
      window.parent.postMessage(
        heightMessage(element.getBoundingClientRect().height),
        target
      )
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [origins]);
  return ref;
};

/** The code for `step`: this read's, or the next one it already carries. */
const codeFor = (card: EmbeddedCard, step: number) => {
  if (card.step === step) {
    return card.code;
  }
  return card.step === step - 1 ? card.next_code : null;
};

interface PassEmbedProps {
  readonly clientId: string;
  /** Origins that may frame it (the app's verified domains). */
  readonly origins: readonly string[];
  readonly site: string;
  readonly theme: "dark" | "light" | null;
}

/**
 * /pass/embed: the member's live Pass card inside a partner's page. The
 * frame has no session of ours (browsers keep our cookie out of other
 * sites' frames): "Show my Pass card" opens a popup on theideaiq.com where
 * the member allows the site, and the popup hands this frame a token. With
 * it the frame reads the card and the current code from us.
 */
export const PassEmbed = ({
  clientId,
  origins,
  site,
  theme,
}: PassEmbedProps) => {
  const t = useTranslations("pass.embed");
  const tCard = useTranslations("pass.card");
  const tHome = useTranslations("pass.home");
  const locale = useLocale() as Locale;
  const { setTheme } = useTheme();
  const [token, setToken] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const popup = useRef<Window | null>(null);
  const { left, step } = usePassClock();
  const embedded = useEmbeddedCard(clientId, token, step);
  const ref = useReportHeight(origins);

  useEffect(() => {
    setToken(readToken(clientId));
  }, [clientId]);

  useEffect(() => {
    if (theme) {
      setTheme(theme);
    }
  }, [setTheme, theme]);

  // The popup's token: same origin as this frame, from the popup we opened.
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (
        event.origin === window.location.origin &&
        event.source === popup.current &&
        isEmbedTokenMessage(event.data, clientId)
      ) {
        writeToken(clientId, event.data.token);
        setToken(event.data.token);
      }
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [clientId]);

  // A token that stopped working (stopped in Settings, expired) is dropped.
  useEffect(() => {
    if (
      embedded.isSuccess &&
      embedded.data === null &&
      !embedded.isPlaceholderData
    ) {
      writeToken(clientId, null);
      setToken(null);
    }
  }, [clientId, embedded.data, embedded.isPlaceholderData, embedded.isSuccess]);

  const connect = () => {
    const url = new URL(
      localePath(locale, "/pass/embed/connect"),
      window.location.origin
    );
    url.searchParams.set("client_id", clientId);
    popup.current = window.open(
      url,
      "idea-pass-embed",
      "popup,width=460,height=640"
    );
    setBlocked(!popup.current);
  };

  const forget = () => {
    writeToken(clientId, null);
    setToken(null);
  };

  const { data: card } = embedded;
  const code = card ? codeFor(card, step) : null;

  return (
    <div className="grid gap-3 p-1" ref={ref}>
      {token && card ? (
        <figure className="grid gap-2">
          <CardFace
            badges={embedBadges(card, tCard)}
            code={code}
            left={left}
            memberNumber={card.member_number}
            memberSince={tHome("memberSince", {
              date: formatDate(card.since, locale),
            })}
            name={card.name}
            plan={locale === "ar" ? card.plan_ar : card.plan_en}
          />
          <figcaption className="flex flex-wrap items-center justify-between gap-2 text-muted-foreground text-xs">
            <span aria-live="off" className="tabular-nums">
              {tCard("newCodeIn", { seconds: formatNumber(left, locale) })}
            </span>
            <button
              className="underline-offset-2 hover:underline"
              onClick={forget}
              type="button"
            >
              {t("forget")}
            </button>
          </figcaption>
        </figure>
      ) : null}
      {token && !card && embedded.isPending ? (
        <div className="aspect-[856/540] w-full animate-pulse rounded-2xl bg-muted" />
      ) : null}
      {token ? null : (
        <div className="grid justify-items-center gap-2 py-2 text-center">
          <p className="text-sm">{t("intro", { site })}</p>
          <Button onClick={connect}>{t("show")}</Button>
          {blocked ? (
            <p className="text-muted-foreground text-xs" role="alert">
              {t("popupBlocked")}{" "}
              <a
                className="underline underline-offset-2"
                href={localePath(locale, "/pass")}
                rel="noopener"
                target="_blank"
              >
                {t("openCard")}
              </a>
            </p>
          ) : null}
        </div>
      )}
      {embedded.isError ? (
        <p className="text-destructive text-xs" role="alert">
          {tCard("unavailable")}
        </p>
      ) : null}
    </div>
  );
};

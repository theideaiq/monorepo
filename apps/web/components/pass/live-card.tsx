"use client";

import { useAuth } from "@repo/auth/provider";
import { BrandLogo } from "@repo/design-system/components/brand-logo";
import { formatNumber } from "@repo/internationalization/format";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { type PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { encode } from "uqr";
import {
  formatMemberNumber,
  PASS_CODE_PERIOD_SECONDS,
  passCode,
  passCodeStep,
  passPayload,
  secondsLeft,
} from "@/lib/pass-code";
import { Guilloche } from "./guilloche";

interface CardSecret {
  memberNumber: number;
  secret: string;
}

const storageKey = (userId: string) => `idea-pass:${userId}`;

const readStored = (userId: string): CardSecret | undefined => {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    return raw ? (JSON.parse(raw) as CardSecret) : undefined;
  } catch {
    // Storage blocked (private mode) or a bad value: fetch the card again.
  }
};

/**
 * The member's number and card secret: fetched once, then kept on the
 * device so the card (and its code) works offline.
 */
const useCardSecret = () => {
  const { supabase, user } = useAuth();
  const userId = user?.id ?? "";
  return useQuery({
    enabled: Boolean(user),
    initialData: () => (userId ? readStored(userId) : undefined),
    queryFn: async (): Promise<CardSecret> => {
      const { data, error } = await supabase.rpc("my_pass_secret");
      const row = data?.[0];
      if (error || !row) {
        throw new Error(error?.message ?? "No card");
      }
      const card = { memberNumber: row.member_number, secret: row.secret };
      try {
        localStorage.setItem(storageKey(userId), JSON.stringify(card));
      } catch {
        // Storage can be unavailable (private mode); the card still works.
      }
      return card;
    },
    queryKey: ["pass-secret", userId],
    staleTime: Number.POSITIVE_INFINITY,
  });
};

/** The current code, recomputed when the 30-second step changes. */
const usePassCode = (secret: string | undefined) => {
  const [now, setNow] = useState(() => Date.now());
  const [code, setCode] = useState<string | null>(null);
  const step = passCodeStep(now);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!secret) {
      return;
    }
    let active = true;
    passCode(secret, step).then((value) => {
      if (active) {
        setCode(value);
      }
    });
    return () => {
      active = false;
    };
  }, [secret, step]);

  return { code, left: secondsLeft(now) };
};

/** The QR code as one SVG path of dark modules. */
const QrCode = ({ value }: { readonly value: string }) => {
  const { data, size } = useMemo(
    () => encode(value, { border: 1, ecc: "M" }),
    [value]
  );
  const path = useMemo(
    () =>
      data
        .flatMap((row, y) =>
          row.map((dark, x) => (dark ? `M${x} ${y}h1v1h-1z` : ""))
        )
        .join(""),
    [data]
  );
  return (
    <svg
      aria-hidden="true"
      className="size-full"
      shapeRendering="crispEdges"
      viewBox={`0 0 ${size} ${size}`}
    >
      <rect fill="#ffffff" height={size} width={size} />
      <path d={path} fill="#16131a" />
    </svg>
  );
};

/** A ring that empties over the 30 seconds a code lasts. */
const CountdownRing = ({ left }: { readonly left: number }) => {
  const circumference = 2 * Math.PI * 10;
  return (
    <svg
      aria-hidden="true"
      className="size-4 shrink-0 -rotate-90 sm:size-5"
      viewBox="0 0 24 24"
    >
      <circle
        className="text-white/25"
        cx="12"
        cy="12"
        fill="none"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <circle
        className="text-bulb-yellow transition-[stroke-dashoffset] duration-1000 ease-linear"
        cx="12"
        cy="12"
        fill="none"
        r="10"
        stroke="currentColor"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - left / PASS_CODE_PERIOD_SECONDS)}
        strokeLinecap="round"
        strokeWidth="3"
      />
    </svg>
  );
};

interface LiveCardProps {
  /** "Member since …", already formatted. */
  readonly memberSince: string | null;
  readonly name: string;
  /** The member's The IDEA Plus plan, when they have one. */
  readonly plan: string | null;
}

/**
 * The IDEA Pass as a card: guilloché, a holographic sheen that follows the
 * pointer, the member's name and number, and a QR code with a 6-digit code
 * that changes every 30 seconds (shown at the counter, checked there).
 */
export const LiveCard = ({ memberSince, name, plan }: LiveCardProps) => {
  const t = useTranslations("pass.card");
  const locale = useLocale();
  const card = useCardSecret();
  const { code, left } = usePassCode(card.data?.secret);
  const ref = useRef<HTMLDivElement>(null);

  // Tilt and move the sheen with the pointer (not for reduced motion).
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const element = ref.current;
    if (
      !element ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const box = element.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width;
    const y = (event.clientY - box.top) / box.height;
    element.style.setProperty("--pass-x", `${x * 100}%`);
    element.style.setProperty("--pass-y", `${y * 100}%`);
    element.style.setProperty("--pass-rx", `${(0.5 - y) * 8}deg`);
    element.style.setProperty("--pass-ry", `${(x - 0.5) * 10}deg`);
  };
  const onPointerLeave = () => {
    ref.current?.style.setProperty("--pass-rx", "0deg");
    ref.current?.style.setProperty("--pass-ry", "0deg");
  };

  const memberNumber = card.data?.memberNumber;
  const payload = memberNumber && code ? passPayload(memberNumber, code) : null;

  return (
    <figure className="grid gap-3">
      <div className="[perspective:1200px]">
        <div
          className="pass-card relative isolate aspect-[856/540] w-full overflow-hidden rounded-2xl bg-idea-pink text-white shadow-xl"
          onPointerLeave={onPointerLeave}
          onPointerMove={onPointerMove}
          ref={ref}
        >
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(120%_90%_at_10%_0%,#f0507f_0%,#d81b60_45%,#8f0f3f_100%)]" />
          <Guilloche className="absolute inset-0 -z-10 size-full text-white/40" />
          <div className="pass-sheen pointer-events-none absolute inset-0" />

          <div className="relative grid h-full grid-cols-[1fr_auto] gap-3 p-[5%]">
            <div className="flex min-w-0 flex-col justify-between">
              <BrandLogo
                className="h-6 w-auto sm:h-8"
                line="Pass"
                variant="on-pink"
              />
              <div className="grid min-w-0 gap-1">
                <p className="text-[0.625rem] text-white/75 uppercase tracking-[0.2em] sm:text-xs">
                  {plan ?? t("member")}
                </p>
                <p className="truncate font-semibold text-lg leading-tight sm:text-3xl">
                  {name}
                </p>
                <p
                  className="font-mono text-sm text-white/85 tabular-nums sm:text-base"
                  dir="ltr"
                >
                  {memberNumber
                    ? `№ ${formatMemberNumber(memberNumber)}`
                    : "№ ··· ···"}
                </p>
              </div>
              <p className="text-[0.625rem] text-white/75 sm:text-xs">
                {memberSince}
              </p>
            </div>

            <div className="flex w-28 flex-col items-center justify-center gap-2 self-center sm:w-40">
              <div className="aspect-square w-full overflow-hidden rounded-lg bg-white p-1.5 shadow-md">
                {payload ? (
                  <QrCode value={payload} />
                ) : (
                  <div className="size-full animate-pulse rounded bg-muted" />
                )}
              </div>
              <div className="flex items-center gap-1.5" dir="ltr">
                <span className="font-mono font-semibold text-base tabular-nums tracking-[0.18em] sm:text-xl">
                  {code ? `${code.slice(0, 3)} ${code.slice(3)}` : "··· ···"}
                </span>
                <CountdownRing left={left} />
              </div>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="flex flex-wrap items-center justify-between gap-2 text-muted-foreground text-sm">
        <span>{t("showAtCounter")}</span>
        <span aria-live="off" className="tabular-nums">
          {t("newCodeIn", { seconds: formatNumber(left, locale) })}
        </span>
      </figcaption>
      {card.isError && !card.data ? (
        <p className="text-destructive text-sm" role="alert">
          {t("unavailable")}
        </p>
      ) : null}
    </figure>
  );
};

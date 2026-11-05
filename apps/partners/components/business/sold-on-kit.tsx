"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { type Locale, localePath } from "@repo/internationalization";
import { CheckIcon, CopyIcon, DownloadIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { encode } from "uqr";
import { env } from "@/env";

/** The two lock-ups shops may show beside their own logo (brand guide). */
const LOCKUPS = [
  { file: "lockup-on-light.svg", ground: "bg-white", key: "light" },
  { file: "lockup-on-pink.svg", ground: "bg-idea-pink", key: "pink" },
] as const;

/** The QR code of `value` as an SVG document: dark modules on white. */
export const qrSvg = (value: string) => {
  const { data, size } = encode(value, { border: 2, ecc: "M" });
  const path = data
    .flatMap((row, y) =>
      row.map((dark, x) => (dark ? `M${x} ${y}h1v1h-1z` : ""))
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="#ffffff"/><path d="${path}" fill="#16131a"/></svg>`;
};

const CopyButton = ({ text }: { readonly text: string }) => {
  const t = useTranslations("app.company.selling.kit");
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  return (
    <Button onClick={copy} size="sm" type="button" variant="outline">
      {copied ? (
        <CheckIcon aria-hidden="true" />
      ) : (
        <CopyIcon aria-hidden="true" />
      )}
      {copied ? t("copied") : t("copy")}
    </Button>
  );
};

/**
 * "Sold on The IDEA" (A12): what an approved shop needs to say it sells
 * here, by the brand guide's rule: one of the two lock-ups beside the shop's
 * own logo, never merged with it; its shop page's link and QR code for
 * stickers, receipts and social posts; and a snippet for its website.
 */
export const SoldOnKit = ({ sellerId }: { readonly sellerId: string }) => {
  const t = useTranslations("app.company.selling.kit");
  const locale = useLocale() as Locale;
  const { origin } = new URL(env.NEXT_PUBLIC_WEB_URL);
  const link = `${origin}${localePath(locale, `/store/shops/${sellerId}`)}`;
  const qr = useMemo(
    () => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrSvg(link))}`,
    [link]
  );
  const snippet = `<a href="${link}"><img src="${origin}/brand/lockup-on-light.svg" alt="${t("alt")}" height="40"></a>`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5 text-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          {LOCKUPS.map((lockup) => (
            <figure className="grid gap-2" key={lockup.key}>
              <div
                className={`flex h-24 items-center justify-center rounded-lg border p-4 ${lockup.ground}`}
              >
                {/* biome-ignore lint/performance/noImgElement: a static SVG. */}
                <img
                  alt={t("alt")}
                  className="h-10 w-auto"
                  height={40}
                  src={`/brand/${lockup.file}`}
                  width={160}
                />
              </div>
              <figcaption>
                <Button asChild size="sm" variant="outline">
                  <a download href={`/brand/${lockup.file}`}>
                    <DownloadIcon aria-hidden="true" />
                    {t(lockup.key === "light" ? "onLight" : "onPink")}
                  </a>
                </Button>
              </figcaption>
            </figure>
          ))}
        </div>
        <ul className="grid list-disc gap-1 ps-5 text-muted-foreground">
          <li>{t("ruleBeside")}</li>
          <li>{t("ruleBulb")}</li>
          <li>{t("ruleColors")}</li>
        </ul>
        <div className="grid gap-2">
          <p className="font-medium">{t("link")}</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="break-all text-muted-foreground" dir="ltr">
              {link}
            </span>
            <CopyButton text={link} />
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          {/* biome-ignore lint/performance/noImgElement: a generated SVG. */}
          <img
            alt={t("qrAlt")}
            className="size-32 rounded-md border"
            height={128}
            src={qr}
            width={128}
          />
          <div className="grid gap-2">
            <p className="text-muted-foreground">{t("qrHint")}</p>
            <Button asChild size="sm" variant="outline">
              <a download="the-idea-shop-qr.svg" href={qr}>
                <DownloadIcon aria-hidden="true" />
                {t("qrDownload")}
              </a>
            </Button>
          </div>
        </div>
        <div className="grid gap-2">
          <p className="font-medium">{t("snippet")}</p>
          <pre
            className="overflow-x-auto rounded-md bg-muted p-3 text-xs"
            dir="ltr"
          >
            <code>{snippet}</code>
          </pre>
          <div>
            <CopyButton text={snippet} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

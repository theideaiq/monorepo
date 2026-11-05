"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { fonts } from "@repo/design-system/lib/fonts";
import {
  defaultLocale,
  getDirection,
  isLocale,
} from "@repo/internationalization/config";
import { captureError } from "@repo/observability/client";
import type NextError from "next/error";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import "./[locale]/styles.css";

interface GlobalErrorProperties {
  readonly error: NextError & { digest?: string };
  readonly reset: () => void;
}

interface Texts {
  error: string;
  errorDescription: string;
  retry: string;
}

/**
 * The messages load only when this page shows: imported at the top, both
 * languages' files would be in every page's JavaScript.
 */
const loadTexts = async (locale: "ar" | "en"): Promise<Texts> =>
  locale === "en"
    ? (await import("@repo/internationalization/messages/en.json")).common
    : (await import("@repo/internationalization/messages/ar.json")).common;

const NO_TEXTS: Texts = { error: "", errorDescription: "", retry: "↻" };

/** Replaces the root layout, so it reads the language from the URL itself. */
const GlobalError = ({ error, reset }: GlobalErrorProperties) => {
  const [, segment] = usePathname().split("/");
  // The default language has no prefix; Kurdish falls back to Arabic.
  const locale = isLocale(segment) ? segment : defaultLocale;
  const language = locale === "en" ? "en" : "ar";
  // Until the messages arrive (or if they can't), only the retry button shows.
  const [texts, setTexts] = useState<Texts>(NO_TEXTS);

  useEffect(() => {
    captureError(error);
  }, [error]);

  useEffect(() => {
    loadTexts(language)
      .then(setTexts)
      .catch(() => {
        // Offline: the retry button still works.
      });
  }, [language]);

  return (
    <html className={fonts} dir={getDirection(locale)} lang={locale}>
      <body className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="font-semibold text-2xl">{texts.error}</h1>
        <p className="text-muted-foreground">{texts.errorDescription}</p>
        <Button onClick={() => reset()}>{texts.retry}</Button>
      </body>
    </html>
  );
};

export default GlobalError;

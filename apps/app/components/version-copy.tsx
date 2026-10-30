"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

/**
 * "Version 2.4.0 · build abc123": tapping it copies both, for support.
 */
export const VersionCopy = ({ text }: { readonly text: string }) => {
  const t = useTranslations("web.info");
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // The clipboard isn't available: the text stays on screen to read.
    }
  };

  return (
    <button
      aria-label={t("copyVersion")}
      className="text-start text-muted-foreground text-xs hover:text-foreground"
      dir="ltr"
      onClick={copy}
      type="button"
    >
      {text}
      <span aria-live="polite" className="ms-2">
        {copied ? t("versionCopied") : null}
      </span>
    </button>
  );
};

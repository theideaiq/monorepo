"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { isNativeApp } from "@/lib/platform";

/** Inside the iOS/Android apps, the installed app's version (none on the web). */
export const NativeAppVersion = () => {
  const t = useTranslations("web.info");
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    if (!isNativeApp()) {
      return;
    }
    import("@capacitor/app")
      .then(({ App }) => App.getInfo())
      .then((info) => setVersion(`${info.version} (${info.build})`))
      .catch(() => setVersion(null));
  }, []);

  return version ? <p dir="ltr">{t("appVersion", { version })}</p> : null;
};

"use client";

import { localePath } from "@repo/internationalization";
import {
  Status,
  type StatusLabels,
  type SystemStatus,
} from "@repo/observability/status";
import { useLocale } from "next-intl";
import { useEffect, useState } from "react";

/**
 * The footer's status badge. apps/api reads Better Stack (its token stays
 * there) and answers 204 when it isn't configured, which hides the badge.
 * It opens the website's own status page (`/status`), in the reader's
 * language.
 */
export const SystemStatusBadge = ({
  apiUrl,
  labels,
}: {
  readonly apiUrl: string | undefined;
  readonly labels: StatusLabels;
}) => {
  const locale = useLocale();
  const [status, setStatus] = useState<SystemStatus | null>(null);

  useEffect(() => {
    if (!apiUrl) {
      return;
    }
    const controller = new AbortController();
    fetch(`${apiUrl}/status`, { signal: controller.signal })
      .then((response) =>
        response.status === 200
          ? (response.json() as Promise<SystemStatus>)
          : null
      )
      .then(setStatus)
      .catch(() => {
        // Unreachable API: no badge.
      });
    return () => controller.abort();
  }, [apiUrl]);

  return status ? (
    <Status
      href={localePath(locale, "/status")}
      labels={labels}
      status={status}
    />
  ) : null;
};

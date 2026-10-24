"use client";

import {
  Status,
  type StatusLabels,
  type SystemStatus,
} from "@repo/observability/status";
import { useEffect, useState } from "react";

/**
 * The footer's status badge. apps/api reads Better Stack (its token stays
 * there) and answers 204 when it isn't configured, which hides the badge.
 */
export const SystemStatusBadge = ({
  apiUrl,
  labels,
}: {
  readonly apiUrl: string | undefined;
  readonly labels: StatusLabels;
}) => {
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

  return status ? <Status labels={labels} status={status} /> : null;
};

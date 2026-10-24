import type { SystemStatus } from "./types";

export type { SystemStatus } from "./types";

export interface StatusLabels {
  degraded: string;
  operational: string;
  partial: string;
  unknown: string;
}

const colors: Record<SystemStatus["state"], string> = {
  degraded: "bg-destructive",
  operational: "bg-success",
  partial: "bg-warning",
  unknown: "bg-muted-foreground",
};

interface StatusProps {
  /** Translated texts. */
  readonly labels: StatusLabels;
  /** From `GET /status` on apps/api (`fetchStatus` in ./server). */
  readonly status: SystemStatus;
}

/** A dot and a label linking to the public status page. */
export const Status = ({ labels, status }: StatusProps) => {
  const color = colors[status.state];
  return (
    <a
      className="flex items-center gap-3 font-medium text-sm"
      href={status.url}
      rel="noreferrer"
      target="_blank"
    >
      <span className="relative flex h-2 w-2">
        <span
          className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${color}`}
        />
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${color}`}
        />
      </span>
      <span className="text-muted-foreground">{labels[status.state]}</span>
    </a>
  );
};

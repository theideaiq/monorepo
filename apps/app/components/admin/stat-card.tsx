import { cn } from "@repo/design-system/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "@/lib/admin/navigation";

interface StatCardProps {
  readonly className?: string;
  readonly hint?: ReactNode;
  readonly href?: string;
  readonly icon?: LucideIcon;
  readonly label: ReactNode;
  readonly tone?: "default" | "attention";
  readonly value: ReactNode;
}

/** A key number with its label, optionally linking to the list behind it. */
export const StatCard = ({
  className,
  hint,
  href,
  icon: Icon,
  label,
  tone = "default",
  value,
}: StatCardProps) => {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2 text-muted-foreground text-sm">
        <span>{label}</span>
        {Icon ? (
          <Icon
            className={cn(
              "size-4",
              tone === "attention" ? "text-pink-text" : "text-muted-foreground"
            )}
          />
        ) : null}
      </div>
      <div className="font-semibold text-2xl tabular-nums tracking-tight">
        {value}
      </div>
      {hint ? (
        <div className="text-muted-foreground text-xs">{hint}</div>
      ) : null}
    </>
  );
  const classes = cn(
    "grid gap-1 rounded-lg border bg-card p-4 text-card-foreground",
    href && "transition-colors hover:border-primary/50 hover:bg-accent/40",
    className
  );

  return href ? (
    <Link className={classes} href={href}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  );
};

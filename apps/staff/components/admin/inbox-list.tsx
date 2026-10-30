"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Kbd } from "@repo/design-system/components/ui/kbd";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@repo/design-system/components/ui/sheet";
import { cn } from "@repo/design-system/lib/utils";
import { ArrowUpRightIcon, ClockIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type InboxRow,
  isLate,
  stepSelection,
  waitingFor,
} from "@/lib/admin/inbox-kinds";
import { Link } from "@/lib/admin/navigation";

export interface InboxListItem {
  actions: ReactNode;
  facts: ReactNode;
  row: InboxRow;
}

const FIELDS = new Set(["INPUT", "SELECT", "TEXTAREA"]);

/** J is the next row, K the one before; anything else isn't ours. */
const stepKey = (event: KeyboardEvent): 1 | -1 | null => {
  if (event.metaKey || event.ctrlKey || event.altKey) {
    return null;
  }
  const key = event.key.toLowerCase();
  if (key === "j") {
    return 1;
  }
  return key === "k" ? -1 : null;
};

/**
 * Keys typed into a field never move the list, nor do keys in another
 * dialog (the command bar); in the Inbox's own drawer they do.
 */
const ignored = (target: EventTarget | null, drawerOpen: boolean) => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  if (target.isContentEditable || FIELDS.has(target.tagName)) {
    return true;
  }
  return !drawerOpen && target.closest("[role=dialog]") !== null;
};

/**
 * The Inbox's list: one row per decision, oldest first, with how long it
 * has waited and its owner. A row opens a drawer with its facts and its
 * actions (the same Server Actions as its page) and a link to the full
 * record. J and K move, Enter opens, Escape closes.
 */
export const InboxList = ({
  items,
  now,
}: {
  readonly items: readonly InboxListItem[];
  /** The server's time when the page was made (ISO), for "time waiting". */
  readonly now: string;
}) => {
  const t = useTranslations("admin.dashboard.inbox");
  const locale = useLocale();
  const [selected, setSelected] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());
  const lastIndex = useRef(0);
  const keys = useMemo(() => items.map((item) => item.row.key), [items]);
  const current = items.find((item) => item.row.key === selected) ?? null;
  const clock = new Date(now);

  // After an action the item leaves the list: move to the one that took
  // its place (or close the drawer when the list is empty).
  useEffect(() => {
    if (selected === null) {
      return;
    }
    const index = keys.indexOf(selected);
    if (index !== -1) {
      lastIndex.current = index;
      return;
    }
    const next = keys[Math.min(lastIndex.current, keys.length - 1)] ?? null;
    setSelected(next);
    if (!next) {
      setOpen(false);
    }
  }, [keys, selected]);

  const select = useCallback((key: string | null) => {
    setSelected(key);
    if (key) {
      rowRefs.current.get(key)?.focus();
    }
  }, []);

  // J and K move (rows are buttons, so Enter on the focused row opens it);
  // in the open drawer they step to the next item there.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const step = stepKey(event);
      if (step === null || ignored(event.target, open)) {
        return;
      }
      event.preventDefault();
      const next = stepSelection(keys, selected, step);
      if (open) {
        setSelected(next);
      } else {
        select(next);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [keys, open, select, selected]);

  const waiting = (since: string) => {
    const { unit, value } = waitingFor(since, clock);
    return t(`waiting.${unit}`, { count: String(value) });
  };

  return (
    <>
      <p className="hidden items-center gap-1.5 text-muted-foreground text-xs md:flex">
        <Kbd>J</Kbd>
        <Kbd>K</Kbd>
        {t("keyboard")}
      </p>
      <ul aria-label={t("listLabel")} className="divide-y rounded-lg border">
        {items.map(({ row }) => {
          const late = isLate(row.since, clock);
          return (
            <li key={row.key}>
              <button
                aria-current={row.key === selected ? "true" : undefined}
                className={cn(
                  "grid min-h-11 w-full gap-1 px-4 py-3 text-start text-sm transition-colors hover:bg-accent/50 focus-visible:bg-accent/60 focus-visible:outline-none sm:grid-cols-[1fr_auto_9rem] sm:items-center sm:gap-4",
                  row.key === selected && "bg-accent/60"
                )}
                onClick={() => {
                  setSelected(row.key);
                  setOpen(true);
                }}
                onFocus={() => setSelected(row.key)}
                ref={(node) => {
                  if (node) {
                    rowRefs.current.set(row.key, node);
                  } else {
                    rowRefs.current.delete(row.key);
                  }
                }}
                type="button"
              >
                <span className="grid min-w-0 gap-0.5">
                  <span className="text-muted-foreground text-xs">
                    {row.subtype}
                  </span>
                  <span className="truncate font-medium" dir="auto">
                    {row.title}
                  </span>
                  {row.detail ? (
                    <span
                      className="truncate text-muted-foreground text-xs"
                      dir="auto"
                    >
                      {row.detail}
                    </span>
                  ) : null}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 whitespace-nowrap text-xs tabular-nums",
                    late ? "font-medium text-warning" : "text-muted-foreground"
                  )}
                >
                  <ClockIcon aria-hidden="true" className="size-3.5" />
                  {late
                    ? t("waitingLate", { time: waiting(row.since) })
                    : waiting(row.since)}
                </span>
                <span className="truncate text-muted-foreground text-xs">
                  {row.assigneeName ??
                    (row.kind === "support" || row.kind === "submissions"
                      ? t("unassigned")
                      : t("noOwner"))}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <Sheet
        onOpenChange={(next) => {
          setOpen(next);
          if (!next && selected) {
            rowRefs.current.get(selected)?.focus();
          }
        }}
        open={open && current !== null}
      >
        <SheetContent
          className="w-full gap-0 overflow-y-auto sm:max-w-xl"
          side={locale === "ar" ? "left" : "right"}
        >
          {current ? (
            <>
              <SheetHeader className="border-b">
                <SheetDescription>
                  {current.row.subtype}
                  {" · "}
                  {waiting(current.row.since)}
                </SheetDescription>
                <SheetTitle className="text-lg" dir="auto">
                  {current.row.title}
                </SheetTitle>
                <Button asChild className="w-fit" size="sm" variant="outline">
                  <Link href={current.row.href}>
                    {t("openRecord")}
                    <ArrowUpRightIcon className="rtl:-scale-x-100" />
                  </Link>
                </Button>
              </SheetHeader>
              <div className="grid gap-6 p-4" key={current.row.key}>
                {current.facts}
                {current.actions ? (
                  <section
                    aria-label={t("actions")}
                    className="grid gap-3 border-t pt-4"
                  >
                    <h3 className="font-medium text-sm">{t("actions")}</h3>
                    {current.actions}
                  </section>
                ) : null}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
};

"use client";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@repo/design-system/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import { Kbd } from "@repo/design-system/components/ui/kbd";
import { Spinner } from "@repo/design-system/components/ui/spinner";
import {
  type CommandBarGroup,
  type CommandBarItem,
  matchPages,
} from "@repo/design-system/lib/command-bar";
import { cn } from "@repo/design-system/lib/utils";
import { CornerDownLeftIcon, SearchIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export type {
  CommandBarGroup,
  CommandBarItem,
} from "@repo/design-system/lib/command-bar";
export { matchPages } from "@repo/design-system/lib/command-bar";

/** Every word the bar shows; the app passes them already translated. */
export interface CommandBarLabels {
  description: string;
  empty: string;
  pages: string;
  placeholder: string;
  searching: string;
  title: string;
}

const OPEN_EVENT = "command-bar:open";

const APPLE = /mac|iphone|ipad/i;

/** Opens the command bar from anywhere (a button, a menu item). */
export const openCommandBar = () => {
  window.dispatchEvent(new Event(OPEN_EVENT));
};

const isMac = () =>
  typeof navigator !== "undefined" && APPLE.test(navigator.userAgent);

/** The shortcut as the visitor's keyboard writes it: ⌘K or Ctrl K. */
const useShortcutLabel = () => {
  const [label, setLabel] = useState("Ctrl K");
  useEffect(() => {
    setLabel(isMac() ? "⌘K" : "Ctrl K");
  }, []);
  return label;
};

/**
 * A button that opens the command bar, showing its shortcut. Put it in
 * the top bar; the bar itself is rendered once by `CommandBar`.
 */
export const CommandBarTrigger = ({
  className,
  label,
}: {
  readonly className?: string;
  readonly label: string;
}) => {
  const shortcut = useShortcutLabel();
  return (
    <button
      aria-keyshortcuts="Control+K Meta+K"
      className={cn(
        "inline-flex h-9 min-w-9 items-center gap-2 rounded-md border bg-background px-2.5 text-muted-foreground text-sm transition-colors hover:bg-accent hover:text-foreground md:w-56",
        className
      )}
      onClick={openCommandBar}
      type="button"
    >
      <SearchIcon aria-hidden="true" className="size-4 shrink-0" />
      <span className="sr-only md:not-sr-only md:flex-1 md:text-start">
        {label}
      </span>
      <Kbd className="hidden md:inline-flex" dir="ltr">
        {shortcut}
      </Kbd>
    </button>
  );
};

interface CommandBarProps {
  readonly labels: CommandBarLabels;
  /** Searching starts at this many characters (2 by default). */
  readonly minSearchLength?: number;
  /** Goes to a page or result (the app's router, so locales are kept). */
  readonly onNavigate: (href: string) => void;
  /** The pages to jump to, shown first and filtered as you type. */
  readonly pages: readonly CommandBarItem[];
  /**
   * Looks the query up (e.g. a Server Action): orders by number,
   * products, customers. The bar does no fetching of its own.
   */
  readonly search?: (query: string) => Promise<CommandBarGroup[]>;
}

/**
 * The command bar (Ctrl/⌘K): jump to a page, or search through what the
 * app's `search` returns, then Enter to go there. It holds no data of its
 * own, so any app can use it with its pages and its search.
 */
export const CommandBar = ({
  labels,
  minSearchLength = 2,
  onNavigate,
  pages,
  search,
}: CommandBarProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<CommandBarGroup[]>([]);
  const [searching, setSearching] = useState(false);
  const latest = useRef(0);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        event.key.toLowerCase() === "k" &&
        (event.metaKey || event.ctrlKey) &&
        !event.altKey
      ) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, []);

  // Searches a moment after typing stops; older answers are dropped.
  useEffect(() => {
    const trimmed = query.trim();
    if (!(search && trimmed.length >= minSearchLength)) {
      setGroups([]);
      setSearching(false);
      return;
    }
    const ticket = latest.current + 1;
    latest.current = ticket;
    setSearching(true);
    const timer = window.setTimeout(() => {
      search(trimmed)
        .then((found) => {
          if (latest.current === ticket) {
            setGroups(found.filter((group) => group.items.length > 0));
          }
        })
        .catch(() => {
          if (latest.current === ticket) {
            setGroups([]);
          }
        })
        .finally(() => {
          if (latest.current === ticket) {
            setSearching(false);
          }
        });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [minSearchLength, query, search]);

  const close = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) {
      setQuery("");
      setGroups([]);
    }
  }, []);

  const go = (href: string) => {
    close(false);
    onNavigate(href);
  };

  const matched = matchPages(pages, query);
  const nothing = !searching && matched.length === 0 && groups.length === 0;

  return (
    <Dialog onOpenChange={close} open={open}>
      <DialogContent className="overflow-hidden p-0" showCloseButton={false}>
        <DialogHeader className="sr-only">
          <DialogTitle>{labels.title}</DialogTitle>
          <DialogDescription>{labels.description}</DialogDescription>
        </DialogHeader>
        <Command
          className="**:data-[slot=command-input-wrapper]:h-12 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-item]]:min-h-11 [&_[cmdk-item]]:px-2"
          loop
          shouldFilter={false}
        >
          <CommandInput
            onValueChange={setQuery}
            placeholder={labels.placeholder}
            value={query}
          />
          <CommandList className="max-h-[min(60vh,28rem)]">
            {nothing ? <CommandEmpty>{labels.empty}</CommandEmpty> : null}
            {matched.length > 0 ? (
              <CommandGroup heading={labels.pages}>
                {matched.map((page) => (
                  <CommandItem
                    key={page.id}
                    onSelect={() => go(page.href)}
                    value={`page:${page.id}`}
                  >
                    <span className="flex-1 truncate">{page.label}</span>
                    {page.detail ? (
                      <span className="truncate text-muted-foreground text-xs">
                        {page.detail}
                      </span>
                    ) : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
            {groups.map((group) => (
              <CommandGroup heading={group.heading} key={group.id}>
                {group.items.map((item) => (
                  <CommandItem
                    key={item.id}
                    onSelect={() => go(item.href)}
                    value={`${group.id}:${item.id}`}
                  >
                    <span className="flex-1 truncate" dir="auto">
                      {item.label}
                    </span>
                    {item.detail ? (
                      <span
                        className="max-w-[40%] truncate text-muted-foreground text-xs"
                        dir="auto"
                      >
                        {item.detail}
                      </span>
                    ) : null}
                    <CornerDownLeftIcon
                      aria-hidden="true"
                      className="in-data-[selected=true]:block hidden size-3.5 opacity-50 rtl:-scale-x-100"
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
            {searching ? (
              <div
                aria-live="polite"
                className="flex items-center justify-center gap-2 py-4 text-muted-foreground text-sm"
              >
                <Spinner />
                {labels.searching}
              </div>
            ) : null}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
};

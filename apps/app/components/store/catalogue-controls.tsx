"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@repo/design-system/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@repo/design-system/components/ui/sheet";
import { useRouter } from "@repo/internationalization/navigation";
import { ArrowDownUpIcon, SlidersHorizontalIcon } from "lucide-react";
import type { ReactNode } from "react";

/** "Filter (n)" on phones: the grid's filters in a sheet from the bottom. */
export const FilterSheet = ({
  children,
  label,
  title,
}: {
  readonly children: ReactNode;
  /** "Filter (2)". */
  readonly label: string;
  readonly title: string;
}) => (
  <Sheet>
    <SheetTrigger asChild>
      <Button className="lg:hidden" size="sm" variant="outline">
        <SlidersHorizontalIcon />
        {label}
      </Button>
    </SheetTrigger>
    <SheetContent className="max-h-[85vh] overflow-y-auto" side="bottom">
      <SheetHeader>
        <SheetTitle>{title}</SheetTitle>
      </SheetHeader>
      <div className="px-4 pb-6">{children}</div>
    </SheetContent>
  </Sheet>
);

/** The sort, at the end of the grid's header: each choice is an address. */
export const SortMenu = ({
  current,
  label,
  options,
}: {
  readonly current: string;
  readonly label: string;
  readonly options: readonly { href: string; label: string; value: string }[];
}) => {
  const router = useRouter();
  const chosen = options.find((option) => option.value === current);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-label={label} size="sm" variant="ghost">
          <ArrowDownUpIcon />
          {chosen?.label ?? label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          onValueChange={(value) => {
            const option = options.find((item) => item.value === value);
            if (option) {
              router.push(option.href, { scroll: false });
            }
          }}
          value={current}
        >
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { ScanLineIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useState } from "react";

/**
 * Counter mode on the Inbox: a button that opens "Check a Pass" (scan or
 * type a member's card) above the list, for staff at the counter.
 */
export const CounterMode = ({ children }: { readonly children: ReactNode }) => {
  const t = useTranslations("admin.dashboard.counter");
  const [on, setOn] = useState(false);

  return (
    <div className="grid gap-3">
      <Button
        aria-expanded={on}
        className="w-fit"
        onClick={() => setOn((value) => !value)}
        variant={on ? "secondary" : "outline"}
      >
        {on ? <XIcon /> : <ScanLineIcon />}
        {on ? t("close") : t("open")}
      </Button>
      {on ? children : null}
    </div>
  );
};

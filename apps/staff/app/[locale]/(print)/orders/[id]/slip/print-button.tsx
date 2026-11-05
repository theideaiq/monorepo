"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { PrinterIcon } from "lucide-react";
import { useTranslations } from "next-intl";

/** Prints the slip; hidden on paper. */
export const PrintButton = () => {
  const t = useTranslations("admin.orders.slip");
  return (
    <Button className="print:hidden" onClick={() => window.print()}>
      <PrinterIcon aria-hidden="true" />
      {t("print")}
    </Button>
  );
};

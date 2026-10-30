"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Link } from "@repo/internationalization/navigation";
import { FileSpreadsheetIcon, PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useActiveOrganization } from "@/components/organization-provider";
import { useSeller } from "@/lib/seller-queries";

/**
 * The header's actions on Today and Listings, for owners and admins of an
 * approved shop: "Upload a sheet", then the primary "List an item" at the
 * end.
 */
export const ListActions = ({
  onPage = false,
}: {
  /** On Listings itself, the actions jump to the forms below. */
  readonly onPage?: boolean;
}) => {
  const t = useTranslations("app.company.listings");
  const { active, canManage } = useActiveOrganization();
  const selling = active.features.includes("selling");
  const shop = useSeller(active.id, selling);
  if (!(canManage && shop.data?.seller.status === "approved")) {
    return null;
  }
  const to = (anchor: string, children: ReactNode) =>
    onPage ? (
      <a href={`#${anchor}`}>{children}</a>
    ) : (
      <Link href={`/sell/listings#${anchor}`}>{children}</Link>
    );
  return (
    <>
      <Button asChild variant="outline">
        {to(
          "upload",
          <>
            <FileSpreadsheetIcon aria-hidden="true" />
            {t("uploadSheet")}
          </>
        )}
      </Button>
      <Button asChild>
        {to(
          "list",
          <>
            <PlusIcon aria-hidden="true" />
            {t("listItem")}
          </>
        )}
      </Button>
    </>
  );
};

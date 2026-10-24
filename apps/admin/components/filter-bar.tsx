import { Button } from "@repo/design-system/components/ui/button";
import { SearchIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

/**
 * A GET form for list filters: submitting reloads the page with the values
 * in the query string (and back to page 1).
 */
export const FilterBar = async ({
  children,
}: {
  readonly children: ReactNode;
}) => {
  const t = await getTranslations("admin.list");

  return (
    <form className="flex flex-wrap items-end gap-2" method="get">
      {children}
      <Button type="submit" variant="secondary">
        <SearchIcon />
        {t("apply")}
      </Button>
    </form>
  );
};

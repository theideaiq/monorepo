"use client";

import {
  CommandBar,
  CommandBarTrigger,
} from "@repo/design-system/components/command-bar";
import { useTranslations } from "next-intl";
import type { CommandPage } from "@/lib/admin/command-pages";
import { useRouter } from "@/lib/admin/navigation";
import { searchConsole } from "@/lib/admin/search-actions";

/**
 * Staff's command bar (Ctrl/⌘K), rendered once by the console layout:
 * the role's pages, and orders, products and customers through the same
 * search as /search.
 */
export const ConsoleCommandBar = ({
  pages,
}: {
  readonly pages: readonly CommandPage[];
}) => {
  const t = useTranslations("admin");
  const router = useRouter();

  return (
    <CommandBar
      labels={{
        description: t("command.description"),
        empty: t("command.empty"),
        pages: t("command.pagesHeading"),
        placeholder: t("command.placeholder"),
        searching: t("command.searching"),
        title: t("command.title"),
      }}
      onNavigate={(href) => router.push(href)}
      pages={pages.map((page) =>
        page.kind === "section"
          ? {
              href: page.href,
              id: page.id,
              keywords: [t(`nav.${page.section}`)],
              label: t(`nav.${page.section}`),
            }
          : {
              detail: t(`nav.${page.section}`),
              href: page.href,
              id: page.id,
              keywords: [t(`nav.${page.section}`)],
              label: t(`command.pages.${page.id}`),
            }
      )}
      search={searchConsole}
    />
  );
};

/** The top bar's button for the command bar. */
export const CommandTrigger = () => {
  const t = useTranslations("admin.command");
  return <CommandBarTrigger className="ms-auto" label={t("open")} />;
};

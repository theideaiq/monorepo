"use client";

import {
  CommandBar,
  CommandBarTrigger,
} from "@repo/design-system/components/command-bar";
import { useRouter } from "@repo/internationalization/navigation";
import { useTranslations } from "next-intl";
import { navGroups } from "./nav-items";

/** Partners' command bar (Ctrl/⌘K): jump to any page in the menu. */
export const PartnersCommandBar = () => {
  const t = useTranslations("app.nav");
  const router = useRouter();
  return (
    <CommandBar
      labels={{
        description: t("command.description"),
        empty: t("command.empty"),
        pages: t("command.pages"),
        placeholder: t("command.placeholder"),
        searching: t("command.searching"),
        title: t("command.title"),
      }}
      onNavigate={(href) => router.push(href)}
      pages={navGroups.flatMap((group) =>
        group.items.map((item) => ({
          detail: group.key === "today" ? undefined : t(group.key),
          href: item.href,
          id: item.key,
          keywords: [t(group.key)],
          label: t(item.key),
        }))
      )}
    />
  );
};

/** The header's button for the command bar. */
export const CommandTrigger = () => {
  const t = useTranslations("app.nav.command");
  return <CommandBarTrigger label={t("open")} />;
};

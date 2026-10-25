import { cn } from "@repo/design-system/lib/utils";
import type { Locale } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { getTranslations } from "next-intl/server";
import { type PostSection, postSections, sectionPath } from "@/lib/post";

/** The IDEA Post's sections as tabs, with "Everything" first. */
export const PostSections = async ({
  current,
  locale,
}: {
  readonly current?: PostSection;
  readonly locale: Locale;
}) => {
  const t = await getTranslations({ locale, namespace: "web.post" });
  const tabs = [
    { active: !current, href: "/post", label: t("all") },
    ...postSections.map((section) => ({
      active: current === section,
      href: sectionPath(section),
      label: t(`sections.${section}.title`),
    })),
  ];
  return (
    <nav aria-label={t("title")} className="-mx-4 overflow-x-auto px-4">
      <ul className="flex gap-2">
        {tabs.map((tab) => (
          <li className="shrink-0" key={tab.href}>
            <Link
              aria-current={tab.active ? "page" : undefined}
              className={cn(
                "inline-flex rounded-full border px-4 py-1.5 font-medium text-sm transition-colors hover:bg-muted",
                tab.active &&
                  "border-primary bg-primary text-primary-foreground hover:bg-primary"
              )}
              href={tab.href}
            >
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
};

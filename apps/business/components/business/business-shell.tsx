"use client";

import { OrganizationSwitcher } from "@repo/auth/components/organization-switcher";
import { Button } from "@repo/design-system/components/ui/button";
import { cn } from "@repo/design-system/lib/utils";
import {
  Link,
  usePathname,
  useRouter,
} from "@repo/internationalization/navigation";
import { BriefcaseBusinessIcon, PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useOrganization } from "@/components/organization-provider";
import { PageHeader } from "@/components/page-header";
import { useAuthMessages } from "@/lib/auth-messages";
import { useMyPartners } from "@/lib/perk-queries";
import { PendingInvitations } from "./pending-invitations";

const TABS = [
  { href: "/", key: "overview" },
  { href: "/procurement", key: "procurement" },
  { href: "/hiring", key: "hiring" },
  { href: "/invoices", key: "invoices" },
  { href: "/plus", key: "plus" },
  { href: "/members", key: "members" },
  { href: "/perks", key: "perks" },
  { href: "/billing", key: "billing" },
  { href: "/settings", key: "settings" },
] as const;

/** For people without a business account: what it is, invitations, create. */
const BusinessIntro = () => {
  const t = useTranslations("app.business");

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <section className="grid gap-4 rounded-lg border bg-surface-sunken p-6">
        <BriefcaseBusinessIcon className="size-8 text-pink-text" />
        <div className="grid gap-2">
          <h2 className="font-semibold text-xl tracking-tight">
            {t("intro.title")}
          </h2>
          <p className="text-muted-foreground">{t("intro.description")}</p>
        </div>
        <Button asChild className="justify-self-start">
          <Link href="/new">
            <PlusIcon />
            {t("intro.create")}
          </Link>
        </Button>
      </section>
      <PendingInvitations onJoined={() => undefined} />
    </div>
  );
};

/**
 * The Business (The IDEA Business) section: the organization switcher and tabs
 * around a screen that needs an active organization. Without one, it shows
 * the introduction instead.
 */
export const BusinessShell = ({
  children,
}: {
  readonly children: ReactNode;
}) => {
  const t = useTranslations("app.business");
  const router = useRouter();
  const pathname = usePathname();
  const authMessages = useAuthMessages();
  const { active, organizations, select } = useOrganization();
  // Partners (organizations with perks) check Pass cards from Perks.
  const partners = useMyPartners();

  return (
    <>
      <PageHeader title={t("title")} />
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        {active ? (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="w-full sm:w-64">
                <OrganizationSwitcher
                  activeId={active.id}
                  messages={authMessages}
                  onCreate={() => router.push("/new")}
                  onSelect={select}
                  organizations={organizations}
                />
              </div>
              <nav
                aria-label={t("title")}
                className="-mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0"
              >
                {TABS.filter(
                  (tab) =>
                    tab.key !== "perks" ||
                    partners.data?.some(
                      (row) => row.organization_id === active.id
                    )
                ).map((tab) => {
                  const current =
                    pathname === tab.href ||
                    (tab.href !== "/" && pathname.startsWith(`${tab.href}/`));
                  return (
                    <Link
                      aria-current={current ? "page" : undefined}
                      className={cn(
                        "shrink-0 rounded-md px-3 py-1.5 text-sm transition-colors",
                        current
                          ? "bg-accent font-medium text-accent-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      href={tab.href}
                      key={tab.key}
                    >
                      {t(`tabs.${tab.key}`)}
                    </Link>
                  );
                })}
              </nav>
            </div>
            {children}
          </>
        ) : (
          <>
            <p className="text-muted-foreground">{t("description")}</p>
            <BusinessIntro />
          </>
        )}
      </div>
    </>
  );
};

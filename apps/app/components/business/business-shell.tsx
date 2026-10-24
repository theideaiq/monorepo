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
import { PendingInvitations } from "./pending-invitations";

const TABS = [
  { href: "/business", key: "projects" },
  { href: "/business/members", key: "members" },
  { href: "/business/billing", key: "billing" },
  { href: "/business/settings", key: "settings" },
] as const;

/** For people without a business account: what it is, invitations, create. */
const BusinessIntro = () => {
  const t = useTranslations("app.business");

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <section className="grid gap-4 rounded-lg border bg-gradient-to-br from-primary/10 to-brand/10 p-6">
        <BriefcaseBusinessIcon className="size-8 text-primary" />
        <div className="grid gap-2">
          <h2 className="font-semibold text-xl tracking-tight">
            {t("intro.title")}
          </h2>
          <p className="text-muted-foreground">{t("intro.description")}</p>
        </div>
        <Button asChild className="justify-self-start">
          <Link href="/business/new">
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
 * The Business (The IDEA Suite) section: the organization switcher and tabs
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
                  onCreate={() => router.push("/business/new")}
                  onSelect={select}
                  organizations={organizations}
                />
              </div>
              <nav
                aria-label={t("title")}
                className="-mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0"
              >
                {TABS.map((tab) => {
                  const current = pathname === tab.href;
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

"use client";

import type { OrganizationFeature } from "@repo/auth/organizations";
import { Button } from "@repo/design-system/components/ui/button";
import { cn } from "@repo/design-system/lib/utils";
import { Link, usePathname } from "@repo/internationalization/navigation";
import { BriefcaseBusinessIcon, PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useOrganization } from "@/components/organization-provider";
import { PageHeader } from "@/components/page-header";
import { PendingInvitations } from "./pending-invitations";

/** The pages of Organization, as tabs. */
const ORGANIZATION_TABS = [
  { href: "/organization", key: "details" },
  { href: "/organization/members", key: "members" },
  { href: "/organization/billing", key: "billing" },
  { href: "/organization/invoices", key: "invoices" },
] as const;

/** The pages of Team, as tabs: bulk orders, and Plus for its people. */
const TEAM_TABS = [
  { href: "/team", key: "orders" },
  { href: "/team/plus", key: "plus" },
] as const;

/** The pages of Selling, as tabs. */
const SELLING_TABS = [
  { href: "/selling", key: "shop" },
  { href: "/selling/listings", key: "listings" },
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

type TabKey =
  | (typeof ORGANIZATION_TABS)[number]["key"]
  | (typeof SELLING_TABS)[number]["key"]
  | (typeof TEAM_TABS)[number]["key"];

const SectionTabs = ({
  label,
  tabs,
}: {
  readonly label: string;
  readonly tabs: readonly { href: string; key: TabKey }[];
}) => {
  const t = useTranslations("app.business");
  const pathname = usePathname();
  return (
    <nav
      aria-label={label}
      className="-mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0"
    >
      {tabs.map((tab) => {
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
  );
};

/** A section the organization hasn't switched on. */
const SectionOff = ({ feature }: { readonly feature: OrganizationFeature }) => {
  const t = useTranslations("app");
  const { active, canManage } = useOrganization();
  return (
    <div className="grid max-w-xl gap-2">
      <p>
        {t("business.sections.off", {
          organization: active?.name ?? "",
          section: t(`nav.${feature}`),
        })}
      </p>
      {canManage ? (
        <Link className="text-sm underline" href="/">
          {t("business.sections.offManage")}
        </Link>
      ) : (
        <p className="text-muted-foreground text-sm">
          {t("business.sections.offAsk")}
        </p>
      )}
    </div>
  );
};

interface BusinessShellProps {
  readonly children: ReactNode;
  /** The section the screen belongs to, when organizations add it. */
  readonly feature?: OrganizationFeature;
  /** Organization's pages show its tabs. */
  readonly organization?: boolean;
}

/**
 * A screen of The IDEA Partners that needs an active organization (chosen
 * in the sidebar). Without one, it shows the introduction instead; in a
 * section the organization hasn't added, it says so.
 */
export const BusinessShell = ({
  children,
  feature,
  organization = false,
}: BusinessShellProps) => {
  const t = useTranslations("app");
  const { active } = useOrganization();
  let title = t("business.title");
  if (feature) {
    title = t(`nav.${feature}`);
  } else if (organization) {
    title = t("nav.organization");
  }

  let content: ReactNode;
  if (!active) {
    content = (
      <>
        <p className="text-muted-foreground">{t("business.description")}</p>
        <BusinessIntro />
      </>
    );
  } else if (feature && !active.features.includes(feature)) {
    content = <SectionOff feature={feature} />;
  } else {
    content = (
      <>
        {organization ? (
          <SectionTabs
            label={t("business.organization.title")}
            tabs={ORGANIZATION_TABS}
          />
        ) : null}
        {feature === "selling" ? (
          <SectionTabs label={t("nav.selling")} tabs={SELLING_TABS} />
        ) : null}
        {feature === "team" ? (
          <SectionTabs label={t("nav.team")} tabs={TEAM_TABS} />
        ) : null}
        {children}
      </>
    );
  }

  return (
    <>
      <PageHeader title={title} />
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">{content}</div>
    </>
  );
};

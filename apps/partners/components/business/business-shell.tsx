"use client";

import type { OrganizationFeature } from "@repo/auth/organizations";
import { Button } from "@repo/design-system/components/ui/button";
import { cn } from "@repo/design-system/lib/utils";
import { Link, usePathname } from "@repo/internationalization/navigation";
import { BriefcaseBusinessIcon, PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { ADD_SECTIONS_HREF, type NavKey } from "@/components/nav-items";
import { useOrganization } from "@/components/organization-provider";
import { PageHeader } from "@/components/page-header";
import { PendingInvitations } from "./pending-invitations";

/** The pages of Organization → Settings, as tabs. */
const ORGANIZATION_TABS = [
  { href: "/settings", key: "details" },
  { href: "/settings/members", key: "members" },
  { href: "/settings/billing", key: "billing" },
  { href: "/settings/invoices", key: "invoices" },
] as const;

/** The pages of Team, as tabs: bulk orders, and Plus for its people. */
const TEAM_TABS = [
  { href: "/team", key: "orders" },
  { href: "/team/plus", key: "plus" },
] as const;

/** The group of the side menu each section is in (the breadcrumb). */
const SECTION_GROUP: Record<
  OrganizationFeature,
  "grow" | "organization" | "sell"
> = {
  affiliate: "grow",
  developers: "organization",
  opportunities: "grow",
  perks: "grow",
  selling: "sell",
  supply: "grow",
  team: "organization",
};

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
        <Link className="text-sm underline" href={ADD_SECTIONS_HREF}>
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

/** The header's breadcrumb (the menu group) and default title. */
const useHeading = (
  feature: OrganizationFeature | undefined,
  organization: boolean,
  page: NavKey | undefined
) => {
  const t = useTranslations("app.nav");
  if (feature) {
    let title = t(feature);
    if (page) {
      title = t(page);
    } else if (feature === "selling") {
      title = t("sell");
    }
    return { crumb: t(SECTION_GROUP[feature]), title };
  }
  if (organization) {
    return { crumb: t("organization"), title: t("settings") };
  }
  return { crumb: undefined, title: page ? t(page) : t("today") };
};

interface BusinessShellProps {
  /** The header's actions, the primary last (it sits at the end). */
  readonly actions?: ReactNode;
  readonly children: ReactNode;
  /** The section the screen belongs to, when organizations add it. */
  readonly feature?: OrganizationFeature;
  /** Organization → Settings pages show its tabs. */
  readonly organization?: boolean;
  /** The menu entry the page is, for its title (Sell's pages). */
  readonly page?: NavKey;
  /** The header's status chip. */
  readonly status?: ReactNode;
  /** The page's title (by default, its menu entry's or section's name). */
  readonly title?: string;
}

/**
 * A screen of Partners that needs an active organization (chosen in the
 * sidebar). Without one, it shows the introduction instead; in a section
 * the organization hasn't added, it says so. The header follows one
 * pattern: breadcrumb (the menu group), title, status chip, actions.
 */
export const BusinessShell = ({
  actions,
  children,
  feature,
  organization = false,
  page,
  status,
  title: pageTitle,
}: BusinessShellProps) => {
  const t = useTranslations("app");
  const { active } = useOrganization();
  const { crumb, title } = useHeading(feature, organization, page);

  let content: ReactNode;
  let ready = false;
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
    ready = true;
    content = (
      <>
        {organization ? (
          <SectionTabs
            label={t("business.organization.title")}
            tabs={ORGANIZATION_TABS}
          />
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
      <PageHeader
        actions={ready ? actions : undefined}
        crumb={active ? crumb : undefined}
        status={ready ? status : undefined}
        title={active ? (pageTitle ?? title) : t("business.title")}
      />
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">{content}</div>
    </>
  );
};

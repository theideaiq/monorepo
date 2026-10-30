"use client";

import { useAuth } from "@repo/auth/provider";
import { useRouter } from "@repo/internationalization/navigation";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { CreateOrganizationForm } from "@/components/organization-form";
import { useOrganization } from "@/components/organization-provider";
import { PageHeader } from "@/components/page-header";

/**
 * /new: an organization for Partners. With `?for=selling` (the website's
 * "sell your own things" links) it starts with Selling switched on and
 * opens the shop's application, where a person joins as an individual
 * trader with their ID.
 */
export const NewOrganization = () => {
  const t = useTranslations("app.organizations.new");
  const router = useRouter();
  const { supabase } = useAuth();
  const { select } = useOrganization();
  const selling = useSearchParams().get("for") === "selling";

  return (
    <>
      <PageHeader title={t("title")} />
      <div className="flex max-w-md flex-1 flex-col gap-6 p-4 pt-0">
        <p className="text-muted-foreground">
          {t(selling ? "sellingDescription" : "description")}
        </p>
        <CreateOrganizationForm
          onCreated={async (organizationId) => {
            select(organizationId);
            if (selling) {
              await supabase
                .from("organizations")
                .update({ features: ["selling"] })
                .eq("id", organizationId);
            }
            router.push(selling ? "/sell/settings" : "/");
          }}
        />
      </div>
    </>
  );
};

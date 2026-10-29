"use client";

import { localized } from "@repo/commerce";
import { Button } from "@repo/design-system/components/ui/button";
import { useLocale, useTranslations } from "next-intl";
import { useDecideTeenApplication, useTeenApplications } from "@/lib/programs";

/**
 * A guardian's teens' applications to The IDEA's programs, waiting for
 * their yes before The IDEA reviews them; the payments that follow need no
 * second approval.
 */
export const TeenApplications = () => {
  const t = useTranslations("app.settings.guardian.programs");
  const locale = useLocale();
  const applications = useTeenApplications().data ?? [];
  const decide = useDecideTeenApplication();
  if (applications.length === 0) {
    return null;
  }
  return (
    <section className="grid gap-3">
      <h3 className="font-medium">{t("title")}</h3>
      <p className="text-muted-foreground">{t("description")}</p>
      <ul className="grid gap-2">
        {applications.map((application) => {
          const opportunity = application.program?.opportunity;
          return (
            <li
              className="flex flex-wrap items-center gap-2 rounded-md border p-3"
              key={application.id}
            >
              <span className="flex-1">
                {t("line", {
                  name: application.details?.full_name ?? "",
                  title: opportunity
                    ? localized(opportunity, "title", locale)
                    : "",
                })}
              </span>
              <Button
                disabled={decide.isPending}
                onClick={() =>
                  decide.mutate({ application: application.id, approve: true })
                }
                size="sm"
                type="button"
              >
                {t("approve")}
              </Button>
              <Button
                disabled={decide.isPending}
                onClick={() =>
                  decide.mutate({ application: application.id, approve: false })
                }
                size="sm"
                type="button"
                variant="outline"
              >
                {t("decline")}
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

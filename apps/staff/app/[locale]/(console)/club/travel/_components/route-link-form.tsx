"use client";

import { useTranslations } from "next-intl";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { type Option, SelectField } from "@/components/admin/fields";
import { linkTravelRoute } from "../actions";

/** Links one more route to an opportunity. */
export const RouteLinkForm = ({
  opportunityId,
  routes,
}: {
  readonly opportunityId: string;
  readonly routes: Option[];
}) => {
  const t = useTranslations("admin.editorial.travel");
  return (
    <ActionForm action={linkTravelRoute} className="grid gap-3">
      <input name="opportunityId" type="hidden" value={opportunityId} />
      <SelectField label={t("linkRoute")} name="routeId" options={routes} />
      <SubmitButton className="justify-self-start" size="sm" variant="outline">
        {t("link")}
      </SubmitButton>
    </ActionForm>
  );
};

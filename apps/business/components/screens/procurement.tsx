"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { formatCurrency, formatDate } from "@repo/internationalization/format";
import { Link, useRouter } from "@repo/internationalization/navigation";
import { ChevronRightIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";
import { BusinessShell } from "@/components/business/business-shell";
import { useActiveOrganization } from "@/components/organization-provider";
import { ErrorState, SectionSpinner } from "@/components/states";
import {
  useCreateProcurementRequest,
  useProcurementRequests,
} from "@/lib/procurement-queries";

const NON_DIGITS = /\D/g;

/** Owners and admins: what the company needs, with a budget and a date. */
const NewRequestForm = ({ organizationId }: { organizationId: string }) => {
  const t = useTranslations("app.company.procurement");
  const id = useId();
  const router = useRouter();
  const create = useCreateProcurementRequest(organizationId);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [budget, setBudget] = useState("");
  const [neededBy, setNeededBy] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const amount = Number(budget.replace(NON_DIGITS, ""));
    create.mutate(
      {
        budget: amount > 0 ? amount : null,
        details,
        neededBy: neededBy || null,
        title,
      },
      {
        onSuccess: (request) =>
          router.push(request ? `/procurement/${request.id}` : "/procurement"),
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("new.title")}</CardTitle>
        <CardDescription>{t("new.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={submit}>
          <div className="grid gap-2">
            <Label htmlFor={`${id}-title`}>{t("new.what")}</Label>
            <Input
              id={`${id}-title`}
              maxLength={200}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t("new.whatPlaceholder")}
              required
              value={title}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${id}-details`}>{t("new.details")}</Label>
            <Textarea
              id={`${id}-details`}
              maxLength={4000}
              onChange={(event) => setDetails(event.target.value)}
              placeholder={t("new.detailsPlaceholder")}
              rows={4}
              value={details}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor={`${id}-budget`}>{t("new.budget")}</Label>
              <Input
                id={`${id}-budget`}
                inputMode="numeric"
                onChange={(event) => setBudget(event.target.value)}
                value={budget}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`${id}-needed`}>{t("new.neededBy")}</Label>
              <Input
                id={`${id}-needed`}
                onChange={(event) => setNeededBy(event.target.value)}
                type="date"
                value={neededBy}
              />
            </div>
          </div>
          {create.isError ? (
            <p className="text-destructive text-sm" role="alert">
              {t("new.error")}
            </p>
          ) : null}
          <Button
            className="justify-self-start"
            disabled={create.isPending || !title.trim()}
            type="submit"
          >
            {t("new.send")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

const RequestList = () => {
  const t = useTranslations("app.company");
  const locale = useLocale();
  const { active, canManage } = useActiveOrganization();
  const requests = useProcurementRequests(active.id);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-muted-foreground">{t("procurement.description")}</p>
      {canManage ? (
        <NewRequestForm organizationId={active.id} />
      ) : (
        <p className="text-muted-foreground text-sm">
          {t("procurement.managersOnly")}
        </p>
      )}
      <section className="grid gap-3">
        <h2 className="font-semibold text-lg">{t("procurement.requests")}</h2>
        {requests.isPending ? <SectionSpinner /> : null}
        {requests.isError ? (
          <ErrorState onRetry={() => requests.refetch()} />
        ) : null}
        {requests.data?.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {t("procurement.empty")}
          </p>
        ) : null}
        {requests.data?.length ? (
          <ul className="divide-y rounded-md border">
            {requests.data.map((request) => (
              <li key={request.id}>
                <Link
                  className="flex items-center justify-between gap-4 p-3 text-sm hover:bg-accent"
                  href={`/procurement/${request.id}`}
                >
                  <div className="grid gap-0.5">
                    <span className="font-medium">{request.title}</span>
                    <span className="text-muted-foreground text-xs">
                      {t("procurement.number", {
                        number: String(request.number),
                      })}
                      {" · "}
                      {formatDate(request.created_at, locale)}
                      {request.budget
                        ? ` · ${formatCurrency(request.budget, locale)}`
                        : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {t(`status.request.${request.status}`)}
                    </Badge>
                    <ChevronRightIcon className="size-4 text-muted-foreground rtl:rotate-180" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
};

export const Procurement = () => (
  <BusinessShell>
    <RequestList />
  </BusinessShell>
);

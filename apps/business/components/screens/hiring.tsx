"use client";

import type { Enums } from "@repo/database";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { formatDate, formatNumber } from "@repo/internationalization/format";
import { Link, useRouter } from "@repo/internationalization/navigation";
import { ChevronRightIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";
import { BusinessShell } from "@/components/business/business-shell";
import { useActiveOrganization } from "@/components/organization-provider";
import { ErrorState, SectionSpinner } from "@/components/states";
import { useCreateJob, useJobRequests } from "@/lib/hiring-queries";

const NON_DIGITS = /\D/g;

export const employmentTypes = [
  "full_time",
  "part_time",
  "contract",
  "internship",
] as const satisfies readonly Enums<"employment_type">[];

const amount = (value: string) => {
  const parsed = Number(value.replace(NON_DIGITS, ""));
  return parsed > 0 ? parsed : null;
};

/** Owners and admins: the role, where, the contract, salary and how many. */
const NewJobForm = ({ organizationId }: { organizationId: string }) => {
  const t = useTranslations("app.company.hiring");
  const id = useId();
  const router = useRouter();
  const create = useCreateJob(organizationId);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [employmentType, setEmploymentType] =
    useState<Enums<"employment_type">>("full_time");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [openings, setOpenings] = useState("1");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    create.mutate(
      {
        description,
        employmentType,
        location,
        openings: Math.min(Math.max(amount(openings) ?? 1, 1), 100),
        salaryMax: amount(salaryMax),
        salaryMin: amount(salaryMin),
        title,
      },
      {
        onSuccess: (job) => router.push(job ? `/hiring/${job.id}` : "/hiring"),
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
            <Label htmlFor={`${id}-title`}>{t("new.role")}</Label>
            <Input
              id={`${id}-title`}
              maxLength={200}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t("new.rolePlaceholder")}
              required
              value={title}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${id}-description`}>{t("new.details")}</Label>
            <Textarea
              id={`${id}-description`}
              maxLength={4000}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t("new.detailsPlaceholder")}
              rows={4}
              value={description}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor={`${id}-location`}>{t("new.location")}</Label>
              <Input
                id={`${id}-location`}
                maxLength={200}
                onChange={(event) => setLocation(event.target.value)}
                value={location}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`${id}-type`}>{t("new.type")}</Label>
              <Select
                onValueChange={(value) =>
                  setEmploymentType(value as Enums<"employment_type">)
                }
                value={employmentType}
              >
                <SelectTrigger id={`${id}-type`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {employmentTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {t(`types.${type}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`${id}-min`}>{t("new.salaryMin")}</Label>
              <Input
                id={`${id}-min`}
                inputMode="numeric"
                onChange={(event) => setSalaryMin(event.target.value)}
                value={salaryMin}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`${id}-max`}>{t("new.salaryMax")}</Label>
              <Input
                id={`${id}-max`}
                inputMode="numeric"
                onChange={(event) => setSalaryMax(event.target.value)}
                value={salaryMax}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`${id}-openings`}>{t("new.openings")}</Label>
              <Input
                id={`${id}-openings`}
                inputMode="numeric"
                onChange={(event) => setOpenings(event.target.value)}
                value={openings}
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

const JobList = () => {
  const t = useTranslations("app.company.hiring");
  const locale = useLocale();
  const { active, canManage } = useActiveOrganization();
  const jobs = useJobRequests(active.id);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-muted-foreground">{t("description")}</p>
      {canManage ? (
        <NewJobForm organizationId={active.id} />
      ) : (
        <p className="text-muted-foreground text-sm">{t("managersOnly")}</p>
      )}
      <section className="grid gap-3">
        <h2 className="font-semibold text-lg">{t("jobs")}</h2>
        {jobs.isPending ? <SectionSpinner /> : null}
        {jobs.isError ? <ErrorState onRetry={() => jobs.refetch()} /> : null}
        {jobs.data?.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("empty")}</p>
        ) : null}
        {jobs.data?.length ? (
          <ul className="divide-y rounded-md border">
            {jobs.data.map((job) => {
              const waiting = job.candidates.filter(
                (candidate) => candidate.status === "proposed"
              ).length;
              return (
                <li key={job.id}>
                  <Link
                    className="flex items-center justify-between gap-4 p-3 text-sm hover:bg-accent"
                    href={`/hiring/${job.id}`}
                  >
                    <div className="grid gap-0.5">
                      <span className="font-medium">{job.title}</span>
                      <span className="text-muted-foreground text-xs">
                        {t("number", { number: String(job.number) })}
                        {" · "}
                        {formatDate(job.created_at, locale)}
                        {waiting
                          ? ` · ${t("toReview", { count: formatNumber(waiting, locale) })}`
                          : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {t(`status.job.${job.status}`)}
                      </Badge>
                      <ChevronRightIcon className="size-4 text-muted-foreground rtl:rotate-180" />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>
    </div>
  );
};

/** /business/hiring: the company's job requests and a new one. */
export const Hiring = () => (
  <BusinessShell>
    <JobList />
  </BusinessShell>
);

"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import { Link } from "@repo/internationalization/navigation";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { YourApplications } from "@/components/club/your-applications";
import { YourFollows } from "@/components/club/your-follows";
import { YourSurveys } from "@/components/club/your-surveys";
import { PageHeader } from "@/components/page-header";
import { YourEvents } from "@/components/screens/events";
import { YourSubmissions } from "@/components/screens/submissions";
import { applicationsPath, isYoursTab, joinPath } from "@/lib/club";

/**
 * `/pass/tickets`: the events the member is going to (with the calendar
 * feed), each linking to its receipt when it was paid for.
 */
export const Tickets = () => {
  const t = useTranslations("app.pass.tickets");
  return (
    <>
      <PageHeader title={t("title")}>
        <Button asChild size="sm" variant="outline">
          <Link href={joinPath("events")}>{t("browse")}</Link>
        </Button>
      </PageHeader>
      <div className="flex max-w-3xl flex-1 flex-col gap-6">
        <YourEvents />
        <Link
          className="inline-flex min-h-11 items-center self-start font-medium text-pink-text text-sm hover:underline"
          href={applicationsPath()}
        >
          {t("applications")}
        </Link>
      </div>
    </>
  );
};

/**
 * `/pass/applications`: the member's applications to programs, the
 * surveys they made, their submissions and the opportunities they follow;
 * `?tab=` opens one (notifications link to them).
 */
export const Applications = () => {
  const t = useTranslations("web.club.yours");
  const tPass = useTranslations("app.pass.applications");
  const asked = useSearchParams().get("tab");
  const tab = isYoursTab(asked) ? asked : "applications";
  return (
    <>
      <PageHeader title={tPass("title")} />
      <div className="flex max-w-3xl flex-1 flex-col gap-6">
        <Tabs defaultValue={tab}>
          <TabsList className="flex-wrap">
            <TabsTrigger value="applications">
              {t("applicationsTab")}
            </TabsTrigger>
            <TabsTrigger value="surveys">{t("surveys")}</TabsTrigger>
            <TabsTrigger value="submissions">{t("submissions")}</TabsTrigger>
            <TabsTrigger value="following">{t("followingTab")}</TabsTrigger>
          </TabsList>
          <TabsContent className="pt-4" value="applications">
            <YourApplications />
          </TabsContent>
          <TabsContent className="pt-4" value="surveys">
            <YourSurveys />
          </TabsContent>
          <TabsContent className="pt-4" value="submissions">
            <YourSubmissions />
          </TabsContent>
          <TabsContent className="pt-4" value="following">
            <YourFollows />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

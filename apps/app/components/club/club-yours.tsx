"use client";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import { useTranslations } from "next-intl";
import { YourEvents } from "@/components/screens/events";
import { YourSubmissions } from "@/components/screens/submissions";
import { SignedInSection } from "@/components/signed-in-section";
import { YourApplications } from "./your-applications";
import { YourFollows } from "./your-follows";
import { YourSurveys } from "./your-surveys";

/**
 * The Club page's "Yours": a signed-in member's tickets (the events they're
 * going to, with the calendar feed), the surveys they created, their
 * submissions, their applications to The IDEA's programs and the
 * opportunities they follow. `?tab=` opens one (notifications link to
 * `?tab=applications`).
 */
const TABS = [
  "tickets",
  "surveys",
  "submissions",
  "applications",
  "following",
] as const;

export const ClubYours = ({ tab: asked }: { readonly tab?: string }) => {
  const t = useTranslations("web.club.yours");
  const tab = TABS.find((value) => value === asked) ?? "tickets";
  return (
    <SignedInSection
      id="yours"
      returnTo="/club"
      signedOut={t("signedOut")}
      signIn={t("signIn")}
      title={t("title")}
    >
      <Tabs defaultValue={tab}>
        <TabsList>
          <TabsTrigger value="tickets">{t("tickets")}</TabsTrigger>
          <TabsTrigger value="surveys">{t("surveys")}</TabsTrigger>
          <TabsTrigger value="submissions">{t("submissions")}</TabsTrigger>
          <TabsTrigger value="applications">{t("applicationsTab")}</TabsTrigger>
          <TabsTrigger value="following">{t("followingTab")}</TabsTrigger>
        </TabsList>
        <TabsContent className="pt-4" value="tickets">
          <YourEvents />
        </TabsContent>
        <TabsContent className="pt-4" value="surveys">
          <YourSurveys />
        </TabsContent>
        <TabsContent className="pt-4" value="submissions">
          <YourSubmissions />
        </TabsContent>
        <TabsContent className="pt-4" value="applications">
          <YourApplications />
        </TabsContent>
        <TabsContent className="pt-4" value="following">
          <YourFollows />
        </TabsContent>
      </Tabs>
    </SignedInSection>
  );
};

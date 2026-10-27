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
import { YourSurveys } from "./your-surveys";

/**
 * The Club page's "Yours": a signed-in member's events (with the calendar
 * feed), surveys and submissions.
 */
export const ClubYours = () => {
  const t = useTranslations("web.club.yours");
  return (
    <SignedInSection
      id="yours"
      returnTo="/club"
      signedOut={t("signedOut")}
      signIn={t("signIn")}
      title={t("title")}
    >
      <Tabs defaultValue="events">
        <TabsList>
          <TabsTrigger value="events">{t("events")}</TabsTrigger>
          <TabsTrigger value="surveys">{t("surveys")}</TabsTrigger>
          <TabsTrigger value="submissions">{t("submissions")}</TabsTrigger>
        </TabsList>
        <TabsContent className="pt-4" value="events">
          <YourEvents />
        </TabsContent>
        <TabsContent className="pt-4" value="surveys">
          <YourSurveys />
        </TabsContent>
        <TabsContent className="pt-4" value="submissions">
          <YourSubmissions />
        </TabsContent>
      </Tabs>
    </SignedInSection>
  );
};

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
import { YourFollows } from "./your-follows";
import { YourSurveys } from "./your-surveys";

/**
 * The Club page's "Yours": a signed-in member's tickets (the events they're
 * going to, with the calendar feed), the surveys they created, their
 * submissions and the opportunities they follow.
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
      <Tabs defaultValue="tickets">
        <TabsList>
          <TabsTrigger value="tickets">{t("tickets")}</TabsTrigger>
          <TabsTrigger value="surveys">{t("surveys")}</TabsTrigger>
          <TabsTrigger value="submissions">{t("submissions")}</TabsTrigger>
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
        <TabsContent className="pt-4" value="following">
          <YourFollows />
        </TabsContent>
      </Tabs>
    </SignedInSection>
  );
};

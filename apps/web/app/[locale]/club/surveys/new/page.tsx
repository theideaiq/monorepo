import { Suspense } from "react";
import { PersonalPage } from "@/components/personal-page";
import { SurveyBuilder } from "@/components/screens/survey-builder";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/app-metadata";

export const generateMetadata = titleFrom((t) =>
  t("web.club.surveys.builder.newTitle")
);

/** /club/surveys/new (?edit=<id>): create a survey (verified students). */
const NewSurveyPage = () => (
  <PersonalPage>
    <Suspense fallback={<SectionSpinner />}>
      <SurveyBuilder />
    </Suspense>
  </PersonalPage>
);

export default NewSurveyPage;

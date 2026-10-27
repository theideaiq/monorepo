import { Suspense } from "react";
import { PersonalPage } from "@/components/personal-page";
import { SurveyAnswer } from "@/components/screens/survey-answer";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/app-metadata";

export const generateMetadata = titleFrom((t) => t("web.club.surveys.title"));

interface SurveyPageProps {
  readonly params: Promise<{ id: string }>;
}

/** /club/surveys/<id>: answer a survey (signed in). */
const SurveyPage = async ({ params }: SurveyPageProps) => {
  const { id } = await params;
  return (
    <PersonalPage>
      <Suspense fallback={<SectionSpinner />}>
        <SurveyAnswer surveyId={decodeURIComponent(id)} />
      </Suspense>
    </PersonalPage>
  );
};

export default SurveyPage;

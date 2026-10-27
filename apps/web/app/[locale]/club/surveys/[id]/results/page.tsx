import { Suspense } from "react";
import { PersonalPage } from "@/components/personal-page";
import { SurveyResults } from "@/components/screens/survey-results";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/app-metadata";

export const generateMetadata = titleFrom((t) =>
  t("web.club.surveys.manage.title")
);

interface SurveyResultsPageProps {
  readonly params: Promise<{ id: string }>;
}

/** /club/surveys/<id>/results: the creator's survey and its answers. */
const SurveyResultsPage = async ({ params }: SurveyResultsPageProps) => {
  const { id } = await params;
  return (
    <PersonalPage>
      <Suspense fallback={<SectionSpinner />}>
        <SurveyResults surveyId={decodeURIComponent(id)} />
      </Suspense>
    </PersonalPage>
  );
};

export default SurveyResultsPage;

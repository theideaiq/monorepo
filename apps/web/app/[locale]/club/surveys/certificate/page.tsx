import { PersonalPage } from "@/components/personal-page";
import { SurveyCertificate } from "@/components/screens/survey-certificate";
import { titleFrom } from "@/lib/app-metadata";

export const generateMetadata = titleFrom((t) =>
  t("web.club.surveys.certificate.title")
);

/** /club/surveys/certificate: the participation certificate (print to PDF). */
const SurveyCertificatePage = () => (
  <PersonalPage>
    <SurveyCertificate />
  </PersonalPage>
);

export default SurveyCertificatePage;

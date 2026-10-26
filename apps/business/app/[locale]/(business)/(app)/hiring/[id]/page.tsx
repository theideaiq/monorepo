import { Suspense } from "react";
import { HiringJob } from "@/components/screens/hiring-job";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/metadata";

export const generateMetadata = titleFrom((t) => t("app.company.hiring.title"));

interface HiringJobPageProps {
  readonly params: Promise<{ id: string }>;
}

const HiringJobPage = async ({ params }: HiringJobPageProps) => {
  const { id } = await params;
  return (
    <Suspense fallback={<SectionSpinner />}>
      <HiringJob jobId={id} />
    </Suspense>
  );
};

export default HiringJobPage;

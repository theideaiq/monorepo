import { Suspense } from "react";
import { Events } from "@/components/screens/events";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/app-metadata";

export const generateMetadata = titleFrom((t) => t("app.events.title"));

const EventsPage = () => (
  <Suspense fallback={<SectionSpinner />}>
    <Events />
  </Suspense>
);

export default EventsPage;

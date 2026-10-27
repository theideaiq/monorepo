import { Suspense } from "react";
import { InviteCard } from "@/components/invite-card";
import { Bulbs } from "@/components/screens/bulbs";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/app-metadata";

export const generateMetadata = titleFrom((t) => t("app.bulbs.title"));

/** Your Pass → Bulbs: balance and history, then the member's invite link. */
const BulbsPage = () => (
  <Suspense fallback={<SectionSpinner />}>
    <div className="flex flex-col gap-10">
      <Bulbs />
      <section className="scroll-mt-24" id="invite">
        <InviteCard />
      </section>
    </div>
  </Suspense>
);

export default BulbsPage;

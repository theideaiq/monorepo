import type { Locale } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { MoveLeft } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PlusSurface } from "@/components/plus/plus-surface";
import { PlanPage } from "@/components/screens/plus";

interface PlanProps {
  params: Promise<{ locale: Locale }>;
}

export const generateMetadata = async ({
  params,
}: PlanProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "app.plus.planPage" });
  return {
    // A member's own page: never indexed.
    robots: { follow: false, index: false },
    title: t("title"),
  };
};

/** `/plus/plan`: your plan, change plan, pause, cancel, and Family. */
const YourPlanPage = async ({ params }: PlanProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.plus.sheet" });
  return (
    <PlusSurface>
      <div className="container mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">
        <Link
          className="inline-flex min-h-11 items-center gap-2 self-start text-muted-foreground text-sm hover:text-foreground"
          href="/plus"
        >
          <MoveLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
          {t("back")}
        </Link>
        <PlanPage />
      </div>
    </PlusSurface>
  );
};

export default YourPlanPage;

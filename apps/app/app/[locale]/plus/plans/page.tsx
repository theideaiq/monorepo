import type { Locale } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { MoveLeft } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { GivePlus } from "@/components/plus/give-plus";
import { PlusSurface } from "@/components/plus/plus-surface";
import { PlanSheet } from "@/components/screens/plus";
import { SectionSpinner } from "@/components/states";
import { localizedMetadata } from "@/lib/metadata";

interface PlansProps {
  params: Promise<{ locale: Locale }>;
}

export const generateMetadata = async ({
  params,
}: PlansProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.plus.sheet" });
  return localizedMetadata(locale, "/plus/plans", {
    description: t("description"),
    title: t("title"),
  });
};

/** `/plus/plans`: the plan sheet and joining, then giving Plus. */
const PlansPage = async ({ params }: PlansProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.plus.sheet" });
  return (
    <PlusSurface>
      <div className="container mx-auto flex flex-col gap-6 px-4 py-6">
        <Link
          className="inline-flex min-h-11 items-center gap-2 self-start text-muted-foreground text-sm hover:text-foreground"
          href="/plus"
        >
          <MoveLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
          {t("back")}
        </Link>
        <div className="grid gap-1">
          <h1 className="font-bold text-2xl tracking-tight md:text-3xl">
            {t("title")}
          </h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <Suspense fallback={<SectionSpinner />}>
          <PlanSheet />
        </Suspense>
        <GivePlus />
      </div>
    </PlusSurface>
  );
};

export default PlansPage;

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PartnerVerification } from "@/components/pass/partner-verification";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("pass.partnerVerify");
  return { title: t("title") };
};

interface PartnerVerificationPageProps {
  readonly params: Promise<{ id: string }>;
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** theideaiq.com/verify/<id>: a partner's student verification (`?embed=1` in a frame). */
const PartnerVerificationPage = async ({
  params,
  searchParams,
}: PartnerVerificationPageProps) => {
  const { id } = await params;
  const { embed } = await searchParams;
  const t = await getTranslations("pass.partnerVerify");
  if (!UUID.test(id)) {
    return <p className="text-muted-foreground text-sm">{t("notFound")}</p>;
  }
  return <PartnerVerification embedded={embed === "1"} id={id.toLowerCase()} />;
};

export default PartnerVerificationPage;

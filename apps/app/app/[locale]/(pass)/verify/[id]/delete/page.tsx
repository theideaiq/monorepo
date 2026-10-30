import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DeleteVerification } from "@/components/pass/delete-verification";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("pass.partnerVerify.delete");
  return { title: t("title") };
};

interface DeleteVerificationPageProps {
  readonly params: Promise<{ id: string }>;
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** The confirmation email's "Delete this verification" link. */
const DeleteVerificationPage = async ({
  params,
  searchParams,
}: DeleteVerificationPageProps) => {
  const { id } = await params;
  const { token } = await searchParams;
  return (
    <DeleteVerification
      id={id}
      token={typeof token === "string" ? token : ""}
    />
  );
};

export default DeleteVerificationPage;

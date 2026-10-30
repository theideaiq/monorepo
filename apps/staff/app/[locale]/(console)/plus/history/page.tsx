import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { SearchParams } from "@/lib/admin/list";
import { RentalsList } from "../_components/rentals-list";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.rentals.tabs");
  return { title: t("history") };
};

/** Plus → Back: rentals returned, cancelled or kept. */
const HistoryPage = ({
  searchParams,
}: {
  readonly searchParams: Promise<SearchParams>;
}) => <RentalsList searchParams={searchParams} view="history" />;

export default HistoryPage;

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageBody, PageHeader } from "@/components/admin/page";
import { env } from "@/env";
import { requireSection } from "@/lib/admin/session";
import { EventForm } from "../../_components/event-form";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.editorial.events");
  return { title: t("new") };
};

const NewEventPage = async () => {
  await requireSection("editorial", "write");
  const t = await getTranslations("admin.editorial");

  return (
    <>
      <PageHeader
        back={{ href: "/editorial/events", label: t("tabs.events") }}
        title={t("events.new")}
      />
      <PageBody className="max-w-5xl">
        <EventForm
          endsAt=""
          startsAt=""
          supabaseUrl={env.NEXT_PUBLIC_SUPABASE_URL ?? ""}
        />
      </PageBody>
    </>
  );
};

export default NewEventPage;

import { notFound } from "next/navigation";
import { Suspense } from "react";
import { RequireAuth } from "@/components/gates";
import { DocumentView } from "@/components/screens/document";
import { FullPageSpinner } from "@/components/states";
import { isDocumentKind } from "@/lib/documents";
import { titleFrom } from "@/lib/metadata";

export const generateMetadata = titleFrom((t) =>
  t("app.company.document.title")
);

interface DocumentPageProps {
  readonly params: Promise<{ id: string; kind: string }>;
}

/** A printable quote, purchase order or invoice (print or save as PDF). */
const DocumentPage = async ({ params }: DocumentPageProps) => {
  const { id, kind } = await params;
  if (!isDocumentKind(kind)) {
    notFound();
  }
  return (
    <RequireAuth>
      <Suspense fallback={<FullPageSpinner />}>
        <DocumentView id={id} kind={kind} />
      </Suspense>
    </RequireAuth>
  );
};

export default DocumentPage;

import { Codes } from "@/components/pass/codes";
import { titleFrom } from "@/lib/app-metadata";

export const generateMetadata = titleFrom((t) => t("app.pass.codes.title"));

/** `/pass/codes`: the digital codes the member bought. */
const CodesPage = () => <Codes />;

export default CodesPage;

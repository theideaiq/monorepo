import { AtHome } from "@/components/pass/rentals";
import { titleFrom } from "@/lib/app-metadata";

export const generateMetadata = titleFrom((t) => t("app.pass.atHome.title"));

/** `/pass/at-home`: the Plus items at home, Keep it and sending them back. */
const AtHomePage = () => <AtHome />;

export default AtHomePage;

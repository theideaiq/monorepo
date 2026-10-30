import { SettingsList } from "@/components/screens/settings";
import { titleFrom } from "@/lib/app-metadata";

export const generateMetadata = titleFrom((t) => t("app.settings.title"));

/** `/pass/settings`: the sections, each a page of its own. */
const SettingsPage = () => <SettingsList />;

export default SettingsPage;

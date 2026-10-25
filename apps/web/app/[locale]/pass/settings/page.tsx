import { Settings } from "@/components/screens/settings";
import { titleFrom } from "@/lib/app-metadata";

export const generateMetadata = titleFrom((t) => t("app.settings.title"));

const SettingsPage = () => <Settings />;

export default SettingsPage;

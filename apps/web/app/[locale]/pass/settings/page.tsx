import { enabledProviders } from "@repo/auth/social";
import { Settings } from "@/components/screens/settings";
import { env } from "@/env";
import { titleFrom } from "@/lib/app-metadata";

export const generateMetadata = titleFrom((t) => t("app.settings.title"));

const SettingsPage = () => (
  <Settings providers={enabledProviders(env.NEXT_PUBLIC_AUTH_PROVIDERS)} />
);

export default SettingsPage;

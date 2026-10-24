import { Home } from "@/components/screens/home";
import { titleFrom } from "@/lib/metadata";

export const generateMetadata = titleFrom((t) => t("app.home.title"));

const HomePage = () => <Home />;

export default HomePage;

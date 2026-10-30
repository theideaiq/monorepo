import { Lists } from "@/components/screens/wishlist";
import { titleFrom } from "@/lib/app-metadata";

export const generateMetadata = titleFrom((t) => t("app.wishlist.tabs.lists"));

/** `/pass/lists`: the member's named lists of saved items. */
const ListsPage = () => <Lists />;

export default ListsPage;

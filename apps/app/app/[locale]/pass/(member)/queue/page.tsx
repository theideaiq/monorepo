import { QueuePage } from "@/components/pass/queue";
import { titleFrom } from "@/lib/app-metadata";

export const generateMetadata = titleFrom((t) => t("app.pass.queue.title"));

/** `/pass/queue`: what to rent next with Plus, in order. */
const Queue = () => <QueuePage />;

export default Queue;

import { notFound } from "next/navigation";

/** Unknown paths show the localized 404 inside the layout. */
const CatchAllPage = () => notFound();

export default CatchAllPage;

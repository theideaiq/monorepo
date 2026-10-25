import createMiddleware from "next-intl/middleware";
import { routing } from "./routing";

/**
 * Redirects to the visitor's language (cookie, then Accept-Language, then
 * English) and serves unprefixed paths in English (`localePrefix:
 * "as-needed"`).
 */
export const internationalizationMiddleware = createMiddleware(routing);

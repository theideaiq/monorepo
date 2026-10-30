/**
 * The website's release, shown in About & info and the footer. Bump the
 * version with each launch; the build is the deployment's commit (Vercel
 * sets VERCEL_GIT_COMMIT_SHA at build time).
 */
export const APP_VERSION = "1.0.0";

export const buildId = () =>
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local";

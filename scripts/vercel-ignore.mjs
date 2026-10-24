// Vercel's Ignored Build Step for every project in this repository
// (vercel.json → ignoreCommand). Exit 0 skips the build, 1 builds.
//
// A commit whose subject line carries the skip marker ([skip ci] or
// [vercel skip]) builds nothing. Only the subject counts: a squash merge
// puts every commit body of the pull request into the message, and a body
// that merely mentions the marker must not skip a production build.
// Every other push builds every project. Skipping unaffected projects was
// tried with turbo-ignore: it compares against the
// previous deployment even when that one was skipped, so once a production
// build is skipped the changes before it never deploy. Vercel's own
// "skip unaffected projects" setting is the way to get that back, not a
// script.
import { execSync } from "node:child_process";

const message = execSync("git log -1 --pretty=%s", { encoding: "utf8" });
if (/\[(skip ci|vercel skip)\]/i.test(message)) {
  console.log("Skipping the build: the commit message says so.");
  process.exit(0);
}
process.exit(1);

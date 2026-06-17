## 2025-05-25 - Incorrect Relative CSS Paths

Insight: The @repo/ui README instructed developers to use a relative path ("../../../packages/ui") that was incorrect for the standard Next.js app structure ("../../../../packages/ui"), leading to broken builds.
Rule: When documenting relative paths in a monorepo, always specify the assumed file location (e.g., "relative to src/app/globals.css") and verify the directory depth.

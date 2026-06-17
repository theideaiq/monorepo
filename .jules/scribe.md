# Scribe's Journal

## 2025-05-24 - Stale "Missing Patch" Documentation
Insight: The README claimed a patch file was missing, but it was present (and broken). This caused confusion about the state of the repo.
Rule: Do not document "missing files" unless verified. If a patch is broken, document it as "disabled due to incompatibility" or remove it.

## 2025-05-24 - Node.js Strict Engine Requirements
Insight: The project requires Node v24.12.0+, which is very new. Standard environments (v22) fail installation.
Rule: Always provide a workaround for strict engine checks in the "Troubleshooting" section if the requirement is aggressive.

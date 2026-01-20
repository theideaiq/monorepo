# Scribe Journal - Critical Learnings

## 2025-01-28 - Initial Setup
Insight: The Scribe journal was missing, so I created it to track critical documentation learnings.
Rule: Use this journal to record terminology decisions, recurring confusion, code-doc discrepancies, and documentation anti-patterns.

## 2025-01-28 - Database Package Exports
Insight: `packages/database/README.md` documented `client` and `server` exports that do not exist in `package.json`. The apps implement these locally.
Rule: Always verify `package.json` exports against documentation. Shared database packages should clearly state if they only provide types and service-role clients, leaving auth-dependent client creation to the specific apps.

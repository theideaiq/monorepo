# Scribe Journal

This journal tracks critical learnings regarding the project's "Knowledge Graph" and Style Guide.

## 2024-05-23 - Initial Setup
Insight: Starting the Scribe journal to track documentation standards and critical learnings.
Rule: Documentation must be clear, accurate, and verified against the actual code behavior.

## 2024-05-23 - Environment Variable Parity
Insight: `YOUTUBE_API_KEY` was required in code but missing from `README.md`, causing potential setup friction.
Rule: Every `process.env` usage in the codebase must have a corresponding entry in `README.md` or `.env.example`.

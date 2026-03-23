## 2024-03-23 - Prevent JSON-LD Script Breakouts
**Learning:** When injecting JSON-LD data via dangerouslySetInnerHTML, failing to escape the `<` character can allow premature `<script>` tag closures, breaking structured data parsing.
**Action:** Always append `.replace(/</g, '\\u003c')` to `JSON.stringify` when rendering schema objects to ensure bots can safely parse the data.

## 2024-05-23 - Regex Compilation in Loops
**Learning:** Instantiating `RegExp` objects inside hot loops (like `Array.prototype.filter`) can cause significant garbage collection pressure, even if the parsing overhead itself is small. Pre-compiling regexes as module-level constants is a simple, high-impact optimization for these scenarios.
**Action:** Always check loop bodies for regex literals or `new RegExp()` calls and hoist them to the module scope or a parent scope.

## 2025-02-27 - Supabase Field Selection
**Learning:** Using `.select('*')` in Supabase queries fetches all columns, including potentially large unused data (JSON blobs, descriptions), increasing payload size and memory usage.
**Action:** Always specify exact columns (e.g., `.select('id, name, status')`) when querying tables, especially in list views or high-traffic endpoints.

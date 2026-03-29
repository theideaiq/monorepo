## 2024-05-22 - [Trust Code Over Memory]
**Learning:** The memory stated that `slugify` handled null inputs and `decodeHtmlEntities` supported hex entities, but the actual code crashed on both cases.
**Action:** Always verify utility functions by reading their source code or running tests, rather than relying solely on memory descriptions.

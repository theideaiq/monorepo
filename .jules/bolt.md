## 2026-01-23 - Frontend Verification with Network Mocking
**Learning:** When verifying frontend changes where the backend is unstable or unconfigured (e.g., missing Supabase connection), using Playwright's `page.route` to intercept and mock network requests is significantly more reliable than trying to spin up a partial backend environment.
**Action:** For future frontend-only optimizations, prioritize writing verification scripts that mock external dependencies at the network layer rather than debugging local environment configuration.

## 2026-01-23 - Zustand Granular Selectors
**Learning:** Subscribing to complex objects in Zustand (e.g., `state.items`) triggers re-renders on *any* change to that object, even if the derived value (e.g., `items.length`) hasn't changed.
**Action:** Always use granular selectors (e.g., `state => state.items.length` or `state => state.items.reduce(...)`) when consuming store data in components to minimize render impact.

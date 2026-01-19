## 2025-05-22 - Nested Interactive Elements Accessibility
**Learning:** Nested interactive elements (like password toggles) within inputs often lack proper focus indicators, defaulting to subtle color changes that fail accessibility standards.
**Action:** Always apply `focus-visible:ring-2` (matching the main input's focus style) to nested buttons to ensure keyboard navigation visibility.

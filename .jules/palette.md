## 2025-02-28 - [Accessible Hidden Actions]
**Learning:** Visually hiding elements (like quick actions) using `opacity-0` and `translate` on hover (`group-hover:opacity-100`) completely breaks keyboard accessibility because users cannot see the focus state.
**Action:** Always ensure that visually hidden actions also reveal themselves on keyboard focus by applying `focus-visible:opacity-100 focus-visible:translate-y-0` (or the equivalent layout changes).

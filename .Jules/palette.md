## 2024-03-21 - WebNavbar Missing ARIA Labels
**Learning:** Icon-only interactive elements in key navigational components (like `WebNavbar`) frequently lacked descriptive `aria-label` attributes. This presents a critical accessibility barrier for screen reader users trying to identify primary actions like Search, Account, and Cart toggles.
**Action:** When auditing or building navigation bars or header components, immediately verify that all icon-only buttons or links have a clear, descriptive `aria-label` to ensure equitable access.

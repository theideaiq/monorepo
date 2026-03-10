## 2024-03-10 - Missing ARIA Labels on Navigation Icons
**Learning:** Icon-only interactive elements in key navigational areas (Navbar, Footer social links) were missing accessible names, making them difficult to interact with for screen reader users.
**Action:** Always verify that icon-only buttons (`<button>`, `<a>`, `<Link>`) have an explicit `aria-label` or visually hidden text when implementing or reviewing navigation components.

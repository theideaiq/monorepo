## 2025-04-09 - Admin Actions Unhappy Path Testing Gap
Discovery: Admin actions lacked unhappy path coverage (preventing unauthorized actions). The testing coverage mostly verified that Superadmins could execute actions, but failed to ensure that lower-tier users were actually blocked.
Strategy: For every high-risk admin action (like toggleBan, updateRole), always write an explicit "should prevent non-superadmins" unhappy path test to verify the access control checks are correctly enforced.

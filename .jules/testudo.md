## 2024-05-14 - Brittle Auth Error Assertions
Discovery: Tests for authorization wrappers (like `requireSuperAdmin`) frequently fail when the exact error message string changes or differs between the implementation and the test mock.
Strategy: Assert against the specific custom Error classes or standardized error codes, rather than checking the exact text of the error message, to avoid brittle tests. If text must be checked, ensure the mocked internal auth checks throw the exact same error text as the real implementation.

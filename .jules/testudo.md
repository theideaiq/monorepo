## 2024-11-20 - Mocking Supabase Client Chained Methods
Discovery: When trying to mock deep Supabase client chains (e.g., `from().select().eq().single()`) inside `vi.mock()`, you can encounter ReferenceErrors or test flakiness because Vitest hoists `vi.mock` to the top of the module, so external variables are not defined.
Strategy: Use `vi.hoisted()` to initialize and return the mock functions, then supply them within the factory parameter of `vi.mock('@/lib/supabase/server')`. This safely provides hoisted mocks without causing ReferenceErrors, ensuring reliable isolated testing.

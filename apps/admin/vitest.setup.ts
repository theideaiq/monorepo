// Bypass environment variable validation during tests
process.env.SKIP_ENV_VALIDATION = 'true';
// Provide dummy values for required env vars to satisfy Zod schema if needed
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:3000';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'dummy-key';

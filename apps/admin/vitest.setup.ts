import { vi } from 'vitest';

vi.mock('@repo/env/admin', () => ({
  adminEnv: {
    RESEND_API_KEY: 'test-key',
    SUPABASE_SERVICE_ROLE_KEY: 'test-key',
    WAYL_SECRET_KEY: 'test-key',
    WAYL_WEBHOOK_SECRET: 'test-key',
    NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-key',
  },
}));

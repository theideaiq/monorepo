// Export shared logic for client-side use
export * from './shared';

// Export server-side logic only for server contexts
// Note: Client components should import from '@/lib/auth-checks/shared' explicitly if they only need the helper,
// but if they import from here, they might get server code if not careful.
// Ideally, we split the imports in the consuming files.

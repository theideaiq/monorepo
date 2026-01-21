import { Logger } from '@repo/utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { logAdminAction } from './audit';

// Hoist mocks to ensure they are available for vi.mock factories
const mocks = vi.hoisted(() => ({
  insert: vi.fn(),
  from: vi.fn(),
  getUser: vi.fn(),
  loggerError: vi.fn(),
}));

// Mock external dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: mocks.getUser,
    },
    from: mocks.from,
  }),
}));

vi.mock('@repo/utils', () => ({
  Logger: {
    error: mocks.loggerError,
  },
}));

describe('logAdminAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default happy path setup
    mocks.from.mockReturnValue({ insert: mocks.insert });
    mocks.getUser.mockResolvedValue({
      data: { user: { id: 'test-admin-id' } },
    });
    mocks.insert.mockResolvedValue({ error: null });
  });

  it('should insert audit log when user is authenticated', async () => {
    const action = 'test_action';
    const resource = 'test_resource';
    const details = { key: 'value' };

    await logAdminAction(action, resource, details);

    expect(mocks.getUser).toHaveBeenCalled();
    expect(mocks.from).toHaveBeenCalledWith('audit_logs');
    expect(mocks.insert).toHaveBeenCalledWith({
      admin_id: 'test-admin-id',
      action,
      target_resource: resource,
      details,
    });
    expect(mocks.loggerError).not.toHaveBeenCalled();
  });

  it('should not insert audit log when user is not authenticated', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });

    await logAdminAction('action', 'resource');

    expect(mocks.getUser).toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('should log error when insert fails', async () => {
    const error = { message: 'Insert failed', details: 'Database error' };
    mocks.insert.mockResolvedValue({ error });

    await logAdminAction('action', 'resource');

    expect(mocks.insert).toHaveBeenCalled();
    expect(mocks.loggerError).toHaveBeenCalledWith(
      'Failed to write audit log',
      error,
    );
  });

  it('should log error when an unexpected exception occurs', async () => {
    const exception = new Error('Unexpected error');
    mocks.getUser.mockRejectedValue(exception);

    await logAdminAction('action', 'resource');

    expect(Logger.error).toHaveBeenCalledWith(
      'Unexpected error in audit logging',
      exception,
    );
  });
});

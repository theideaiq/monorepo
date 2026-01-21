import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkRateLimit } from './rate-limit';

// Hoist mocks to ensure they are available before imports/mocks
const { mockSelect, mockEq, mockSingle, mockUpsert, mockUpdate, mockFrom } =
  vi.hoisted(() => ({
    mockSelect: vi.fn(),
    mockEq: vi.fn(),
    mockSingle: vi.fn(),
    mockUpsert: vi.fn(),
    mockUpdate: vi.fn(),
    mockFrom: vi.fn(),
  }));

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

describe('Rate Limit Utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup chainable mocks
    mockFrom.mockReturnValue({
      select: mockSelect,
      upsert: mockUpsert,
      update: mockUpdate,
    });

    mockSelect.mockReturnValue({
      eq: mockEq,
    });

    mockEq.mockReturnValue({
      single: mockSingle,
    });

    mockUpdate.mockReturnValue({
      eq: vi.fn(), // simple eq for update
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should allow request and create new entry if no record exists', async () => {
    // Arrange
    mockSingle.mockResolvedValue({ data: null, error: null });
    const key = 'test-ip-1';

    // Act
    const result = await checkRateLimit(key);

    // Assert
    expect(result).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith('rate_limits');
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        key,
        count: 1,
      }),
    );
  });

  it('should allow request and increment count if within limit', async () => {
    // Arrange
    const key = 'test-ip-2';
    const now = new Date();
    mockSingle.mockResolvedValue({
      data: {
        key,
        count: 1, // Current count is 1 (max is 5)
        last_request: now.toISOString(),
      },
      error: null,
    });

    // Act
    const result = await checkRateLimit(key);

    // Assert
    expect(result).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        count: 2,
      }),
    );
  });

  it('should block request if limit exceeded within window', async () => {
    // Arrange
    const key = 'test-ip-3';
    const now = new Date();
    mockSingle.mockResolvedValue({
      data: {
        key,
        count: 5, // Max requests reached
        last_request: now.toISOString(),
      },
      error: null,
    });

    // Act
    const result = await checkRateLimit(key);

    // Assert
    expect(result).toBe(false);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('should reset window and allow request if window expired', async () => {
    // Arrange
    const key = 'test-ip-4';
    const past = new Date(Date.now() - 61 * 1000); // 61 seconds ago (window is 60s)

    mockSingle.mockResolvedValue({
      data: {
        key,
        count: 5,
        last_request: past.toISOString(),
      },
      error: null,
    });

    // Act
    const result = await checkRateLimit(key);

    // Assert
    expect(result).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        count: 1, // Reset to 1
      }),
    );
  });
});

import { describe, expect, it } from 'vitest';
import { formatDate } from './format';

describe('Format Utils', () => {
  describe('formatDate', () => {
    it('should return empty string when date is an invalid string', () => {
      // Arrange
      const input = 'invalid date string';
      // Act
      const result = formatDate(input);
      // Assert
      expect(result).toBe('');
    });
  });
});

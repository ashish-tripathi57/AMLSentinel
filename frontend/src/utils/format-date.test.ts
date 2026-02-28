import { describe, it, expect, vi, afterEach } from 'vitest';
import { formatDate, formatDateShort, formatRelativeTime } from './format-date';

describe('formatDate', () => {
  it('formats a valid ISO date string', () => {
    const result = formatDate('2024-01-15T10:30:00Z');
    // Should contain the year and month abbreviation
    expect(result).toContain('2024');
    expect(result).toContain('Jan');
  });

  it('returns em dash for null', () => {
    expect(formatDate(null)).toBe('—');
  });

  it('returns em dash for undefined', () => {
    expect(formatDate(undefined)).toBe('—');
  });

  it('returns em dash for empty string', () => {
    expect(formatDate('')).toBe('—');
  });

  it('returns em dash for invalid date string', () => {
    expect(formatDate('not-a-date')).toBe('—');
  });

  it('includes time components', () => {
    const result = formatDate('2024-06-20T14:45:00Z');
    // Should have some form of time (14 or 45 present in output)
    expect(result).toMatch(/\d{2}:\d{2}/);
  });
});

describe('formatDateShort', () => {
  it('formats a valid ISO date string without time', () => {
    const result = formatDateShort('2024-03-22T08:00:00Z');
    expect(result).toContain('2024');
    expect(result).toContain('Mar');
    // Should NOT contain time separator colon
    expect(result).not.toMatch(/\d{2}:\d{2}/);
  });

  it('returns em dash for null', () => {
    expect(formatDateShort(null)).toBe('—');
  });

  it('returns em dash for undefined', () => {
    expect(formatDateShort(undefined)).toBe('—');
  });

  it('returns em dash for empty string', () => {
    expect(formatDateShort('')).toBe('—');
  });

  it('returns em dash for invalid date string', () => {
    expect(formatDateShort('invalid')).toBe('—');
  });
});

describe('formatRelativeTime', () => {
  const NOW = new Date('2024-06-15T12:00:00Z');

  afterEach(() => {
    vi.useRealTimers();
  });

  function withFakeTime(fn: () => void) {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    fn();
  }

  it('returns "just now" for dates less than a minute ago', () => {
    withFakeTime(() => {
      expect(formatRelativeTime('2024-06-15T11:59:30Z')).toBe('just now');
    });
  });

  it('returns minutes ago for dates less than an hour ago', () => {
    withFakeTime(() => {
      expect(formatRelativeTime('2024-06-15T11:55:00Z')).toBe('5 minutes ago');
    });
  });

  it('returns singular minute for exactly 1 minute ago', () => {
    withFakeTime(() => {
      expect(formatRelativeTime('2024-06-15T11:59:00Z')).toBe('1 minute ago');
    });
  });

  it('returns hours ago for dates less than a day ago', () => {
    withFakeTime(() => {
      expect(formatRelativeTime('2024-06-15T09:00:00Z')).toBe('3 hours ago');
    });
  });

  it('returns singular hour for exactly 1 hour ago', () => {
    withFakeTime(() => {
      expect(formatRelativeTime('2024-06-15T11:00:00Z')).toBe('1 hour ago');
    });
  });

  it('returns days ago for dates less than a month ago', () => {
    withFakeTime(() => {
      expect(formatRelativeTime('2024-06-12T12:00:00Z')).toBe('3 days ago');
    });
  });

  it('returns singular day for exactly 1 day ago', () => {
    withFakeTime(() => {
      expect(formatRelativeTime('2024-06-14T12:00:00Z')).toBe('1 day ago');
    });
  });

  it('returns months ago for dates less than a year ago', () => {
    withFakeTime(() => {
      expect(formatRelativeTime('2024-04-15T12:00:00Z')).toBe('2 months ago');
    });
  });

  it('returns years ago for old dates', () => {
    withFakeTime(() => {
      expect(formatRelativeTime('2022-06-15T12:00:00Z')).toBe('2 years ago');
    });
  });

  it('returns em dash for null', () => {
    expect(formatRelativeTime(null)).toBe('—');
  });

  it('returns em dash for undefined', () => {
    expect(formatRelativeTime(undefined)).toBe('—');
  });

  it('returns em dash for empty string', () => {
    expect(formatRelativeTime('')).toBe('—');
  });

  it('returns em dash for invalid date', () => {
    expect(formatRelativeTime('not-a-date')).toBe('—');
  });
});

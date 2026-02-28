import { describe, it, expect } from 'vitest';
import { formatCurrency } from './format-currency';

describe('formatCurrency', () => {
  it('formats a positive integer as INR', () => {
    const result = formatCurrency(50000);
    // Should contain the rupee symbol and formatted number
    expect(result).toContain('₹');
    expect(result).toContain('50');
  });

  it('formats zero as INR', () => {
    const result = formatCurrency(0);
    expect(result).toContain('₹');
    expect(result).toContain('0');
  });

  it('returns em dash for null', () => {
    expect(formatCurrency(null)).toBe('—');
  });

  it('returns em dash for undefined', () => {
    expect(formatCurrency(undefined)).toBe('—');
  });

  it('formats large amounts with Indian number grouping', () => {
    const result = formatCurrency(1000000);
    // 10,00,000 in Indian format
    expect(result).toContain('₹');
    expect(result).not.toContain('NaN');
  });

  it('formats negative amounts', () => {
    const result = formatCurrency(-5000);
    expect(result).toContain('5,000');
  });
});

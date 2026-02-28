/**
 * Formats a numeric amount as Indian Rupees (INR) using the en-IN locale.
 * Returns '—' for null/undefined values (indicating no data).
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—';

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

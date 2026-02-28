import { useState, useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useTransactions } from '../../hooks/use-transactions';
import { Card, CardHeader, CardContent, LoadingSpinner, EmptyState } from '../common';
import { formatCurrency } from '../../utils/format-currency';
import { formatDate, formatDateShort } from '../../utils/format-date';
import type { Transaction } from '../../types/transaction';

interface TransactionTimelineProps {
  alertId: string;
}

// Chart palette tokens mapped to transaction types
const TRANSACTION_TYPE_COLORS: Record<string, string> = {
  cash_deposit: '#2563EB',
  cash_withdrawal: '#DC2626',
  transfer: '#7C3AED',
  wire_transfer: '#EC4899',
  online_transfer: '#F59E0B',
  cheque: '#10B981',
  dd: '#6366F1',
  rtgs: '#06B6D4',
};

const FLAGGED_COLOR = '#DC2626';
const DEFAULT_COLOR = '#94A3B8';

/** Returns the dot color for a transaction based on type and flag status. */
function dotColor(tx: Transaction): string {
  if (tx.is_flagged) return FLAGGED_COLOR;
  return TRANSACTION_TYPE_COLORS[tx.transaction_type] ?? DEFAULT_COLOR;
}

type SortKey = keyof Pick<
  Transaction,
  'transaction_date' | 'transaction_type' | 'amount' | 'direction' | 'channel' | 'is_flagged'
>;

type SortDir = 'asc' | 'desc';

interface SortState {
  key: SortKey;
  dir: SortDir;
}

/** Direction badge: green for credit, red for debit, neutral otherwise. */
function DirectionBadge({ direction }: { direction: string }) {
  const normalized = direction.toLowerCase();
  const classes =
    normalized === 'credit'
      ? 'bg-severity-low/10 text-severity-low'
      : normalized === 'debit'
        ? 'bg-severity-critical/10 text-severity-critical'
        : 'bg-text-muted/10 text-text-muted';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${classes}`}>
      {direction}
    </span>
  );
}

/** Sortable column header — shows a caret when this column is active. */
function SortableHeader({
  label,
  sortKey,
  sort,
  onSort,
  align = 'left',
}: {
  label: string;
  sortKey: SortKey;
  sort: SortState;
  onSort: (key: SortKey) => void;
  align?: 'left' | 'right';
}) {
  const isActive = sort.key === sortKey;
  const caret = isActive ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : '';

  return (
    <th
      className={`py-2 pr-4 text-xs font-medium uppercase tracking-wide cursor-pointer select-none whitespace-nowrap text-${align} ${
        isActive ? 'text-primary' : 'text-text-muted'
      }`}
      onClick={() => onSort(sortKey)}
    >
      {label}
      {caret}
    </th>
  );
}

/**
 * Scatter chart of transactions: X = date, Y = amount.
 * Each dot is colored by transaction_type; flagged transactions use the critical red.
 */
function TransactionScatterChart({ transactions }: { transactions: Transaction[] }) {
  // Group by transaction_type for Recharts multi-series scatter
  const seriesMap = useMemo<Record<string, { x: number; y: number; id: string }[]>>(() => {
    const map: Record<string, { x: number; y: number; id: string }[]> = {};
    for (const tx of transactions) {
      const key = tx.is_flagged ? `${tx.transaction_type} (flagged)` : tx.transaction_type;
      if (!map[key]) map[key] = [];
      map[key].push({
        x: new Date(tx.transaction_date).getTime(),
        y: tx.amount,
        id: tx.id,
      });
    }
    return map;
  }, [transactions]);

  const seriesEntries = Object.entries(seriesMap);

  return (
    <div>
      <ResponsiveContainer width="100%" height={280}>
        <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis
            dataKey="x"
            type="number"
            domain={['auto', 'auto']}
            scale="time"
            tickFormatter={(ts: number) => formatDateShort(new Date(ts).toISOString())}
            tick={{ fontSize: 11, fill: '#94A3B8' }}
          />
          <YAxis
            dataKey="y"
            type="number"
            tickFormatter={(v: number) => formatCurrency(v)}
            width={100}
            tick={{ fontSize: 11, fill: '#94A3B8' }}
            label={{ value: 'Amount (INR)', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#64748B' }}
          />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const pt = payload[0].payload as { x: number; y: number };
              return (
                <div className="bg-card-bg border border-card-border rounded px-3 py-2 text-xs shadow-sm">
                  <p className="text-text-secondary">{formatDateShort(new Date(pt.x).toISOString())}</p>
                  <p className="text-text-primary font-medium">{formatCurrency(pt.y)}</p>
                </div>
              );
            }}
          />
          {seriesEntries.map(([type, points]) => {
            const isFlagged = type.endsWith('(flagged)');
            const baseType = isFlagged ? type.replace(' (flagged)', '') : type;
            const color = isFlagged
              ? FLAGGED_COLOR
              : (TRANSACTION_TYPE_COLORS[baseType] ?? DEFAULT_COLOR);
            return (
              <Scatter
                key={type}
                name={type}
                data={points}
                fill={color}
                opacity={0.8}
                shape={isFlagged ? 'star' : 'circle'}
              />
            );
          })}
        </ScatterChart>
      </ResponsiveContainer>
      {/* Custom multi-row legend */}
      <div className="flex flex-wrap justify-center gap-x-5 gap-y-1.5 pt-2 px-4">
        {seriesEntries.map(([type]) => {
          const isFlagged = type.endsWith('(flagged)');
          const baseType = isFlagged ? type.replace(' (flagged)', '') : type;
          const color = isFlagged
            ? FLAGGED_COLOR
            : (TRANSACTION_TYPE_COLORS[baseType] ?? DEFAULT_COLOR);
          return (
            <div key={type} className="flex items-center gap-1.5">
              <span
                className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="text-[11px] text-[#64748B] whitespace-nowrap">{type}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Sortable dense table of transactions. */
function TransactionTable({ transactions }: { transactions: Transaction[] }) {
  const [sort, setSort] = useState<SortState>({ key: 'transaction_date', dir: 'desc' });

  const sorted = useMemo(() => {
    return [...transactions].sort((a, b) => {
      let cmp = 0;
      const { key } = sort;

      if (key === 'transaction_date') {
        cmp = new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime();
      } else if (key === 'amount') {
        cmp = a.amount - b.amount;
      } else if (key === 'is_flagged') {
        cmp = Number(a.is_flagged) - Number(b.is_flagged);
      } else {
        const aVal = (a[key] ?? '').toString().toLowerCase();
        const bVal = (b[key] ?? '').toString().toLowerCase();
        cmp = aVal.localeCompare(bVal);
      }

      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [transactions, sort]);

  function handleSort(key: SortKey) {
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }
    );
  }

  if (transactions.length === 0) {
    return <p className="text-sm text-text-muted py-4 text-center">No transactions found.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-card-border">
            <SortableHeader label="Date" sortKey="transaction_date" sort={sort} onSort={handleSort} />
            <SortableHeader label="Type" sortKey="transaction_type" sort={sort} onSort={handleSort} />
            <SortableHeader label="Amount (INR)" sortKey="amount" sort={sort} onSort={handleSort} align="right" />
            <SortableHeader label="Direction" sortKey="direction" sort={sort} onSort={handleSort} />
            <SortableHeader label="Channel" sortKey="channel" sort={sort} onSort={handleSort} />
            <th className="py-2 pr-4 text-left text-xs text-text-muted font-medium uppercase tracking-wide">
              Counterparty
            </th>
            <th className="py-2 pr-4 text-left text-xs text-text-muted font-medium uppercase tracking-wide">
              Location
            </th>
            <SortableHeader label="Flagged" sortKey="is_flagged" sort={sort} onSort={handleSort} />
          </tr>
        </thead>
        <tbody className="divide-y divide-card-border">
          {sorted.map((tx) => (
            <tr key={tx.id} className={`hover:bg-page-bg transition-colors ${tx.is_flagged ? 'bg-severity-critical/5' : ''}`}>
              <td className="py-2 pr-4 text-text-secondary whitespace-nowrap">
                {formatDate(tx.transaction_date)}
              </td>
              <td className="py-2 pr-4 text-text-primary capitalize">
                {tx.transaction_type.replace(/_/g, ' ')}
              </td>
              <td className="py-2 pr-4 text-right text-text-primary font-medium">
                {formatCurrency(tx.amount)}
              </td>
              <td className="py-2 pr-4">
                <DirectionBadge direction={tx.direction} />
              </td>
              <td className="py-2 pr-4 text-text-primary">{tx.channel ?? '—'}</td>
              <td className="py-2 pr-4 text-text-primary">{tx.counterparty_name ?? '—'}</td>
              <td className="py-2 pr-4 text-text-primary">{tx.location ?? '—'}</td>
              <td className="py-2">
                {tx.is_flagged ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-severity-critical/10 text-severity-critical">
                    Yes
                  </span>
                ) : (
                  <span className="text-text-muted text-xs">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Transaction Timeline tab — scatter chart + sortable table of all transactions
 * linked to the alert, using Recharts for the visualisation.
 */
export function TransactionTimeline({ alertId }: TransactionTimelineProps) {
  const { transactions, isLoading, error } = useTransactions(alertId);

  if (isLoading) {
    return (
      <div
        role="tabpanel"
        id="tabpanel-transactions"
        aria-label="Transactions"
        className="flex items-center justify-center h-64"
      >
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div role="tabpanel" id="tabpanel-transactions" aria-label="Transactions" className="p-6">
        <EmptyState title="Failed to load transactions" description={error} />
      </div>
    );
  }

  return (
    <div
      role="tabpanel"
      id="tabpanel-transactions"
      aria-label="Transactions"
      className="p-6 flex flex-col gap-4"
    >
      {/* Scatter chart */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-text-primary">Transaction Overview</h3>
          <p className="text-xs text-text-muted mt-0.5">
            Dots colored by transaction type. Critical-red dots are flagged transactions.
          </p>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-sm text-text-muted py-4 text-center">No transactions to chart.</p>
          ) : (
            <TransactionScatterChart transactions={transactions} />
          )}
        </CardContent>
      </Card>

      {/* Dense sortable table */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-text-primary">
            Transaction Detail ({transactions.length})
          </h3>
          <p className="text-xs text-text-muted mt-0.5">Click column headers to sort.</p>
        </CardHeader>
        <CardContent>
          <TransactionTable transactions={transactions} />
        </CardContent>
      </Card>
    </div>
  );
}

// Export dotColor for tests
export { dotColor };

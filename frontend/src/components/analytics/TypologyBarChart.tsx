import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { TypologyBreakdown } from '../../types/analytics';

const CHART_COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
  'var(--color-chart-6)',
];

interface TypologyBarChartProps {
  data: TypologyBreakdown[];
}

/** Horizontal bar chart showing alert counts by AML typology. */
export function TypologyBarChart({ data }: TypologyBarChartProps) {
  if (data.length === 0) {
    return <p className="text-sm text-text-muted text-center py-8">No typology data available</p>;
  }

  const chartData = data.map((item, index) => ({
    ...item,
    fill: CHART_COLORS[index % CHART_COLORS.length],
  }));

  return (
    <div className="bg-card-bg border border-card-border rounded-xl p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-text-primary mb-4">Alerts by Typology</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 120 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-card-border)" />
          <XAxis type="number" tick={{ fontSize: 12 }} />
          <YAxis dataKey="typology" type="category" tick={{ fontSize: 11 }} width={110} />
          <Tooltip />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

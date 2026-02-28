import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { RiskScoreBucket } from '../../types/analytics';

interface RiskDistributionChartProps {
  data: RiskScoreBucket[];
}

/** Histogram showing alert count distribution across risk score buckets. */
export function RiskDistributionChart({ data }: RiskDistributionChartProps) {
  if (data.length === 0) {
    return <p className="text-sm text-text-muted text-center py-8">No risk distribution data available</p>;
  }

  return (
    <div className="bg-card-bg border border-card-border rounded-xl p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-text-primary mb-4">Risk Score Distribution</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-card-border)" />
          <XAxis dataKey="range" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="count" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

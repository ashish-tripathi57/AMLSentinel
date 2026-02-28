import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { FalsePositiveTrend } from '../../types/analytics';

interface FalsePositiveTrendChartProps {
  data: FalsePositiveTrend[];
}

/** Line chart showing weekly false positive rate over time. */
export function FalsePositiveTrendChart({ data }: FalsePositiveTrendChartProps) {
  if (data.length === 0) {
    return <p className="text-sm text-text-muted text-center py-8">No false positive trend data available</p>;
  }

  const chartData = data.map((item) => ({
    ...item,
    ratePercent: +(item.rate * 100).toFixed(1),
  }));

  return (
    <div className="bg-card-bg border border-card-border rounded-xl p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-text-primary mb-4">False Positive Rate Trend</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-card-border)" />
          <XAxis dataKey="week" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 12 }} unit="%" />
          <Tooltip formatter={(value: number) => [`${value}%`, 'FP Rate']} />
          <Line
            type="monotone"
            dataKey="ratePercent"
            stroke="var(--color-chart-6)"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

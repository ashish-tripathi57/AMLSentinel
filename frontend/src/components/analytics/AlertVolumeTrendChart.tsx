import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { AlertVolumeTrend } from '../../types/analytics';

interface AlertVolumeTrendChartProps {
  data: AlertVolumeTrend[];
}

/** Line chart showing daily alert volume over time. */
export function AlertVolumeTrendChart({ data }: AlertVolumeTrendChartProps) {
  if (data.length === 0) {
    return <p className="text-sm text-text-muted text-center py-8">No volume trend data available</p>;
  }

  return (
    <div className="bg-card-bg border border-card-border rounded-xl p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-text-primary mb-4">Alert Volume Trend</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-card-border)" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="count"
            stroke="var(--color-chart-1)"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

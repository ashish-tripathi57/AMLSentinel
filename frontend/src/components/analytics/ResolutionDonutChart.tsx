import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { ResolutionBreakdown } from '../../types/analytics';

const CHART_COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-3)',
  'var(--color-chart-5)',
  'var(--color-chart-4)',
  'var(--color-chart-6)',
];

interface ResolutionDonutChartProps {
  data: ResolutionBreakdown[];
}

/** Donut chart showing resolution outcome distribution for closed alerts. */
export function ResolutionDonutChart({ data }: ResolutionDonutChartProps) {
  if (data.length === 0) {
    return <p className="text-sm text-text-muted text-center py-8">No resolution data available</p>;
  }

  return (
    <div className="bg-card-bg border border-card-border rounded-xl p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-text-primary mb-4">Resolution Breakdown</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="resolution"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
          >
            {data.map((_entry, index) => (
              <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend verticalAlign="bottom" height={36} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

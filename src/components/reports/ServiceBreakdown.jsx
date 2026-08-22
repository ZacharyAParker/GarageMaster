
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { JOB_STATUS_LABELS } from '@/lib/constants';

const COLORS = ['#ea580c', '#3b82f6', '#10b981', '#eab308', '#a855f7', '#ef4444', '#14b8a6', '#f97316', '#64748b', '#ec4899', '#22d3ee', '#84cc16'];

const tooltipStyle = {
  backgroundColor: '#0f172a',
  border: '1px solid #334155',
  borderRadius: '8px',
  color: '#e2e8f0',
};

/** Job volume by status as a pie chart with percentages. */
export default function ServiceBreakdown({ jobs }) {
  const counts = {};
  for (const j of jobs) {
    const key = j.status || 'intake';
    counts[key] = (counts[key] || 0) + 1;
  }
  const data = Object.entries(counts)
    .map(([status, count]) => ({
      name: JOB_STATUS_LABELS[status] || status,
      value: count,
    }))
    .sort((a, b) => b.value - a.value);

  if (data.length === 0) return null;
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="45%"
            innerRadius={55}
            outerRadius={95}
            paddingAngle={2}
            label={({ value }) => `${Math.round((value / total) * 100)}%`}
            labelLine={{ stroke: '#475569' }}
          >
            {data.map((entry, i) => (
              <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [`${value} jobs (${Math.round((value / total) * 100)}%)`, name]} />
          <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}


import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

const tooltipStyle = {
  backgroundColor: '#0f172a',
  border: '1px solid #334155',
  borderRadius: '8px',
  color: '#e2e8f0',
};

/** Monthly revenue for the last 12 months: bars = job revenue, line = invoiced. */
export default function RevenueChart({ data }) {
  if (!data || data.length === 0) return null;
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#334155' }} tickLine={false} />
          <YAxis
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
          />
          <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [`$${Number(value).toLocaleString()}`, name === 'revenue' ? 'Job Revenue' : 'Invoiced']} cursor={{ fill: '#1e293b55' }} />
          <Legend wrapperStyle={{ color: '#94a3b8' }} />
          <Bar dataKey="revenue" name="revenue" fill="#ea580c" radius={[4, 4, 0, 0]} maxBarSize={36} />
          <Line type="monotone" dataKey="invoiced" name="invoiced" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

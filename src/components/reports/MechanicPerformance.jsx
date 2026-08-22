
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Trophy } from 'lucide-react';
import { formatMoney } from '@/lib/format';

const tooltipStyle = {
  backgroundColor: '#0f172a',
  border: '1px solid #334155',
  borderRadius: '8px',
  color: '#e2e8f0',
};

/**
 * Mechanic performance horizontal bars. `stats` is an array of
 * { name, jobs, revenue, avgTurnaround } already filtered to the date range.
 */
export default function MechanicPerformance({ stats }) {
  if (!stats || stats.length === 0) return null;
  const top = [...stats].sort((a, b) => b.revenue - a.revenue)[0];

  return (
    <div>
      {top && top.revenue > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-gradient-to-r from-orange-900/30 to-transparent border border-orange-800/50">
          <Trophy className="w-5 h-5 text-orange-400" />
          <div>
            <p className="text-xs text-orange-300">Top performer this period</p>
            <p className="text-sm font-semibold text-slate-100">
              {top.name} - {top.jobs} jobs · {formatMoney(top.revenue)} revenue
            </p>
          </div>
        </div>
      )}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={stats} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
            <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" width={110} tick={{ fill: '#cbd5e1', fontSize: 12 }} axisLine={{ stroke: '#334155' }} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#1e293b55' }} />
            <Legend wrapperStyle={{ color: '#94a3b8' }} />
            <Bar dataKey="jobs" name="Jobs completed" fill="#3b82f6" radius={[0, 4, 4, 0]} maxBarSize={14} />
            <Bar dataKey="avgTurnaround" name="Avg turnaround (days)" fill="#10b981" radius={[0, 4, 4, 0]} maxBarSize={14} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

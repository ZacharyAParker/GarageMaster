import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { format, subMonths, startOfMonth } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import { TrendingUp } from "lucide-react";

/**
 * Completed-job revenue over the last 6 months.
 * Pure function of `jobs` - no data fetching, so it can sit anywhere on the dashboard.
 */
export default function TrendChartWidget({ jobs = [] }) {
  const data = React.useMemo(() => {
    // Build 6 buckets (5 months ago .. current month)
    const buckets = [];
    for (let i = 5; i >= 0; i--) {
      const d = startOfMonth(subMonths(new Date(), i));
      buckets.push({
        key: format(d, "yyyy-MM"),
        label: format(d, "MMM"),
        revenue: 0,
        count: 0,
      });
    }
    const byKey = Object.fromEntries(buckets.map((b) => [b.key, b]));

    for (const job of jobs) {
      if (job.status !== "completed" || !job.completed_date) continue;
      const key = format(new Date(job.completed_date), "yyyy-MM");
      const bucket = byKey[key];
      if (bucket) {
        bucket.revenue += Number(job.total_cost) || 0;
        bucket.count += 1;
      }
    }
    return buckets;
  }, [jobs]);

  const total = data.reduce((sum, b) => sum + b.revenue, 0);

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader className="border-b border-slate-800">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-orange-400" />
            <CardTitle className="text-lg font-bold text-slate-100">Revenue Trend</CardTitle>
          </div>
          <span className="text-sm text-slate-400">
            Last 6 months · <span className="text-orange-400 font-semibold">{formatMoney(total)}</span>
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-6 pb-4">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f97316" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#f97316" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "#94a3b8", fontSize: 12 }}
              axisLine={{ stroke: "#334155" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#94a3b8", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={56}
              tickFormatter={(v) =>
                v >= 1000 ? `$${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k` : `$${v}`
              }
            />
            <Tooltip
              cursor={{ stroke: "#475569", strokeDasharray: "4 4" }}
              contentStyle={{
                backgroundColor: "#0f172a",
                border: "1px solid #334155",
                borderRadius: "8px",
                color: "#e2e8f0",
              }}
              labelStyle={{ color: "#f97316", fontWeight: 600 }}
              formatter={(value, name, entry) => [
                `${formatMoney(value)} · ${entry?.payload?.count ?? 0} job(s)`,
                "Revenue",
              ]}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#f97316"
              strokeWidth={2}
              fill="url(#revenueGradient)"
              dot={{ r: 3, fill: "#f97316", strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

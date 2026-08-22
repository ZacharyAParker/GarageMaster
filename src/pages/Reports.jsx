import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DollarSign,
  Receipt,
  CheckCircle,
  Gauge,
  Clock,
  Package,
  Download,
} from 'lucide-react';
import {
  eachMonthOfInterval,
  endOfMonth,
  endOfYear,
  format,
  isWithinInterval,
  startOfMonth,
  subDays,
  subMonths,
  differenceInCalendarDays,
  parseISO,
} from 'date-fns';

import KpiCards from '@/components/reports/KpiCards';
import RevenueChart from '@/components/reports/RevenueChart';
import ServiceBreakdown from '@/components/reports/ServiceBreakdown';
import MechanicPerformance from '@/components/reports/MechanicPerformance';
import { formatMoney } from '@/lib/format';

const RANGES = [
  { id: 'this_month', label: 'This Month' },
  { id: 'last_month', label: 'Last Month' },
  { id: '90d', label: 'Last 90 Days' },
  { id: 'year', label: 'This Year' },
  { id: 'all', label: 'All Time' },
];

function rangeFor(id) {
  const now = new Date();
  switch (id) {
    case 'this_month':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'last_month': {
      const lm = subMonths(now, 1);
      return { start: startOfMonth(lm), end: endOfMonth(lm) };
    }
    case '90d':
      return { start: subDays(now, 90), end: now };
    case 'year':
      return { start: new Date(now.getFullYear(), 0, 1), end: endOfYear(now) };
    default:
      return { start: new Date(2000, 0, 1), end: new Date(2100, 0, 1) };
  }
}

const toDate = (d) => {
  if (!d) return null;
  try { return parseISO(d); } catch { return null; }
};

export default function Reports() {
  const [rangeId, setRangeId] = useState('this_year');

  const { data: jobs = [] } = useQuery({ queryKey: ['jobs'], queryFn: () => api.entities.Job.list() });
  const { data: invoices = [] } = useQuery({ queryKey: ['invoices'], queryFn: () => api.entities.Invoice.list() });
  const { data: vehicles = [] } = useQuery({ queryKey: ['vehicles'], queryFn: () => api.entities.Vehicle.list() });
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: () => api.entities.Customer.list() });
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: () => api.auth.listUsers() });

  const range = rangeFor(rangeId);

  const inRangeJobs = useMemo(
    () =>
      jobs.filter((j) => {
        if (j.status === 'cancelled') return false;
        const d = toDate(j.check_in_date);
        return d && isWithinInterval(d, range);
      }),
    [jobs, rangeId]
  );

  const completedInRange = inRangeJobs.filter((j) => j.status === 'completed');

  const revenueByMonth = useMemo(() => {
    const months = eachMonthOfInterval({
      start: rangeId === 'all' ? subMonths(new Date(), 11) : range.start,
      end: rangeId === 'all' ? new Date() : range.end,
    });
    const base = months.map((m) => ({
      month: format(m, 'MMM'),
      revenue: 0,
      invoiced: 0,
      _key: format(m, 'yyyy-MM'),
    }));
    const idx = Object.fromEntries(base.map((b, i) => [b._key, i]));
    for (const j of jobs) {
      if (j.status !== 'completed' || j.status === 'cancelled') continue;
      const d = toDate(j.completed_date || j.check_in_date);
      if (!d) continue;
      const key = format(d, 'yyyy-MM');
      if (key in idx) base[idx[key]].revenue += j.total_cost || 0;
    }
    for (const inv of invoices) {
      if (inv.status === 'void') continue;
      const d = toDate(inv.issue_date);
      if (!d) continue;
      const key = format(d, 'yyyy-MM');
      if (key in idx) base[idx[key]].invoiced += inv.total || 0;
    }
    return base.map(({ _key, ...rest }) => rest);
  }, [jobs, invoices, rangeId]);

  const kpis = useMemo(() => {
    const paidRevenue = invoices
      .filter((inv) => ['paid', 'partial_paid'].includes(inv.status))
      .reduce((s, inv) => s + (inv.amount_paid || 0), 0);
    const outstandingAR = invoices
      .filter((inv) => ['unpaid', 'partial_paid'].includes(inv.status))
      .reduce((s, inv) => s + ((inv.balance_due ?? (inv.total || 0) - (inv.amount_paid || 0))), 0);
    const jobRevenue = completedInRange.reduce((s, j) => s + (j.total_cost || 0), 0);
    const avgJobValue = completedInRange.length
      ? jobRevenue / completedInRange.length
      : 0;

    const turnaroundDays = completedInRange
      .map((j) => {
        const a = toDate(j.check_in_date);
        const b = toDate(j.completed_date);
        return a && b ? differenceInCalendarDays(b, a) : null;
      })
      .filter((v) => v != null && v >= 0);
    const avgTurnaround = turnaroundDays.length
      ? turnaroundDays.reduce((s, v) => s + v, 0) / turnaroundDays.length
      : 0;

    // Month-over-month revenue trend
    const thisMonthKey = format(new Date(), 'yyyy-MM');
    const lastMonthKey = format(subMonths(new Date(), 1), 'yyyy-MM');
    const sumFor = (key) =>
      jobs
        .filter(
          (j) =>
            j.status === 'completed' &&
            format(toDate(j.completed_date || j.check_in_date) || new Date(0), 'yyyy-MM') === key
        )
        .reduce((s, j) => s + (j.total_cost || 0), 0);
    const tm = sumFor(thisMonthKey);
    const lm = sumFor(lastMonthKey);
    const trend = lm > 0 ? ((tm - lm) / lm) * 100 : tm > 0 ? 100 : 0;

    return [
      { label: 'Collected Revenue', value: formatMoney(paidRevenue), icon: DollarSign, iconClass: 'text-green-400' },
      { label: 'Outstanding AR', value: formatMoney(Math.max(outstandingAR, 0)), icon: Receipt, iconClass: 'text-red-400' },
      { label: 'Job Revenue', value: formatMoney(jobRevenue), icon: DollarSign, iconClass: 'text-orange-400', trend },
      { label: 'Jobs Completed', value: String(completedInRange.length), icon: CheckCircle, iconClass: 'text-blue-400' },
      { label: 'Avg Job Value', value: formatMoney(avgJobValue), icon: Gauge, iconClass: 'text-purple-400' },
      { label: 'Avg Turnaround', value: `${avgTurnaround.toFixed(1)} days`, icon: Clock, iconClass: 'text-teal-400' },
    ];
  }, [invoices, completedInRange, jobs]);

  const mechanicStats = useMemo(() => {
    const staff = users.filter((u) =>
      ['admin', 'manager', 'service_advisor', 'mechanic'].includes(u.position)
    );
    return staff
      .map((u) => {
        const theirs = completedInRange.filter((j) => j.assigned_mechanic_id === u.id);
        const revenue = theirs.reduce((s, j) => s + (j.total_cost || 0), 0);
        const turns = theirs
          .map((j) => {
            const a = toDate(j.check_in_date);
            const b = toDate(j.completed_date);
            return a && b ? differenceInCalendarDays(b, a) : null;
          })
          .filter((v) => v != null && v >= 0);
        return {
          name: u.full_name || u.email,
          jobs: theirs.length,
          revenue,
          avgTurnaround: turns.length ? Math.round((turns.reduce((s, v) => s + v, 0) / turns.length) * 10) / 10 : 0,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [users, completedInRange]);

  const vehicleLabel = (id) => {
    const v = vehicles.find((x) => x.id === id);
    return v ? `${v.year} ${v.make} ${v.model}` : '';
  };
  const customerLabel = (id) => customers.find((x) => x.id === id)?.full_name || '';

  const exportCsv = () => {
    const rows = [
      ['Job Number', 'Vehicle', 'Customer', 'Status', 'Priority', 'Total Cost', 'Check-in', 'Completed'],
      ...inRangeJobs.map((j) => [
        j.job_number || '',
        vehicleLabel(j.vehicle_id),
        customerLabel(j.customer_id),
        j.status || '',
        j.priority || '',
        (j.total_cost || 0).toFixed(2),
        j.check_in_date || '',
        j.completed_date || '',
      ]),
    ];
    const csv = rows
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `garagemaster-jobs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const hasData = inRangeJobs.length > 0 || invoices.length > 0;

  return (
    <div className="p-6 space-y-6 bg-slate-950 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Reports &amp; Insights</h1>
          <p className="text-slate-400 mt-1">Shop performance at a glance</p>
        </div>
        <Button
          onClick={exportCsv}
          variant="outline"
          className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Range selector */}
      <div className="flex flex-wrap gap-2">
        {RANGES.map((r) => (
          <button
            key={r.id}
            onClick={() => setRangeId(r.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              rangeId === r.id
                ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-lg shadow-orange-900/40'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {!hasData ? (
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="py-16 text-center">
            <Package className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-300">No data in this range</h3>
            <p className="text-slate-500 mt-1">
              Complete some jobs or issue invoices and the numbers will show up here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <KpiCards kpis={kpis} />

          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="bg-slate-900 border-slate-800 lg:col-span-2">
              <CardHeader className="border-b border-slate-800 pb-3">
                <CardTitle className="text-lg text-slate-100">Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <RevenueChart data={revenueByMonth} />
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="border-b border-slate-800 pb-3">
                <CardTitle className="text-lg text-slate-100">Work Mix</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <ServiceBreakdown jobs={inRangeJobs.length ? inRangeJobs : jobs} />
              </CardContent>
            </Card>
          </div>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="border-b border-slate-800 pb-3">
              <CardTitle className="text-lg text-slate-100">Mechanic Performance</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <MechanicPerformance stats={mechanicStats} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

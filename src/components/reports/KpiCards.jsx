
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function KpiCards({ kpis }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      {kpis.map((kpi) => (
        <Card key={kpi.label} className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400 font-medium">{kpi.label}</span>
              <kpi.icon className={`w-4 h-4 ${kpi.iconClass || 'text-slate-500'}`} />
            </div>
            <div className="text-xl font-bold text-slate-100">{kpi.value}</div>
            {kpi.trend != null && (
              <div
                className={`flex items-center gap-1 text-xs mt-1 ${
                  kpi.trend >= 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {kpi.trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span>
                  {kpi.trend >= 0 ? '+' : ''}
                  {kpi.trend.toFixed(1)}% vs last month
                </span>
              </div>
            )}
            {kpi.sub && <p className="text-xs text-slate-500 mt-1">{kpi.sub}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

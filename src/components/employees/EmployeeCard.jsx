

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wrench, Clock, DollarSign, Trophy, Zap, Edit, Eye } from "lucide-react";
import { POSITION_LABELS } from "@/lib/constants";
import { initials } from "@/lib/format";

/** XP level derived from stored xp_points (1000 XP per level). */
function xpLevel(user) {
  if (!user) return 1;
  return Math.floor((user.xp_points || 0) / 1000) + 1;
}

export default function EmployeeCard({ employee, stats, isTopPerformer, onView, onEdit, canEdit }) {
  const positionLabel = POSITION_LABELS[employee.position] || "Pending Setup";
  const level = xpLevel(employee);
  const completedJobs = employee.jobs_completed ?? stats?.completedJobs ?? 0;

  return (
    <Card className={`${isTopPerformer ? 'bg-gradient-to-br from-orange-900/30 to-orange-800/20 border-orange-700' : 'bg-slate-800/50 border-slate-700'} transition-all duration-200 hover:border-orange-600`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {employee.avatar_url ? (
              <img src={employee.avatar_url} alt={employee.full_name} className="w-14 h-14 rounded-full object-cover" />
            ) : (
              <div className="w-14 h-14 bg-gradient-to-br from-orange-600 to-orange-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-xl">
                  {initials(employee.full_name)}
                </span>
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-200">{employee.full_name}</h3>
                {isTopPerformer && <Trophy className="w-4 h-4 text-yellow-400 fill-yellow-400" />}
              </div>
              {/* Position badge from the central label contract */}
              <Badge className="mt-1 bg-orange-900/40 text-orange-300 border-orange-800">
                {positionLabel}
              </Badge>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 text-right">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-900/70 border border-yellow-700/50 text-xs font-bold text-yellow-400">
              <Zap className="w-3 h-3" />
              Lv. {level}
            </span>
            <span className="text-xs text-slate-500">{employee.xp_points || 0} XP</span>
          </div>
        </div>

        {employee.specialties && employee.specialties.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {employee.specialties.map((specialty, idx) => (
              <Badge key={idx} variant="outline" className="bg-slate-900 text-slate-400 border-slate-700 capitalize">
                {specialty}
              </Badge>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-slate-900/50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Wrench className="w-4 h-4 text-green-400" />
              <span className="text-xs text-slate-400">Jobs Completed</span>
            </div>
            <p className="text-xl font-bold text-slate-100">{completedJobs}</p>
          </div>

          <div className="p-3 bg-slate-900/50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-orange-400" />
              <span className="text-xs text-slate-400">Active</span>
            </div>
            <p className="text-xl font-bold text-slate-100">{stats?.activeJobs ?? 0}</p>
          </div>

          <div className="p-3 bg-slate-900/50 rounded-lg col-span-2">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-green-400" />
              <span className="text-xs text-slate-400">Total Revenue</span>
            </div>
            <p className="text-xl font-bold text-green-400">${(stats?.totalRevenue ?? 0).toLocaleString()}</p>
          </div>
        </div>

        {employee.hourly_wage != null && (
          <div className="mt-4 pt-4 border-t border-slate-700 flex items-center justify-between">
            <span className="text-xs text-slate-400">Hourly Wage</span>
            <span className="text-sm font-semibold text-slate-200">${Number(employee.hourly_wage).toFixed(2)}/hr</span>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <Button
            size="sm"
            variant="outline"
            onClick={onView}
            className="flex-1 bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
          >
            <Eye className="w-3 h-3 mr-1" />
            View
          </Button>
          {canEdit && (
            <Button
              size="sm"
              variant="outline"
              onClick={onEdit}
              className="bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
            >
              <Edit className="w-3 h-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

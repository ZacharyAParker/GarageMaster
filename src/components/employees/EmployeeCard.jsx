
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wrench, Star, CheckCircle, Clock, DollarSign, Trophy, Edit, Eye } from "lucide-react";

export default function EmployeeCard({ employee, stats, isTopPerformer, onView, onEdit, canEdit }) {
  const getRoleDisplay = (position) => {
    const roleMap = {
      'admin': 'Administrator',
      'manager': 'Manager',
      'mechanic': 'Mechanic',
      'service_advisor': 'Service Advisor',
      'parts_specialist': 'Parts Specialist',
      'customer': 'Customer'
    };
    // Default to 'Mechanic' or the raw role if not found, but prefer mapped value.
    return roleMap[position] || (position ? position.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : 'Mechanic');
  };

  return (
    <Card className={`${isTopPerformer ? 'bg-gradient-to-br from-orange-900/30 to-orange-800/20 border-orange-700' : 'bg-slate-800/50 border-slate-700'} transition-all duration-200 hover:border-orange-600`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {employee.avatar_url ? (
              <img src={employee.avatar_url} alt={employee.full_name} className="w-14 h-14 rounded-full object-cover" />
            ) : (
              <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-xl">
                  {employee.full_name?.[0]?.toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-200">{employee.full_name}</h3>
                {isTopPerformer && <Trophy className="w-4 h-4 text-yellow-400 fill-yellow-400" />}
              </div>
              {/* Updated to use employee.role and getRoleDisplay */}
              <p className="text-sm text-slate-400">{getRoleDisplay(employee.role)}</p>
            </div>
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
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-xs text-slate-400">Completed</span>
            </div>
            <p className="text-xl font-bold text-slate-100">{stats.completedJobs}</p>
          </div>

          <div className="p-3 bg-slate-900/50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-orange-400" />
              <span className="text-xs text-slate-400">Active</span>
            </div>
            <p className="text-xl font-bold text-slate-100">{stats.activeJobs}</p>
          </div>

          <div className="p-3 bg-slate-900/50 rounded-lg col-span-2">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-green-400" />
              <span className="text-xs text-slate-400">Total Revenue</span>
            </div>
            <p className="text-xl font-bold text-green-400">${stats.totalRevenue.toLocaleString()}</p>
          </div>
        </div>

        {employee.skill_level && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Skill Level</span>
              <div className="flex items-center gap-1">
                {Array.from({ length: employee.skill_level }).map((_, i) => (
                  <Star key={i} className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                ))}
                {Array.from({ length: 10 - employee.skill_level }).map((_, i) => (
                  <Star key={i} className="w-3 h-3 text-slate-700" />
                ))}
              </div>
            </div>
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

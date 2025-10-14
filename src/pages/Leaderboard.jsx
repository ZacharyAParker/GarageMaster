
import React from "react";
import api from "@/api/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star, Zap, TrendingUp, Award } from "lucide-react";

export default function Leaderboard() {
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
  queryFn: () => api.entities.User.list()
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
  queryFn: () => api.entities.Job.list()
  });

  const getMechanicStats = (userId) => {
    const mechanicJobs = jobs.filter(j => j.assigned_mechanic_id === userId);
    const completedJobs = mechanicJobs.filter(j => j.status === 'completed');
    const totalRevenue = completedJobs.reduce((sum, j) => sum + (j.total_cost || 0), 0);
    const avgRating = completedJobs.length > 0 ? 4.5 : 0; // Simulated for now
    
    return {
      completedJobs: completedJobs.length,
      totalRevenue,
      avgRating,
      xp: (completedJobs.length * 100) + (totalRevenue * 0.1)
    };
  };

  // Only show employees with assigned positions
  const mechanics = users
    .filter(u => u.position && (u.position === 'mechanic' || u.position === 'admin' || u.position === 'manager'))
    .map(mechanic => ({
      ...mechanic,
      stats: getMechanicStats(mechanic.id)
    }))
    .sort((a, b) => b.stats.xp - a.stats.xp);

  const topPerformer = mechanics[0];
  const speedKing = [...mechanics].sort((a, b) => b.stats.completedJobs - a.stats.completedJobs)[0];
  const revenueLeader = [...mechanics].sort((a, b) => b.stats.totalRevenue - a.stats.totalRevenue)[0];

  return (
    <div className="p-6 space-y-6 bg-slate-950 min-h-screen">
      <div>
        <h1 className="text-3xl font-bold text-slate-100">Performance Leaderboard</h1>
        <p className="text-slate-400 mt-1">Compete with your team and earn achievements</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-orange-900/30 to-orange-800/20 border-orange-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-600 to-orange-500 rounded-full flex items-center justify-center">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-orange-300">Top Performer</p>
                <p className="text-lg font-bold text-orange-400">{topPerformer?.full_name || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 border-blue-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-500 rounded-full flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-blue-300">Speed King</p>
                <p className="text-lg font-bold text-blue-400">{speedKing?.full_name || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-900/30 to-green-800/20 border-green-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-green-500 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-green-300">Revenue Leader</p>
                <p className="text-lg font-bold text-green-400">{revenueLeader?.full_name || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="border-b border-slate-800">
          <CardTitle className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-orange-500" />
            Rankings
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {mechanics.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="w-16 h-16 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-500">No active employees yet</p>
              <p className="text-slate-600 text-sm mt-2">Assign positions to team members to start tracking performance</p>
            </div>
          ) : (
            <div className="space-y-4">
              {mechanics.map((mechanic, index) => (
                <div 
                  key={mechanic.id}
                  className={`flex items-center gap-4 p-4 rounded-lg ${
                    index === 0 ? 'bg-gradient-to-r from-orange-900/30 to-orange-800/20 border border-orange-800' :
                    index === 1 ? 'bg-gradient-to-r from-slate-800 to-slate-700 border border-slate-600' :
                    index === 2 ? 'bg-gradient-to-r from-amber-900/20 to-amber-800/10 border border-amber-900' :
                    'bg-slate-800/50 border border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-900 font-bold text-xl text-slate-100">
                    {index + 1}
                  </div>

                  {mechanic.avatar_url ? (
                    <img src={mechanic.avatar_url} alt={mechanic.full_name} className="w-14 h-14 rounded-full object-cover" />
                  ) : (
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-xl">
                        {mechanic.full_name?.[0]?.toUpperCase()}
                      </span>
                    </div>
                  )}

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-100">{mechanic.full_name}</h3>
                      {index < 3 && <Award className="w-5 h-5 text-orange-400" />}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-400">
                      <span>{mechanic.stats.completedJobs} jobs</span>
                      <span>${mechanic.stats.totalRevenue.toLocaleString()}</span>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        <span>{mechanic.stats.avgRating.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-2xl font-bold text-orange-500">{Math.round(mechanic.stats.xp)}</p>
                    <p className="text-xs text-slate-500">XP</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

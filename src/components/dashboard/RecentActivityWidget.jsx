
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export default function RecentActivityWidget({ jobs }) {
  const recentJobs = jobs.slice(0, 8);

  const getActivityIcon = (status) => {
    if (status === 'completed') return <CheckCircle className="w-4 h-4 text-green-400" />;
    if (status === 'in_progress') return <Clock className="w-4 h-4 text-orange-400" />;
    return <AlertCircle className="w-4 h-4 text-blue-400" />;
  };

  return (
    <Card className="shadow-xl border-slate-800 bg-slate-900">
      <CardHeader className="border-b border-slate-800 bg-slate-900/50">
        <CardTitle className="text-xl font-bold text-slate-100">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {recentJobs.length === 0 ? (
          <p className="text-center text-slate-500 py-8">No recent activity</p>
        ) : (
          <div className="space-y-4">
            {recentJobs.map((job) => (
              <div key={job.id} className="flex items-start gap-3 pb-3 border-b border-slate-800 last:border-0">
                <div className="mt-1">
                  {getActivityIcon(job.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200">
                    {job.job_number || `Job #${job.id.slice(0, 8)}`}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">{job.description?.substring(0, 50)}...</p>
                  <p className="text-xs text-slate-600 mt-1">
                    {format(new Date(job.created_date), "MMM d, h:mm a")}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs bg-slate-800 text-slate-300 border-slate-700">
                  {job.status?.replace(/_/g, ' ')}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
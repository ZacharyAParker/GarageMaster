
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowRight, Clock, AlertTriangle } from "lucide-react";

const statusColors = {
  intake: "bg-slate-700 text-slate-300 border-0",
  awaiting_diagnosis: "bg-blue-900/50 text-blue-300 border-0",
  diagnosis_complete: "bg-purple-900/50 text-purple-300 border-0",
  awaiting_approval: "bg-yellow-900/50 text-yellow-300 border-0",
  approved: "bg-green-900/50 text-green-300 border-0",
  in_progress: "bg-orange-900/50 text-orange-300 border-0",
  waiting_for_parts: "bg-red-900/50 text-red-300 border-0",
  quality_check: "bg-indigo-900/50 text-indigo-300 border-0",
  ready_for_pickup: "bg-emerald-900/50 text-emerald-300 border-0"
};

const priorityIcons = {
  urgent: <AlertTriangle className="w-3 h-3 text-red-400" />,
  high: <Clock className="w-3 h-3 text-orange-400" />
};

export default function ActiveJobsWidget({ jobs }) {
  const displayJobs = jobs.slice(0, 5);

  return (
    <Card className="shadow-xl border-slate-800 bg-slate-900">
      <CardHeader className="border-b border-slate-800 bg-slate-900/50">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-bold text-slate-100">Active Work Orders</CardTitle>
          <Link to={createPageUrl("Jobs")}>
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-200 hover:bg-slate-800">
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {displayJobs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500">No active jobs at the moment</p>
            <Link to={createPageUrl("Jobs")}>
              <Button className="mt-4 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400">
                Create First Job
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {displayJobs.map((job) => (
              <div key={job.id} className="p-4 border border-slate-800 bg-slate-800/50 rounded-lg hover:border-orange-600 hover:shadow-lg hover:shadow-orange-900/20 transition-all duration-200">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-slate-200">{job.job_number || `Job #${job.id.slice(0, 8)}`}</h4>
                      {priorityIcons[job.priority]}
                    </div>
                    <p className="text-sm text-slate-400 mt-1">{job.description?.substring(0, 60)}...</p>
                  </div>
                  <Badge className={statusColors[job.status] || "bg-slate-700"}>
                    {job.status?.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-500 mt-3">
                  <span>Mechanic: {job.assigned_mechanic_id ? 'Assigned' : 'Unassigned'}</span>
                  <Link to={`${createPageUrl("Jobs")}?job=${job.id}`}>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-orange-400 hover:text-orange-300 hover:bg-slate-700">
                      View Details
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
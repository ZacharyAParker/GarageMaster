
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Edit, AlertTriangle, Clock, User, Car } from "lucide-react";
import { format } from "date-fns";

const statusColors = {
  intake: "bg-slate-700 text-slate-300 border-0",
  awaiting_diagnosis: "bg-blue-900/50 text-blue-300 border-0",
  diagnosis_complete: "bg-purple-900/50 text-purple-300 border-0",
  awaiting_approval: "bg-yellow-900/50 text-yellow-300 border-0",
  approved: "bg-green-900/50 text-green-300 border-0",
  in_progress: "bg-orange-900/50 text-orange-300 border-0",
  waiting_for_parts: "bg-red-900/50 text-red-300 border-0",
  quality_check: "bg-indigo-900/50 text-indigo-300 border-0",
  ready_for_pickup: "bg-emerald-900/50 text-emerald-300 border-0",
  completed: "bg-slate-800 text-slate-400 border-0",
  cancelled: "bg-slate-900 text-slate-500 border-0"
};

const priorityIcons = {
  urgent: <AlertTriangle className="w-4 h-4 text-red-400" />,
  high: <Clock className="w-4 h-4 text-orange-400" />
};

export default function JobBoard({ jobs, vehicles, customers, employees, onSelectJob, onEditJob }) {
  const getVehicleInfo = (vehicleId) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'Unknown Vehicle';
  };

  const getCustomerName = (customerId) => {
    return customers.find(c => c.id === customerId)?.full_name || 'Unknown';
  };

  const getMechanicName = (mechanicId) => {
    if (!mechanicId) return 'Unassigned';
    return employees.find(e => e.id === mechanicId)?.full_name || 'Unknown';
  };

  if (jobs.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">No jobs found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {jobs.map((job) => (
        <Card key={job.id} className="bg-slate-800/50 border-slate-700 hover:border-orange-600 transition-all duration-200 cursor-pointer" onClick={() => onSelectJob(job)}>
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-200">
                  {job.job_number || `Job #${job.id.slice(0, 8)}`}
                </h3>
                {priorityIcons[job.priority]}
              </div>
              <Badge className={statusColors[job.status] || statusColors.intake}>
                {job.status?.replace(/_/g, ' ')}
              </Badge>
            </div>

            <p className="text-sm text-slate-400 mb-3 line-clamp-2">{job.description}</p>

            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-slate-400">
                <Car className="w-3 h-3" />
                <span className="truncate">{getVehicleInfo(job.vehicle_id)}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <User className="w-3 h-3" />
                <span>{getCustomerName(job.customer_id)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Mechanic:</span>
                <span className="text-slate-300">{getMechanicName(job.assigned_mechanic_id)}</span>
              </div>
              {job.check_in_date && (
                <div className="flex items-center justify-between text-slate-400">
                  <span>Check-in:</span>
                  <span className="text-slate-300">{format(new Date(job.check_in_date), "MMM d, yyyy")}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectJob(job);
                }}
              >
                <Eye className="w-3 h-3 mr-1" />
                View
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditJob(job);
                }}
              >
                <Edit className="w-3 h-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
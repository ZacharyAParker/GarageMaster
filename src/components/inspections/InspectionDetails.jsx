
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle, AlertTriangle, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export default function InspectionDetails({ inspection, job, vehicle, onBack }) {
  const getStatusIcon = (status) => {
    switch(status) {
      case 'ok': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'attention': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'critical': return <AlertCircle className="w-5 h-5 text-red-500" />;
      default: return null;
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'ok': return 'bg-green-900/50 text-green-300 border-0';
      case 'attention': return 'bg-yellow-900/50 text-yellow-300 border-0';
      case 'critical': return 'bg-red-900/50 text-red-300 border-0';
      default: return 'bg-slate-700 text-slate-300 border-0';
    }
  };

  const groupedItems = inspection.items?.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {}) || {};

  return (
    <div className="p-6 space-y-6 bg-slate-950 min-h-screen">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="text-slate-400 hover:text-slate-200">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-slate-100">Inspection Report</h1>
          <p className="text-slate-400 mt-1">
            {vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'Unknown Vehicle'}
          </p>
        </div>
        <Badge className={`${getStatusColor(inspection.overall_status)} text-lg px-4 py-2`}>
          {inspection.overall_status?.replace(/_/g, ' ')}
        </Badge>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="border-b border-slate-800">
            <CardTitle className="text-lg text-slate-100">Inspection Info</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div>
              <p className="text-xs text-slate-500">Date</p>
              <p className="text-slate-300">{format(new Date(inspection.inspection_date), "MMM d, yyyy")}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Mileage</p>
              <p className="text-slate-300">{inspection.mileage?.toLocaleString()} miles</p>
            </div>
            {job && (
              <div>
                <p className="text-xs text-slate-500">Job Number</p>
                <p className="text-slate-300">{job.job_number || `#${job.id.slice(0, 8)}`}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-3 space-y-6">
          {Object.entries(groupedItems).map(([category, items]) => (
            <Card key={category} className="bg-slate-900 border-slate-800">
              <CardHeader className="border-b border-slate-800">
                <CardTitle className="text-lg text-slate-100 capitalize">{category}</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-4 bg-slate-800/50 rounded-lg">
                      {getStatusIcon(item.status)}
                      <div className="flex-1">
                        <p className="font-medium text-slate-200">{item.item_name}</p>
                        {item.notes && <p className="text-sm text-slate-400 mt-1">{item.notes}</p>}
                      </div>
                      <Badge className={getStatusColor(item.status)}>
                        {item.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          {inspection.recommendations && (
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="border-b border-slate-800">
                <CardTitle className="text-lg text-slate-100">Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-slate-300">{inspection.recommendations}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
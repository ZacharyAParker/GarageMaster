import {  useState  } from "react";
import api from "@/api/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, ClipboardCheck, AlertCircle, CheckCircle, AlertTriangle, Search, Gauge } from "lucide-react";

import InspectionForm from "../components/inspections/InspectionForm";
import InspectionDetails from "../components/inspections/InspectionDetails";

// Map legacy overall_status values onto the current enum.
const normalizeOverall = (status) => {
  if (status === "needs_attention") return "attention_required";
  if (status === "critical") return "failed";
  return status || "";
};

const OVERALL_META = {
  ok: {
    label: "Pass",
    icon: <CheckCircle className="w-4 h-4" />,
    badge: "bg-green-900/50 text-green-300 border-0",
    tab: "OK",
  },
  attention_required: {
    label: "Needs Attention",
    icon: <AlertTriangle className="w-4 h-4" />,
    badge: "bg-yellow-900/50 text-yellow-300 border-0",
    tab: "Attention",
  },
  failed: {
    label: "Failed",
    icon: <AlertCircle className="w-4 h-4" />,
    badge: "bg-red-900/50 text-red-300 border-0",
    tab: "Failed",
  },
};

export default function Inspections() {
  const [showForm, setShowForm] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: inspections = [] } = useQuery({
    queryKey: ['inspections'],
    queryFn: () => api.entities.Inspection.list("-inspection_date")
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => api.entities.Job.list()
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => api.entities.Vehicle.list()
  });

  // Counts by normalized overall status (for tab labels).
  const statusCounts = inspections.reduce((acc, insp) => {
    const s = normalizeOverall(insp.overall_status);
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const filteredInspections = inspections.filter((inspection) => {
    if (statusFilter !== "all" && normalizeOverall(inspection.overall_status) !== statusFilter) {
      return false;
    }
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const vehicle = vehicles.find((v) => v.id === inspection.vehicle_id);
    const job = jobs.find((j) => j.id === inspection.job_id);
    const haystack = [
      vehicle && `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
      vehicle?.license_plate,
      vehicle?.vin,
      job?.job_number,
      job?.description,
      inspection.recommendations,
      ...(Array.isArray(inspection.items)
        ? inspection.items.map((i) => `${i.item_name || ""} ${i.notes || ""}`)
        : []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });

  if (selectedInspection) {
    return (
      <InspectionDetails
        inspection={selectedInspection}
        job={jobs.find(j => j.id === selectedInspection.job_id)}
        vehicle={vehicles.find(v => v.id === selectedInspection.vehicle_id)}
        onBack={() => setSelectedInspection(null)}
      />
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-950 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Vehicle Inspections</h1>
          <p className="text-slate-400 mt-1">Comprehensive inspection reports and checklists</p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Inspection
        </Button>
      </div>

      {showForm && (
        <InspectionForm
          jobs={jobs}
          vehicles={vehicles}
          onClose={() => setShowForm(false)}
        />
      )}

      {/* Filters */}
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-4 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList className="bg-slate-800">
              <TabsTrigger value="all">All ({inspections.length})</TabsTrigger>
              <TabsTrigger value="ok">Pass ({statusCounts.ok || 0})</TabsTrigger>
              <TabsTrigger value="attention_required">
                Attention ({statusCounts.attention_required || 0})
              </TabsTrigger>
              <TabsTrigger value="failed">Failed ({statusCounts.failed || 0})</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Search vehicle, job #, items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-800 border-slate-700 text-slate-200"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="border-b border-slate-800">
          <CardTitle className="text-xl font-bold text-slate-100">
            {statusFilter === "all" ? "Recent Inspections" : `${OVERALL_META[statusFilter]?.tab || "Filtered"} Inspections`}
            <span className="ml-2 text-sm font-normal text-slate-500">({filteredInspections.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {filteredInspections.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardCheck className="w-16 h-16 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-500">
                {inspections.length === 0
                  ? "No inspections recorded"
                  : searchQuery
                  ? `No inspections match "${searchQuery}"`
                  : "No inspections with this status"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredInspections.map((inspection) => {
                const vehicle = vehicles.find(v => v.id === inspection.vehicle_id);
                const items = Array.isArray(inspection.items) ? inspection.items : [];
                const okCount = items.filter(i => i.status === 'ok').length;
                const attentionCount = items.filter(i => i.status === 'attention').length;
                const failedCount = items.filter(i => i.status === 'failed').length;
                const overall = normalizeOverall(inspection.overall_status);
                const meta = OVERALL_META[overall];

                return (
                  <Card
                    key={inspection.id}
                    className="bg-slate-800/50 border-slate-700 hover:border-orange-600 transition-all duration-200 cursor-pointer"
                    onClick={() => setSelectedInspection(inspection)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-slate-200">
                            {vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'Unknown Vehicle'}
                          </h3>
                          <p className="text-xs text-slate-500">
                            {new Date(inspection.inspection_date).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge className={meta?.badge || "bg-slate-700 text-slate-300 border-0"}>
                          {meta?.icon}
                          <span className="ml-1">{meta?.label || inspection.overall_status}</span>
                        </Badge>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-1.5 text-slate-400">
                            <Gauge className="w-4 h-4" /> Mileage
                          </span>
                          <span className="text-slate-300">
                            {inspection.mileage != null ? `${Number(inspection.mileage).toLocaleString()} mi` : "-"}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <Badge className="bg-green-900/30 text-green-400 border border-green-800/60 text-xs">
                            {okCount} ok
                          </Badge>
                          <Badge className="bg-yellow-900/30 text-yellow-400 border border-yellow-800/60 text-xs">
                            {attentionCount} attention
                          </Badge>
                          <Badge className="bg-red-900/30 text-red-400 border border-red-800/60 text-xs">
                            {failedCount} failed
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

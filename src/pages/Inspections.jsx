import React, { useState } from "react";
import api from "@/api/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ClipboardCheck, AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";

import InspectionForm from "../components/inspections/InspectionForm";
import InspectionDetails from "../components/inspections/InspectionDetails";

export default function Inspections() {
  const [showForm, setShowForm] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState(null);
  const queryClient = useQueryClient();

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

  const getStatusIcon = (status) => {
    switch(status) {
      case 'ok': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'needs_attention': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'critical': return <AlertCircle className="w-5 h-5 text-red-500" />;
      default: return <ClipboardCheck className="w-5 h-5 text-slate-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'ok': return 'bg-green-900/50 text-green-300 border-0';
      case 'needs_attention': return 'bg-yellow-900/50 text-yellow-300 border-0';
      case 'critical': return 'bg-red-900/50 text-red-300 border-0';
      default: return 'bg-slate-700 text-slate-300 border-0';
    }
  };

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

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="border-b border-slate-800">
          <CardTitle className="text-xl font-bold text-slate-100">Recent Inspections</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {inspections.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardCheck className="w-16 h-16 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-500">No inspections recorded</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {inspections.map((inspection) => {
                const vehicle = vehicles.find(v => v.id === inspection.vehicle_id);
                const criticalCount = inspection.items?.filter(i => i.status === 'critical').length || 0;
                const attentionCount = inspection.items?.filter(i => i.status === 'attention').length || 0;

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
                        <Badge className={getStatusColor(inspection.overall_status)}>
                          {inspection.overall_status}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-400">Mileage</span>
                          <span className="text-slate-300">{inspection.mileage?.toLocaleString()} mi</span>
                        </div>
                        
                        {criticalCount > 0 && (
                          <div className="flex items-center gap-2 p-2 bg-red-900/20 border border-red-800 rounded">
                            <AlertCircle className="w-4 h-4 text-red-400" />
                            <span className="text-sm text-red-300">{criticalCount} critical issue(s)</span>
                          </div>
                        )}
                        
                        {attentionCount > 0 && (
                          <div className="flex items-center gap-2 p-2 bg-yellow-900/20 border border-yellow-800 rounded">
                            <AlertTriangle className="w-4 h-4 text-yellow-400" />
                            <span className="text-sm text-yellow-300">{attentionCount} needs attention</span>
                          </div>
                        )}
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
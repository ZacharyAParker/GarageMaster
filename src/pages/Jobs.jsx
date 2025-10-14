
import React, { useState, useEffect } from "react";
import api from "@/api/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";

import JobForm from "../components/jobs/JobForm";
import JobBoard from "../components/jobs/JobBoard";
import JobDetails from "../components/jobs/JobDetails";

export default function Jobs() {
  const [showForm, setShowForm] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [selectedJobId, setSelectedJobId] = useState(null); // Changed to selectedJobId
  const [statusFilter, setStatusFilter] = useState("all");
  const [preselectedVehicleId, setPreselectedVehicleId] = useState(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const vehicleId = urlParams.get('vehicle');
    const jobId = urlParams.get('job');
    
    if (vehicleId) {
      setPreselectedVehicleId(vehicleId);
      setShowForm(true);
    }
    
    if (jobId) { // Condition simplified
      setSelectedJobId(jobId); // Set ID directly
    }
  }, []);

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
  queryFn: () => api.entities.Job.list("-created_date")
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
  queryFn: () => api.entities.Vehicle.list()
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
  queryFn: () => api.entities.Customer.list()
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['users'],
  queryFn: () => api.entities.User.list()
  });

  const filteredJobs = statusFilter === "all" 
    ? jobs 
    : jobs.filter(j => j.status === statusFilter);

  const handleEdit = (job) => {
    setEditingJob(job);
    setShowForm(true);
    setSelectedJobId(null); // Clear selectedJobId when opening edit form
  };

  if (selectedJobId) { // Check for selectedJobId
    return (
      <JobDetails
        jobId={selectedJobId} // Pass jobId to JobDetails
        onBack={() => setSelectedJobId(null)} // Clear selectedJobId
        onEdit={handleEdit} // JobDetails should pass the full job object to handleEdit
      />
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-950 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Job Management</h1>
          <p className="text-slate-400 mt-1">Track and manage all work orders</p>
        </div>
        <Button
          onClick={() => {
            setShowForm(true);
            setEditingJob(null);
            setPreselectedVehicleId(null);
          }}
          className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Work Order
        </Button>
      </div>

      {showForm && (
        <JobForm
          job={editingJob}
          preselectedVehicleId={preselectedVehicleId}
          vehicles={vehicles}
          customers={customers}
          employees={employees}
          onClose={() => {
            setShowForm(false);
            setEditingJob(null);
            setPreselectedVehicleId(null);
          }}
        />
      )}

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="border-b border-slate-800">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle className="text-xl font-bold text-slate-100">All Work Orders</CardTitle>
            <Tabs value={statusFilter} onValueChange={setStatusFilter}>
              <TabsList className="bg-slate-800">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="intake">Intake</TabsTrigger>
                <TabsTrigger value="in_progress">In Progress</TabsTrigger>
                <TabsTrigger value="awaiting_approval">Awaiting Approval</TabsTrigger>
                <TabsTrigger value="ready_for_pickup">Ready</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <JobBoard
            jobs={filteredJobs}
            vehicles={vehicles}
            customers={customers}
            employees={employees}
            onSelectJob={(job) => setSelectedJobId(job.id)} // Pass job.id
            onEditJob={handleEdit}
          />
        </CardContent>
      </Card>
    </div>
  );
}

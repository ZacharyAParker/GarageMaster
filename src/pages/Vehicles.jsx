import React, { useState, useEffect } from "react";
import api from "@/api/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Car, Edit, Trash2, Eye, Calendar } from "lucide-react";
import { format } from "date-fns";

import VehicleForm from "../components/vehicles/VehicleForm";
import VehicleDetails from "../components/vehicles/VehicleDetails";

export default function Vehicles() {
  const [showForm, setShowForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [preselectedCustomerId, setPreselectedCustomerId] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const customerId = urlParams.get('customer');
    const vehicleId = urlParams.get('vehicle');
    
    if (customerId) {
      setPreselectedCustomerId(customerId);
      setShowForm(true);
    }
    
    if (vehicleId && vehicles.length > 0) {
      const vehicle = vehicles.find(v => v.id === vehicleId);
      if (vehicle) setSelectedVehicle(vehicle);
    }
  }, []);

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ['vehicles'],
  queryFn: () => api.entities.Vehicle.list("-created_date")
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
  queryFn: () => api.entities.Customer.list()
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
  queryFn: () => api.entities.Job.list()
  });

  const deleteMutation = useMutation({
  mutationFn: (id) => api.entities.Vehicle.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    }
  });

  const handleEdit = (vehicle) => {
    setEditingVehicle(vehicle);
    setShowForm(true);
    setSelectedVehicle(null);
  };

  const handleDelete = async (id) => {
    if (confirm("Are you sure you want to delete this vehicle?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleView = (vehicle) => {
    setSelectedVehicle(vehicle);
    setShowForm(false);
  };

  const filteredVehicles = vehicles.filter(vehicle => {
    const customer = customers.find(c => c.id === vehicle.customer_id);
    const searchLower = searchQuery.toLowerCase();
    return (
      vehicle.make?.toLowerCase().includes(searchLower) ||
      vehicle.model?.toLowerCase().includes(searchLower) ||
      vehicle.vin?.toLowerCase().includes(searchLower) ||
      vehicle.license_plate?.toLowerCase().includes(searchLower) ||
      customer?.full_name?.toLowerCase().includes(searchLower)
    );
  });

  const getCustomerName = (customerId) => {
    return customers.find(c => c.id === customerId)?.full_name || 'Unknown';
  };

  const getVehicleJobs = (vehicleId) => {
    return jobs.filter(j => j.vehicle_id === vehicleId);
  };

  const statusColors = {
    in_shop: "bg-orange-600 text-white border-0",
    awaiting_parts: "bg-red-600 text-white border-0",
    ready_for_pickup: "bg-green-600 text-white border-0",
    picked_up: "bg-slate-700 text-slate-300 border-0",
    archived: "bg-slate-800 text-slate-500 border-0"
  };

  if (selectedVehicle) {
    return (
      <VehicleDetails
        vehicle={selectedVehicle}
        customer={customers.find(c => c.id === selectedVehicle.customer_id)}
        jobs={getVehicleJobs(selectedVehicle.id)}
        onBack={() => setSelectedVehicle(null)}
        onEdit={() => handleEdit(selectedVehicle)}
      />
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-950 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Vehicle Management</h1>
          <p className="text-slate-400 mt-1">Manage your vehicle database</p>
        </div>
        <Button
          onClick={() => {
            setShowForm(true);
            setEditingVehicle(null);
            setPreselectedCustomerId(null);
          }}
          className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Vehicle
        </Button>
      </div>

      {showForm && (
        <VehicleForm
          vehicle={editingVehicle}
          preselectedCustomerId={preselectedCustomerId}
          customers={customers}
          onClose={() => {
            setShowForm(false);
            setEditingVehicle(null);
            setPreselectedCustomerId(null);
          }}
        />
      )}

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="border-b border-slate-800">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <CardTitle className="text-xl font-bold text-slate-100">All Vehicles</CardTitle>
            <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-4 py-2 w-full md:w-96 border border-slate-700">
              <Search className="w-4 h-4 text-slate-500" />
              <Input
                type="text"
                placeholder="Search vehicles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-0 outline-none text-sm text-slate-300 placeholder-slate-500 p-0"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="text-center py-12 text-slate-500">Loading vehicles...</div>
          ) : filteredVehicles.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500">No vehicles found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredVehicles.map((vehicle) => (
                <Card key={vehicle.id} className="bg-slate-800/50 border-slate-700 hover:border-orange-600 transition-all duration-200 cursor-pointer" onClick={() => handleView(vehicle)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-600 to-orange-500 rounded-lg flex items-center justify-center">
                          <Car className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-200">{vehicle.year} {vehicle.make}</h3>
                          <p className="text-sm text-slate-400">{vehicle.model}</p>
                        </div>
                      </div>
                      <Badge className={statusColors[vehicle.status] || statusColors.picked_up}>
                        {vehicle.status?.replace(/_/g, ' ')}
                      </Badge>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Owner:</span>
                        <span className="text-slate-300">{getCustomerName(vehicle.customer_id)}</span>
                      </div>
                      {vehicle.license_plate && (
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Plate:</span>
                          <span className="text-slate-300">{vehicle.license_plate}</span>
                        </div>
                      )}
                      {vehicle.mileage && (
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Mileage:</span>
                          <span className="text-slate-300">{vehicle.mileage.toLocaleString()} mi</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Jobs:</span>
                        <span className="text-slate-300">{getVehicleJobs(vehicle.id).length}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleView(vehicle);
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
                          handleEdit(vehicle);
                        }}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-red-900/30 border-red-800 text-red-400 hover:bg-red-900/50"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(vehicle.id);
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
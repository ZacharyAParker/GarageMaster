import {  useState, useEffect  } from "react";
import api from "@/api/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Car, Edit, Trash2, Eye, LayoutGrid, List, Wrench } from "lucide-react";

import VehicleForm from "../components/vehicles/VehicleForm";
import VehicleDetails from "../components/vehicles/VehicleDetails";
import { VEHICLE_STATUSES } from "@/lib/constants";

// Color name -> swatch hex for the little dot on each card
const COLOR_SWATCHES = {
  black: "#0b0f19", white: "#f8fafc", silver: "#cbd5e1", grey: "#94a3b8", gray: "#94a3b8",
  red: "#ef4444", blue: "#3b82f6", green: "#22c55e", yellow: "#eab308",
  orange: "#f97316", purple: "#a855f7", brown: "#92400e", gold: "#d4af37",
  beige: "#e7d8b1", maroon: "#7f1d1d", pink: "#ec4899", teal: "#14b8a6",
};

function colorDotHex(color) {
  if (!color) return null;
  return COLOR_SWATCHES[String(color).toLowerCase().trim()] || "#94a3b8";
}

export default function Vehicles() {
  const [showForm, setShowForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const [preselectedCustomerId, setPreselectedCustomerId] = useState(null);
  const queryClient = useQueryClient();

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

  // Deep links: Vehicles?customer=<id> opens the add form pre-wired.
  // Vehicles?vehicle=<id> deep links are handled by the vehicles effect below.
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const customerId = urlParams.get('customer');

    if (customerId) {
      setPreselectedCustomerId(customerId);
      setShowForm(true);
    }
  }, []);

  useEffect(() => {
    if (selectedVehicle) return;
    const urlParams = new URLSearchParams(window.location.search);
    const vehicleId = urlParams.get('vehicle');
    if (vehicleId && vehicles.length > 0) {
      const vehicle = vehicles.find(v => v.id === vehicleId);
      if (vehicle) setSelectedVehicle(vehicle);
    }
  }, [vehicles]);

  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.Vehicle.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
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

  const getCustomerName = (customerId) => {
    return customers.find(c => c.id === customerId)?.full_name || 'Unknown';
  };

  const getVehicleJobs = (vehicleId) => {
    return jobs.filter(j => j.vehicle_id === vehicleId);
  };

  // Jobs still open on this vehicle (not finished or cancelled)
  const getOpenJobCount = (vehicleId) => {
    return jobs.filter(j => j.vehicle_id === vehicleId && !['completed', 'cancelled'].includes(j.status)).length;
  };

  const searchLower = searchQuery.toLowerCase();
  const filteredVehicles = vehicles
    .filter(vehicle => {
      const customer = customers.find(c => c.id === vehicle.customer_id);
      return (
        vehicle.make?.toLowerCase().includes(searchLower) ||
        vehicle.model?.toLowerCase().includes(searchLower) ||
        vehicle.vin?.toLowerCase().includes(searchLower) ||
        vehicle.license_plate?.toLowerCase().includes(searchLower) ||
        String(vehicle.year || "").includes(searchQuery.trim()) ||
        customer?.full_name?.toLowerCase().includes(searchLower)
      );
    })
    .filter(vehicle => statusFilter === "all" || vehicle.status === statusFilter);

  const renderStatusBadge = (status, className = "") => {
    const meta = VEHICLE_STATUSES[status];
    return (
      <Badge className={`${meta ? meta.color : "bg-slate-700 text-slate-300 border-slate-600"} border ${className}`}>
        {meta ? meta.label : status?.replace(/_/g, " ") || "Unknown"}
      </Badge>
    );
  };

  const vehicleActionButtons = (vehicle) => (
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
        title="Edit vehicle"
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
        title="Delete vehicle"
        className="bg-red-900/30 border-red-800 text-red-400 hover:bg-red-900/50"
        onClick={(e) => {
          e.stopPropagation();
          handleDelete(vehicle.id);
        }}
      >
        <Trash2 className="w-3 h-3" />
      </Button>
    </div>
  );

  const openJobsBadge = (vehicle) => {
    const openCount = getOpenJobCount(vehicle.id);
    if (openCount <= 0) return null;
    return (
      <Badge
        title={`${openCount} open job(s)`}
        className="bg-orange-600 text-white border-0 font-semibold"
      >
        <Wrench className="w-3 h-3 mr-1" />
        {openCount} open
      </Badge>
    );
  };

  const colorDot = (vehicle) => {
    const hex = colorDotHex(vehicle.color);
    if (!hex) return null;
    return (
      <span
        title={vehicle.color}
        className="inline-block w-3 h-3 rounded-full ring-1 ring-slate-500/60 flex-shrink-0"
        style={{ backgroundColor: hex }}
      />
    );
  };

  const formatMileage = (mileage) =>
    mileage == null || mileage === "" ? null : `${Number(mileage).toLocaleString()} mi`;

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
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <CardTitle className="text-xl font-bold text-slate-100">All Vehicles</CardTitle>
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              {/* Status filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40 bg-slate-800 border-slate-700 text-slate-300">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 text-slate-300">
                  <SelectItem value="all">All Statuses</SelectItem>
                  {Object.entries(VEHICLE_STATUSES).map(([key, meta]) => (
                    <SelectItem key={key} value={key}>{meta.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-4 py-2 w-full sm:w-72 border border-slate-700">
                <Search className="w-4 h-4 text-slate-500" />
                <Input
                  type="text"
                  placeholder="Search make, model, plate, VIN, year..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-0 outline-none text-sm text-slate-300 placeholder-slate-500 p-0"
                />
              </div>

              {/* Grid / list toggle */}
              <div className="flex items-center gap-1 bg-slate-950 rounded-lg p-1 border border-slate-700 self-start sm:self-auto">
                <button
                  title="Grid view"
                  onClick={() => setViewMode("grid")}
                  className={`px-2 py-1.5 rounded-md transition-colors ${
                    viewMode === "grid"
                      ? "bg-orange-600 text-white"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  title="List view"
                  onClick={() => setViewMode("list")}
                  className={`px-2 py-1.5 rounded-md transition-colors ${
                    viewMode === "list"
                      ? "bg-orange-600 text-white"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
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
          ) : viewMode === "grid" ? (
            /* ---------------- GRID VIEW ---------------- */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredVehicles.map((vehicle) => (
                <Card key={vehicle.id} className="bg-slate-800/50 border-slate-700 hover:border-orange-600 transition-all duration-200 cursor-pointer" onClick={() => handleView(vehicle)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3 gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-600 to-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Car className="w-6 h-6 text-white" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-slate-200 truncate">{vehicle.year} {vehicle.make}</h3>
                          <p className="text-sm text-slate-400 truncate">{vehicle.model}</p>
                        </div>
                      </div>
                      {renderStatusBadge(vehicle.status)}
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between text-slate-400 gap-2">
                        <span>Owner:</span>
                        <span className="text-slate-300 truncate">{getCustomerName(vehicle.customer_id)}</span>
                      </div>
                      {vehicle.license_plate && (
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Plate:</span>
                          <span className="font-mono text-slate-300">{vehicle.license_plate}</span>
                        </div>
                      )}
                      {formatMileage(vehicle.mileage) && (
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Mileage:</span>
                          <span className="text-slate-300">{formatMileage(vehicle.mileage)}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-400 inline-flex items-center gap-1.5">
                          {colorDot(vehicle)}
                          {vehicle.color ? <span>{vehicle.color}</span> : <span>No color</span>}
                        </span>
                        {openJobsBadge(vehicle)}
                      </div>
                    </div>

                    {vehicleActionButtons(vehicle)}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            /* ---------------- LIST VIEW ---------------- */
            <div className="space-y-2">
              {/* Header row */}
              <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-2 text-xs uppercase tracking-wide text-slate-500 border-b border-slate-800">
                <div className="col-span-4">Vehicle</div>
                <div className="col-span-2">Owner</div>
                <div className="col-span-1">Plate</div>
                <div className="col-span-2 text-right">Mileage</div>
                <div className="col-span-1 text-center">Status</div>
                <div className="col-span-2 text-right">Open Jobs</div>
              </div>
              {filteredVehicles.map((vehicle) => (
                <div
                  key={vehicle.id}
                  onClick={() => handleView(vehicle)}
                  className="grid grid-cols-2 md:grid-cols-12 gap-3 items-center px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg hover:border-orange-600 transition-all duration-200 cursor-pointer"
                >
                  <div className="col-span-2 md:col-span-4 flex items-center gap-3 min-w-0">
                    {colorDot(vehicle)}
                    <Car className="w-4 h-4 text-orange-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-200 truncate">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </h3>
                      {vehicle.vin && (
                        <p className="text-xs text-slate-500 font-mono truncate">VIN …{vehicle.vin.slice(-8)}</p>
                      )}
                    </div>
                  </div>
                  <div className="md:col-span-2 text-sm text-slate-300 truncate">{getCustomerName(vehicle.customer_id)}</div>
                  <div className="md:col-span-1 text-sm font-mono text-slate-300">{vehicle.license_plate || '-'}</div>
                  <div className="md:col-span-2 text-sm text-slate-300 md:text-right">
                    {formatMileage(vehicle.mileage) || '-'}
                  </div>
                  <div className="col-span-2 md:col-span-1 md:text-center md:flex md:justify-start lg:justify-center">
                    {renderStatusBadge(vehicle.status)}
                  </div>
                  <div className="col-span-2 md:col-span-2 flex md:justify-end items-center gap-2">
                    {openJobsBadge(vehicle, "list") || (
                      <span className="text-sm text-slate-500">No open jobs</span>
                    )}
                    <div className="hidden lg:flex gap-1 ml-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        title="View"
                        className="h-7 w-7 text-slate-400 hover:text-slate-200 hover:bg-slate-700"
                        onClick={(e) => { e.stopPropagation(); handleView(vehicle); }}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Edit"
                        className="h-7 w-7 text-slate-400 hover:text-slate-200 hover:bg-slate-700"
                        onClick={(e) => { e.stopPropagation(); handleEdit(vehicle); }}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                    </div>
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

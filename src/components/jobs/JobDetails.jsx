
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Car, User, Wrench, Clock, DollarSign, Package, Plus, Trash2, CheckCircle, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/api/client";
import { Input } from "@/components/ui/input";

import PaymentModal from "./PaymentModal";

export default function JobDetails({ jobId, onBack, onEdit }) {
  const queryClient = useQueryClient();
  const [isAddingPart, setIsAddingPart] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [partSearchQuery, setPartSearchQuery] = useState("");
  const [showPartSuggestions, setShowPartSuggestions] = useState(false);
  const [stockWarning, setStockWarning] = useState("");
  const [selectedPart, setSelectedPart] = useState({
    part_id: "",
    part_number: "",
    part_name: "",
    quantity: 1,
    unit_cost: 0,
    total_cost: 0
  });

  // Fetch live job data
  const { data: job } = useQuery({
    queryKey: ['job', jobId],
    queryFn: async () => {
  const jobs = await api.entities.Job.list();
      return jobs.find(j => j.id === jobId);
    },
    enabled: !!jobId
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
  queryFn: () => api.entities.Vehicle.list(),
    enabled: !!jobId
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
  queryFn: () => api.entities.Customer.list(),
    enabled: !!jobId
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['users'],
  queryFn: () => api.entities.User.list(),
    enabled: !!jobId
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ['inventory'],
  queryFn: () => api.entities.InventoryItem.list()
  });

  const updateJobMutation = useMutation({
  mutationFn: (data) => api.entities.Job.update(job.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      setIsAddingPart(false);
    }
  });

  const updateInventoryMutation = useMutation({
    mutationFn: ({ inventoryItemId, newQuantity }) =>
  api.entities.InventoryItem.update(inventoryItemId, { quantity_in_stock: newQuantity }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    }
  });

  const completeJobMutation = useMutation({
    mutationFn: async () => {
  return api.entities.Job.update(job.id, {
        status: 'completed',
        actual_completion: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      alert('Job marked as completed!');
    }
  });

  const checkStockLevel = (part, quantity) => {
    if (!part) return;

    const requestedQty = parseInt(quantity) || 0;
    const availableQty = part.quantity_in_stock || 0;

    if (availableQty === 0) {
      setStockWarning(`⚠️ OUT OF STOCK - This part is not available in inventory`);
    } else if (requestedQty > availableQty) {
      setStockWarning(`⚠️ LOW STOCK - Only ${availableQty} available in inventory`);
    } else if (availableQty <= (part.minimum_stock || 0)) {
      setStockWarning(`⚠️ WARNING - Stock is low (${availableQty} remaining)`);
    } else {
      setStockWarning("");
    }
  };

  const handlePartSelect = (part) => {
    setSelectedPart({
      part_id: part.id,
      part_number: part.part_number,
      part_name: part.part_name,
      quantity: 1,
      unit_cost: part.retail_price || part.unit_cost,
      total_cost: (part.retail_price || part.unit_cost) * 1
    });
    setPartSearchQuery(part.part_name);
    setShowPartSuggestions(false);
    checkStockLevel(part, 1);
  };

  const handlePartNumberChange = (partNumber) => {
    setSelectedPart(prev => ({...prev, part_number: partNumber}));

    // Check if this part number exists in inventory
    if (partNumber) {
      const inventoryPart = inventory.find(p =>
        p.part_number?.toLowerCase() === partNumber.toLowerCase()
      );

      if (inventoryPart) {
        checkStockLevel(inventoryPart, selectedPart.quantity);

        // Auto-fill part details if found in inventory
        setSelectedPart(prev => ({
          ...prev,
          part_id: inventoryPart.id,
          part_name: inventoryPart.part_name,
          unit_cost: inventoryPart.retail_price || inventoryPart.unit_cost,
          total_cost: (prev.quantity || 1) * (inventoryPart.retail_price || inventoryPart.unit_cost)
        }));
      } else {
        setStockWarning("");
      }
    } else {
      setStockWarning("");
      setSelectedPart(prev => ({ ...prev, part_id: "" })); // Clear part_id if part number cleared
    }
  };

  const handlePartQuantityChange = (quantity) => {
    const newQuantity = parseInt(quantity) || 0;
    setSelectedPart(prev => ({
      ...prev,
      quantity: newQuantity,
      total_cost: newQuantity * (prev.unit_cost || 0)
    }));

    // Re-check stock level with new quantity
    if (selectedPart.part_id) {
      const part = inventory.find(p => p.id === selectedPart.part_id);
      if (part) {
        checkStockLevel(part, newQuantity);
      }
    } else {
      setStockWarning(""); // Clear stock warning if not an inventory part
    }
  };

  const handleUnitCostChange = (cost) => {
    const unitCost = parseFloat(cost) || 0;
    setSelectedPart(prev => ({
      ...prev,
      unit_cost: unitCost,
      total_cost: (prev.quantity || 0) * unitCost
    }));
  };

  const addPart = async () => {
    if (!selectedPart.part_name || selectedPart.quantity <= 0) {
      alert("Please enter a part name and quantity");
      return;
    }

    if (job) {
      // If part is from inventory, update the inventory quantity
      if (selectedPart.part_id) {
        const inventoryPart = inventory.find(p => p.id === selectedPart.part_id);
        if (inventoryPart) {
          const newQuantity = (inventoryPart.quantity_in_stock || 0) - selectedPart.quantity;

          if (newQuantity < 0) {
            const confirmUse = confirm(
              `Warning: This will result in negative inventory (${newQuantity} remaining). Continue anyway?`
            );
            if (!confirmUse) return;
          }

          // Update inventory
          await updateInventoryMutation.mutateAsync({
            inventoryItemId: inventoryPart.id,
            newQuantity: Math.max(0, newQuantity) // Ensure quantity doesn't go below 0 visually in inventory
          });
        }
      }

      const updatedParts = [...(job.parts_used || []), selectedPart];
      const partsTotal = updatedParts.reduce((sum, part) => sum + (part.total_cost || 0), 0);
      const laborTotal = (job.labor_hours || 0) * (job.labor_rate || 85);

      updateJobMutation.mutate({
        parts_used: updatedParts,
        total_parts_cost: partsTotal,
        total_cost: partsTotal + laborTotal
      });

      setSelectedPart({
        part_id: "",
        part_number: "",
        part_name: "",
        quantity: 1,
        unit_cost: 0,
        total_cost: 0
      });
      setPartSearchQuery("");
      setStockWarning("");
    }
  };

  const removePart = (index) => {
    if (!job) return;

    // TODO: Consider if parts removed from a job should be returned to inventory
    // This is not part of the current requirements, but a potential future enhancement.

    const updatedParts = job.parts_used.filter((_, i) => i !== index);
    const partsTotal = updatedParts.reduce((sum, part) => sum + (part.total_cost || 0), 0);
    const laborTotal = (job.labor_hours || 0) * (job.labor_rate || 85);

    updateJobMutation.mutate({
      parts_used: updatedParts,
      total_parts_cost: partsTotal,
      total_cost: partsTotal + laborTotal
    });
  };

  const handleCompleteJob = () => {
    if (confirm('Are you sure you want to mark this job as completed?')) {
      completeJobMutation.mutate();
    }
  };

  // Filter parts based on search query
  const filteredParts = inventory.filter(part =>
    part.part_name?.toLowerCase().includes(partSearchQuery.toLowerCase()) ||
    part.part_number?.toLowerCase().includes(partSearchQuery.toLowerCase()) ||
    part.brand?.toLowerCase().includes(partSearchQuery.toLowerCase())
  );

  if (!job) {
    return (
      <div className="p-6 space-y-6 bg-slate-950 min-h-screen">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="text-slate-400 hover:text-slate-200">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-3xl font-bold text-slate-100">Job Details</h1>
        </div>
        <div className="text-center py-12 text-slate-500">Loading job details...</div>
      </div>
    );
  }

  // Derive vehicle, customer, and mechanic from fetched data
  const vehicle = vehicles.find(v => v.id === job.vehicle_id);
  const customer = customers.find(c => c.id === job.customer_id);
  const mechanic = employees.find(e => e.id === job.assigned_mechanic_id);

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
    completed: "bg-slate-800 text-slate-400 border-0"
  };

  const priorityColors = {
    low: "bg-blue-900/50 text-blue-300 border-0",
    normal: "bg-slate-700 text-slate-300 border-0",
    high: "bg-orange-900/50 text-orange-300 border-0",
    urgent: "bg-red-600 text-white border-0"
  };

  const paymentStatusColors = {
    unpaid: "bg-red-900/50 text-red-300 border-0",
    partial: "bg-yellow-900/50 text-yellow-300 border-0",
    paid: "bg-green-900/50 text-green-300 border-0"
  };

  return (
    <div className="p-6 space-y-6 bg-slate-950 min-h-screen">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="text-slate-400 hover:text-slate-200">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-slate-100">{job.job_number || `Job #${job.id.slice(0, 8)}`}</h1>
          <p className="text-slate-400 mt-1">Work order details and progress</p>
        </div>
        <div className="flex gap-3">
          {job.status !== 'completed' && (
            <Button
              onClick={handleCompleteJob}
              disabled={completeJobMutation.isPending}
              className="bg-green-600 hover:bg-green-500"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {completeJobMutation.isPending ? 'Completing...' : 'Complete Job'}
            </Button>
          )}
          <Button onClick={() => onEdit(job)} className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400">
            <Edit className="w-4 h-4 mr-2" />
            Edit Job
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="border-b border-slate-800">
            <CardTitle className="text-xl text-slate-100">Job Information</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div>
              <p className="text-xs text-slate-500">Status</p>
              <Badge className={`${statusColors[job.status] || statusColors.intake} mt-1`}>
                {job.status?.replace(/_/g, ' ')}
              </Badge>
            </div>

            <div>
              <p className="text-xs text-slate-500">Priority</p>
              <Badge className={`${priorityColors[job.priority] || priorityColors.normal} mt-1`}>
                {job.priority}
              </Badge>
            </div>

            <div>
              <p className="text-xs text-slate-500">Payment Status</p>
              <Badge className={`${paymentStatusColors[job.payment_status || 'unpaid']} mt-1`}>
                {job.payment_status || 'unpaid'}
              </Badge>
            </div>

            {job.payment_status === 'paid' && job.payment_method && (
              <div>
                <p className="text-xs text-slate-500">Payment Method</p>
                <p className="text-slate-300 capitalize">{job.payment_method.replace('_', ' ')}</p>
              </div>
            )}

            {job.check_in_date && (
              <div>
                <p className="text-xs text-slate-500">Check-in Date</p>
                <p className="text-slate-300">{format(new Date(job.check_in_date), "MMMM d, yyyy h:mm a")}</p>
              </div>
            )}

            {job.actual_completion && (
              <div>
                <p className="text-xs text-slate-500">Completed On</p>
                <p className="text-slate-300">{format(new Date(job.actual_completion), "MMMM d, yyyy h:mm a")}</p>
              </div>
            )}

            {vehicle && (
              <div className="pt-4 border-t border-slate-800">
                <p className="text-xs text-slate-500 mb-2">Vehicle</p>
                <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-orange-500 rounded-lg flex items-center justify-center">
                    <Car className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-slate-200 font-medium">{vehicle.year} {vehicle.make} {vehicle.model}</p>
                    <p className="text-xs text-slate-400">{vehicle.license_plate || vehicle.vin?.slice(-8)}</p>
                  </div>
                </div>
              </div>
            )}

            {customer && (
              <div className="pt-4 border-t border-slate-800">
                <p className="text-xs text-slate-500 mb-2">Customer</p>
                <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-orange-500 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-slate-200 font-medium">{customer.full_name}</p>
                    <p className="text-xs text-slate-400">{customer.phone}</p>
                  </div>
                </div>
              </div>
            )}

            {mechanic && (
              <div className="pt-4 border-t border-slate-800">
                <p className="text-xs text-slate-500 mb-2">Assigned Mechanic</p>
                <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-500 rounded-full flex items-center justify-center">
                    <Wrench className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-slate-200 font-medium">{mechanic.full_name}</p>
                    {mechanic.specialties && mechanic.specialties.length > 0 && (
                      <p className="text-xs text-slate-400">{mechanic.specialties[0]}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="border-b border-slate-800">
              <CardTitle className="text-xl text-slate-100">Description</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-slate-300">{job.description}</p>
            </CardContent>
          </Card>

          {job.diagnosis_notes && (
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="border-b border-slate-800">
                <CardTitle className="text-xl text-slate-100">Diagnosis Notes</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-slate-300">{job.diagnosis_notes}</p>
              </CardContent>
            </Card>
          )}

          {job.work_performed && (
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="border-b border-slate-800">
                <CardTitle className="text-xl text-slate-100">Work Performed</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-slate-300">{job.work_performed}</p>
              </CardContent>
            </Card>
          )}

          {/* Parts Used */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="border-b border-slate-800">
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl text-slate-100 flex items-center gap-2">
                  <Package className="w-5 h-5 text-orange-500" />
                  Parts Used
                </CardTitle>
                {job.status !== 'completed' && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setIsAddingPart(!isAddingPart);
                      if (!isAddingPart) { // If opening, reset part search and warnings
                        setPartSearchQuery("");
                        setStockWarning("");
                        setSelectedPart({
                          part_id: "",
                          part_number: "",
                          part_name: "",
                          quantity: 1,
                          unit_cost: 0,
                          total_cost: 0
                        });
                      }
                    }}
                    className="bg-orange-600 hover:bg-orange-500"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Part
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {isAddingPart && (
                <div className="space-y-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                  {/* Searchable part input */}
                  <div className="relative">
                    <label className="text-xs text-slate-500 mb-1 block">Search & Select Part from Inventory</label>
                    <Input
                      placeholder="Type to search parts..."
                      value={partSearchQuery}
                      onChange={(e) => {
                        setPartSearchQuery(e.target.value);
                        setShowPartSuggestions(true);
                      }}
                      onFocus={() => setShowPartSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowPartSuggestions(false), 200)} // Delay to allow click on suggestion
                      className="bg-slate-800 border-slate-700 text-slate-200"
                    />

                    {/* Suggestions dropdown */}
                    {showPartSuggestions && partSearchQuery && filteredParts.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto bg-slate-800 border border-slate-700 rounded-lg shadow-lg">
                        {filteredParts.slice(0, 10).map((part) => (
                          <div
                            key={part.id}
                            onMouseDown={() => handlePartSelect(part)} // Use onMouseDown to ensure click registers before blur
                            className="p-3 hover:bg-slate-700 cursor-pointer border-b border-slate-700 last:border-b-0"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="text-slate-200 font-medium">{part.part_name}</p>
                                <p className="text-xs text-slate-400">
                                  {part.part_number} {part.brand && `• ${part.brand}`}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                  Stock: {part.quantity_in_stock || 0} available
                                </p>
                              </div>
                              <Badge className="bg-green-900/50 text-green-300 border-0">
                                ${part.retail_price?.toFixed(2) || part.unit_cost?.toFixed(2)}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Stock Warning */}
                  {stockWarning && (
                    <div className="p-3 bg-yellow-900/20 border border-yellow-800 rounded-lg">
                      <p className="text-sm text-yellow-300">{stockWarning}</p>
                    </div>
                  )}

                  <div className="text-center text-xs text-slate-500">
                    — OR ENTER MANUALLY —
                  </div>

                  {/* Manual entry fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Part Number</label>
                      <Input
                        placeholder="Part #"
                        value={selectedPart.part_number}
                        onChange={(e) => handlePartNumberChange(e.target.value)}
                        className="bg-slate-800 border-slate-700 text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Part Name *</label>
                      <Input
                        placeholder="Part name"
                        value={selectedPart.part_name}
                        onChange={(e) => setSelectedPart({...selectedPart, part_name: e.target.value})}
                        className="bg-slate-800 border-slate-700 text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Quantity *</label>
                      <Input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={selectedPart.quantity}
                        onChange={(e) => handlePartQuantityChange(e.target.value)}
                        className="bg-slate-800 border-slate-700 text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Unit Cost *</label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Unit cost"
                        value={selectedPart.unit_cost}
                        onChange={(e) => handleUnitCostChange(e.target.value)}
                        className="bg-slate-800 border-slate-700 text-slate-200"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-700">
                    <div className="text-slate-300">
                      <span className="text-sm text-slate-500">Total: </span>
                      <span className="lg:text-lg font-semibold text-orange-500">
                        ${selectedPart.total_cost.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setIsAddingPart(false);
                          setSelectedPart({
                            part_id: "",
                            part_number: "",
                            part_name: "",
                            quantity: 1,
                            unit_cost: 0,
                            total_cost: 0
                          });
                          setPartSearchQuery("");
                          setStockWarning("");
                        }}
                        className="bg-slate-800 border-slate-700 text-slate-300"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={addPart}
                        disabled={!selectedPart.part_name || selectedPart.quantity <= 0 || updateJobMutation.isPending || (selectedPart.part_id && selectedPart.quantity > (inventory.find(p => p.id === selectedPart.part_id)?.quantity_in_stock || 0) && !stockWarning.includes("negative inventory"))}
                        className="bg-green-600 hover:bg-green-500"
                      >
                        {updateJobMutation.isPending ? 'Adding...' : 'Add Part'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {job.parts_used && job.parts_used.length > 0 ? (
                <div className="space-y-2">
                  {job.parts_used.map((part, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                      <Package className="w-5 h-5 text-orange-400" />
                      <div className="flex-1">
                        <p className="text-slate-200 font-medium">{part.part_name}</p>
                        <p className="text-xs text-slate-400">
                          {part.part_number && `${part.part_number} • `}Qty: {part.quantity} × ${part.unit_cost?.toFixed(2)}
                        </p>
                      </div>
                      <Badge className="bg-green-900/50 text-green-300 border-0">
                        ${part.total_cost?.toFixed(2)}
                      </Badge>
                      {job.status !== 'completed' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removePart(index)}
                          disabled={updateJobMutation.isPending}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-slate-500 py-8">No parts added yet</p>
              )}
            </CardContent>
          </Card>

          {/* Cost Breakdown */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="border-b border-slate-800">
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl text-slate-100">Cost Breakdown</CardTitle>
                {job.payment_status !== 'paid' && job.status === 'completed' && (
                  <Button
                    size="sm"
                    onClick={() => setShowPaymentModal(true)}
                    className="bg-green-600 hover:bg-green-500"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Mark as Paid
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-300">Labor</span>
                </div>
                <span className="text-slate-100 font-semibold">
                  {job.labor_hours || 0} hrs × ${job.labor_rate || 85} = ${((job.labor_hours || 0) * (job.labor_rate || 85)).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-300">Parts ({job.parts_used?.length || 0} items)</span>
                </div>
                <span className="text-slate-100 font-semibold">${(job.total_parts_cost || 0).toFixed(2)}</span>
              </div>
              <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-orange-500" />
                  <span className="text-slate-100 font-semibold text-lg">Total</span>
                </div>
                <span className="text-orange-500 font-bold text-2xl">${(job.total_cost || 0).toFixed(2)}</span>
              </div>

              {job.payment_status === 'paid' && (
                <div className="pt-4 border-t border-slate-800">
                  <div className="flex items-center justify-between p-3 bg-green-900/20 border border-green-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      <span className="text-green-300 font-semibold">Paid in Full</span>
                    </div>
                    <div className="text-right">
                      <p className="text-green-300 capitalize">{job.payment_method?.replace('_', ' ')}</p>
                      {job.payment_date && (
                        <p className="text-xs text-green-400">{format(new Date(job.payment_date), "MMM d, yyyy")}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {showPaymentModal && (
        <PaymentModal
          job={job}
          onClose={() => setShowPaymentModal(false)}
        />
      )}
    </div>
  );
}

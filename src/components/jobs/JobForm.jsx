
import React, { useState } from "react";
import api from "@/api/client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus, Trash2, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function JobForm({ job, preselectedVehicleId, vehicles, employees, onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(job || {
    vehicle_id: preselectedVehicleId || "",
    customer_id: "",
    assigned_mechanic_id: "",
    status: "intake",
    priority: "normal",
    description: "",
    job_number: `JOB-${Date.now().toString().slice(-6)}`,
    check_in_date: new Date().toISOString(),
    labor_hours: 0,
    labor_rate: 85,
    parts_used: [],
    total_parts_cost: 0,
    total_labor_cost: 0,
    total_cost: 0
  });

  const createPageUrl = (pageName) => {
    // Match the app's real route format: /<PageName>
    return '/' + pageName.toLowerCase().replace(/ /g, '-');
  };

  const { data: inventory = [] } = useQuery({
    queryKey: ['inventory'],
  queryFn: () => api.entities.InventoryItem.list()
  });

  const [selectedPart, setSelectedPart] = useState({
    part_id: "",
    part_number: "",
    part_name: "",
    quantity: 1,
    unit_cost: 0,
    total_cost: 0
  });

  React.useEffect(() => {
    if (formData.vehicle_id && !formData.customer_id) {
      const vehicle = vehicles.find(v => v.id === formData.vehicle_id);
      if (vehicle) {
        setFormData(prev => ({ ...prev, customer_id: vehicle.customer_id }));
      }
    }
  }, [formData.vehicle_id, vehicles]);

  React.useEffect(() => {
    // Recalculate totals whenever parts or labor changes
    const partsTotal = formData.parts_used.reduce((sum, part) => sum + (part.total_cost || 0), 0);
    const laborTotal = (formData.labor_hours || 0) * (formData.labor_rate || 85);
    const total = partsTotal + laborTotal;

    setFormData(prev => ({
      ...prev,
      total_parts_cost: partsTotal,
      total_labor_cost: laborTotal,
      total_cost: total
    }));
  }, [formData.parts_used, formData.labor_hours, formData.labor_rate]);

  const mutation = useMutation({
    mutationFn: async (data) => {
      let result;
      if (job) {
  result = await api.entities.Job.update(job.id, data);
        
        // Send notification if mechanic assignment changed
        if (data.assigned_mechanic_id && data.assigned_mechanic_id !== job.assigned_mechanic_id) {
          const vehicle = vehicles.find(v => v.id === data.vehicle_id);
          try {
            await api.entities.Notification.create({
              user_id: data.assigned_mechanic_id,
              type: "job_assigned",
              title: "New Job Assigned",
              message: `You've been assigned to work on ${vehicle?.year} ${vehicle?.make} ${vehicle?.model} (${data.job_number})`,
              link: createPageUrl("Jobs") + `?job=${job.id}`,
              priority: data.priority === 'urgent' ? 'high' : 'normal'
            });
          } catch (error) {
            console.error("Failed to send notification:", error);
          }
        }
      } else {
  result = await api.entities.Job.create(data);
        
        // Send notification for new job assignment
        if (data.assigned_mechanic_id) {
          const vehicle = vehicles.find(v => v.id === data.vehicle_id);
          try {
            await api.entities.Notification.create({
              user_id: data.assigned_mechanic_id,
              type: "job_assigned",
              title: "New Job Assigned",
              message: `You've been assigned to work on ${vehicle?.year} ${vehicle?.make} ${vehicle?.model} (${data.job_number})`,
              link: createPageUrl("Jobs") + `?job=${result.id}`,
              priority: data.priority === 'urgent' ? 'high' : 'normal'
            });
          } catch (error) {
            console.error("Failed to send notification:", error);
          }
        }
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] }); // Invalidate notifications query
      onClose();
    }
  });

  const handlePartSelect = (partId) => {
    const part = inventory.find(p => p.id === partId);
    if (part) {
      setSelectedPart({
        part_id: part.id,
        part_number: part.part_number,
        part_name: part.part_name,
        quantity: 1,
        unit_cost: part.retail_price || part.unit_cost,
        total_cost: part.retail_price || part.unit_cost
      });
    }
  };

  const handlePartQuantityChange = (quantity) => {
    setSelectedPart(prev => ({
      ...prev,
      quantity: parseInt(quantity) || 0,
      total_cost: (parseInt(quantity) || 0) * (prev.unit_cost || 0)
    }));
  };

  const addPart = () => {
    if (selectedPart.part_id) {
      setFormData(prev => ({
        ...prev,
        parts_used: [...prev.parts_used, selectedPart]
      }));
      setSelectedPart({
        part_id: "",
        part_number: "",
        part_name: "",
        quantity: 1,
        unit_cost: 0,
        total_cost: 0
      });
    }
  };

  const removePart = (index) => {
    setFormData(prev => ({
      ...prev,
      parts_used: prev.parts_used.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  // Filter to show only employees with shop positions (not customers, not unassigned)
  const mechanics = employees.filter(e => 
    e.position && ['mechanic', 'admin', 'manager', 'service_advisor'].includes(e.position)
  );

  return (
    <Card className="bg-slate-900 border-slate-800 mb-6">
      <CardHeader className="border-b border-slate-800">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-bold text-slate-100">
            {job ? 'Edit Work Order' : 'Create New Work Order'}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Job Number</Label>
              <Input
                value={formData.job_number}
                onChange={(e) => setFormData({ ...formData, job_number: e.target.value })}
                className="bg-slate-800 border-slate-700 text-slate-200"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Priority</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Vehicle *</Label>
              <Select value={formData.vehicle_id} onValueChange={(value) => setFormData({ ...formData, vehicle_id: value })} required>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.year} {vehicle.make} {vehicle.model} - {vehicle.license_plate || vehicle.vin?.slice(-6)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Assigned Mechanic</Label>
              <Select value={formData.assigned_mechanic_id || ""} onValueChange={(value) => setFormData({ ...formData, assigned_mechanic_id: value })}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                  <SelectValue placeholder="Select mechanic" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Unassigned</SelectItem>
                  {mechanics.length === 0 ? (
                    <SelectItem value={null} disabled>No mechanics available</SelectItem>
                  ) : (
                    mechanics.map((mechanic) => (
                      <SelectItem key={mechanic.id} value={mechanic.id}>
                        {mechanic.full_name} {mechanic.specialties?.length > 0 && `(${mechanic.specialties[0]})`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Customer Issue / Description *</Label>
            <Textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="bg-slate-800 border-slate-700 text-slate-200"
              rows={4}
              placeholder="Describe the customer's complaint or reason for service..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="intake">Intake</SelectItem>
                  <SelectItem value="awaiting_diagnosis">Awaiting Diagnosis</SelectItem>
                  <SelectItem value="diagnosis_complete">Diagnosis Complete</SelectItem>
                  <SelectItem value="awaiting_approval">Awaiting Approval</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="waiting_for_parts">Waiting for Parts</SelectItem>
                  <SelectItem value="quality_check">Quality Check</SelectItem>
                  <SelectItem value="ready_for_pickup">Ready for Pickup</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Labor Hours</Label>
              <Input
                type="number"
                step="0.5"
                value={formData.labor_hours}
                onChange={(e) => setFormData({ ...formData, labor_hours: parseFloat(e.target.value) || 0 })}
                className="bg-slate-800 border-slate-700 text-slate-200"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Labor Rate ($/hr)</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.labor_rate}
              onChange={(e) => setFormData({ ...formData, labor_rate: parseFloat(e.target.value) })}
              className="bg-slate-800 border-slate-700 text-slate-200"
            />
          </div>

          {/* Parts Section */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-orange-500" />
              <Label className="text-slate-100 text-lg font-semibold">Parts Used</Label>
            </div>

            {formData.parts_used.length > 0 && (
              <div className="space-y-2">
                {formData.parts_used.map((part, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg border border-slate-700">
                    <div className="flex-1">
                      <p className="text-slate-200 font-medium">{part.part_name}</p>
                      <p className="text-xs text-slate-400">
                        {part.part_number} • Qty: {part.quantity} × ${part.unit_cost.toFixed(2)}
                      </p>
                    </div>
                    <Badge className="bg-green-900/50 text-green-300 border-0">
                      ${part.total_cost.toFixed(2)}
                    </Badge>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => removePart(index)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2">
                <Select value={selectedPart.part_id} onValueChange={handlePartSelect}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                    <SelectValue placeholder="Select part from inventory" />
                  </SelectTrigger>
                  <SelectContent>
                    {inventory.map((part) => (
                      <SelectItem key={part.id} value={part.id}>
                        {part.part_name} - {part.part_number} (${part.retail_price?.toFixed(2) || part.unit_cost?.toFixed(2)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input
                type="number"
                min="1"
                placeholder="Quantity"
                value={selectedPart.quantity}
                onChange={(e) => handlePartQuantityChange(e.target.value)}
                className="bg-slate-800 border-slate-700 text-slate-200"
              />
              <Button
                type="button"
                onClick={addPart}
                disabled={!selectedPart.part_id}
                className="bg-orange-600 hover:bg-orange-500"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Part
              </Button>
            </div>
          </div>

          {/* Cost Breakdown Preview */}
          <div className="space-y-3 pt-4 border-t border-slate-800 bg-slate-800/30 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-slate-100 mb-3">Cost Breakdown</h3>
            <div className="flex justify-between items-center text-slate-300">
              <span>Labor ({formData.labor_hours} hrs × ${formData.labor_rate})</span>
              <span className="font-semibold">${formData.total_labor_cost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span>Parts ({formData.parts_used.length} items)</span>
              <span className="font-semibold">${formData.total_parts_cost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-lg font-bold text-orange-500 pt-3 border-t border-slate-700">
              <span>Total</span>
              <span>${formData.total_cost.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="bg-slate-800 border-slate-700 text-slate-300">
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending} className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400">
              {mutation.isPending ? 'Saving...' : job ? 'Update Job' : 'Create Job'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

import {  useState  } from "react";
import api from "@/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";

export default function VehicleForm({ vehicle, preselectedCustomerId, customers, onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(vehicle || {
    customer_id: preselectedCustomerId || "",
    make: "",
    model: "",
    year: new Date().getFullYear(),
    vin: "",
    license_plate: "",
    color: "",
    mileage: 0,
    engine_type: "",
    transmission: "automatic",
    status: "picked_up"
  });

  const mutation = useMutation({
    mutationFn: (data) => {
      if (vehicle) {
  return api.entities.Vehicle.update(vehicle.id, data);
      }
  return api.entities.Vehicle.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      onClose();
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <Card className="bg-slate-900 border-slate-800 mb-6">
      <CardHeader className="border-b border-slate-800">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-bold text-slate-100">
            {vehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label className="text-slate-300">Customer *</Label>
            <Select value={formData.customer_id} onValueChange={(value) => setFormData({ ...formData, customer_id: value })} required>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Year *</Label>
              <Input
                type="number"
                required
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                className="bg-slate-800 border-slate-700 text-slate-200"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Make *</Label>
              <Input
                required
                value={formData.make}
                onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                className="bg-slate-800 border-slate-700 text-slate-200"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Model *</Label>
              <Input
                required
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                className="bg-slate-800 border-slate-700 text-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">VIN</Label>
              <Input
                value={formData.vin}
                onChange={(e) => setFormData({ ...formData, vin: e.target.value })}
                className="bg-slate-800 border-slate-700 text-slate-200"
                placeholder="17-character VIN"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">License Plate</Label>
              <Input
                value={formData.license_plate}
                onChange={(e) => setFormData({ ...formData, license_plate: e.target.value })}
                className="bg-slate-800 border-slate-700 text-slate-200"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Color</Label>
              <Input
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="bg-slate-800 border-slate-700 text-slate-200"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Mileage</Label>
              <Input
                type="number"
                value={formData.mileage}
                onChange={(e) => setFormData({ ...formData, mileage: parseInt(e.target.value) })}
                className="bg-slate-800 border-slate-700 text-slate-200"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Engine Type</Label>
              <Input
                value={formData.engine_type}
                onChange={(e) => setFormData({ ...formData, engine_type: e.target.value })}
                className="bg-slate-800 border-slate-700 text-slate-200"
                placeholder="e.g., V6, I4, Electric"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Transmission</Label>
              <Select value={formData.transmission} onValueChange={(value) => setFormData({ ...formData, transmission: value })}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="automatic">Automatic</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Status</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in_shop">In Shop</SelectItem>
                <SelectItem value="awaiting_parts">Awaiting Parts</SelectItem>
                <SelectItem value="ready_for_pickup">Ready for Pickup</SelectItem>
                <SelectItem value="picked_up">Picked Up</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="bg-slate-800 border-slate-700 text-slate-300">
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending} className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400">
              {mutation.isPending ? 'Saving...' : vehicle ? 'Update Vehicle' : 'Add Vehicle'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
import {  useState  } from "react";
import api from "@/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";

const CATEGORIES = [
  "engine", "transmission", "brakes", "suspension", "electrical",
  "cooling", "fuel", "exhaust", "body", "fluids", "filters", "belts_hoses", "other"
];

export default function InventoryForm({ item, onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(item || {
    part_number: "",
    part_name: "",
    brand: "",
    category: "engine",
    quantity_in_stock: 0,
    minimum_stock: 5,
    unit_cost: 0,
    retail_price: 0,
    supplier: "",
    storage_location: ""
  });

  const mutation = useMutation({
    mutationFn: (data) => {
      if (item) {
  return api.entities.InventoryItem.update(item.id, data);
      }
  return api.entities.InventoryItem.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
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
            {item ? 'Edit Part' : 'Add New Part'}
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
              <Label className="text-slate-300">Part Number *</Label>
              <Input
                required
                value={formData.part_number}
                onChange={(e) => setFormData({ ...formData, part_number: e.target.value })}
                className="bg-slate-800 border-slate-700 text-slate-200"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Part Name *</Label>
              <Input
                required
                value={formData.part_name}
                onChange={(e) => setFormData({ ...formData, part_name: e.target.value })}
                className="bg-slate-800 border-slate-700 text-slate-200"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Brand</Label>
              <Input
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                className="bg-slate-800 border-slate-700 text-slate-200"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Category *</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat} className="capitalize">
                      {cat.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Quantity in Stock *</Label>
              <Input
                type="number"
                required
                value={formData.quantity_in_stock}
                onChange={(e) => setFormData({ ...formData, quantity_in_stock: parseInt(e.target.value) })}
                className="bg-slate-800 border-slate-700 text-slate-200"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Minimum Stock Level</Label>
              <Input
                type="number"
                value={formData.minimum_stock}
                onChange={(e) => setFormData({ ...formData, minimum_stock: parseInt(e.target.value) })}
                className="bg-slate-800 border-slate-700 text-slate-200"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Unit Cost *</Label>
              <Input
                type="number"
                step="0.01"
                required
                value={formData.unit_cost}
                onChange={(e) => setFormData({ ...formData, unit_cost: parseFloat(e.target.value) })}
                className="bg-slate-800 border-slate-700 text-slate-200"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Retail Price *</Label>
              <Input
                type="number"
                step="0.01"
                required
                value={formData.retail_price}
                onChange={(e) => setFormData({ ...formData, retail_price: parseFloat(e.target.value) })}
                className="bg-slate-800 border-slate-700 text-slate-200"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Supplier</Label>
              <Input
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                className="bg-slate-800 border-slate-700 text-slate-200"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Storage Location</Label>
              <Input
                value={formData.storage_location}
                onChange={(e) => setFormData({ ...formData, storage_location: e.target.value })}
                className="bg-slate-800 border-slate-700 text-slate-200"
                placeholder="e.g., Shelf A3"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="bg-slate-800 border-slate-700 text-slate-300">
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending} className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400">
              {mutation.isPending ? 'Saving...' : item ? 'Update Part' : 'Add Part'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
import React, { useState } from "react";
import api from "@/api/client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus, CheckCircle, AlertTriangle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const INSPECTION_CATEGORIES = [
  "engine", "transmission", "brakes", "suspension", "electrical", 
  "cooling", "fuel", "exhaust", "tires", "body", "interior", "fluids"
];

export default function InspectionForm({ jobs, vehicles, onClose }) {
  const queryClient = useQueryClient();
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
  queryFn: () => api.auth.me()
  });

  const [formData, setFormData] = useState({
    job_id: "",
    vehicle_id: "",
    inspector_id: currentUser?.id || "",
    inspection_date: new Date().toISOString(),
    mileage: 0,
    items: [],
    overall_status: "ok",
    recommendations: ""
  });

  const [newItem, setNewItem] = useState({
    category: "engine",
    item_name: "",
    status: "ok",
    notes: ""
  });

  const mutation = useMutation({
  mutationFn: (data) => api.entities.Inspection.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
      onClose();
    }
  });

  const addItem = () => {
    if (newItem.item_name) {
      setFormData({
        ...formData,
        items: [...formData.items, { ...newItem }]
      });
      setNewItem({
        category: "engine",
        item_name: "",
        status: "ok",
        notes: ""
      });
    }
  };

  const removeItem = (index) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const criticalCount = formData.items.filter(i => i.status === 'critical').length;
    const attentionCount = formData.items.filter(i => i.status === 'attention').length;
    
    const overall = criticalCount > 0 ? 'critical' : 
                   attentionCount > 0 ? 'needs_attention' : 'ok';
    
    mutation.mutate({ ...formData, overall_status: overall });
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'ok': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'attention': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'critical': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return null;
    }
  };

  return (
    <Card className="bg-slate-900 border-slate-800 mb-6">
      <CardHeader className="border-b border-slate-800">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-bold text-slate-100">New Vehicle Inspection</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Job *</Label>
              <Select value={formData.job_id} onValueChange={(value) => {
                const job = jobs.find(j => j.id === value);
                setFormData({ 
                  ...formData, 
                  job_id: value,
                  vehicle_id: job?.vehicle_id || ""
                });
              }} required>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                  <SelectValue placeholder="Select job" />
                </SelectTrigger>
                <SelectContent>
                  {jobs.map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.job_number || `Job #${job.id.slice(0, 8)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Mileage *</Label>
              <Input
                type="number"
                required
                value={formData.mileage}
                onChange={(e) => setFormData({ ...formData, mileage: parseInt(e.target.value) })}
                className="bg-slate-800 border-slate-700 text-slate-200"
              />
            </div>
          </div>

          <div className="border-t border-slate-800 pt-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">Inspection Items</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
              <Select value={newItem.category} onValueChange={(value) => setNewItem({ ...newItem, category: value })}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INSPECTION_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat} className="capitalize">
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                placeholder="Item name"
                value={newItem.item_name}
                onChange={(e) => setNewItem({ ...newItem, item_name: e.target.value })}
                className="bg-slate-800 border-slate-700 text-slate-200"
              />

              <Select value={newItem.status} onValueChange={(value) => setNewItem({ ...newItem, status: value })}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ok">✓ OK</SelectItem>
                  <SelectItem value="attention">⚠ Needs Attention</SelectItem>
                  <SelectItem value="critical">✗ Critical</SelectItem>
                </SelectContent>
              </Select>

              <Button type="button" onClick={addItem} className="bg-slate-700 hover:bg-slate-600">
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <Input
              placeholder="Notes for this item..."
              value={newItem.notes}
              onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
              className="bg-slate-800 border-slate-700 text-slate-200 mb-4"
            />

            {formData.items.length > 0 && (
              <div className="space-y-2">
                {formData.items.map((item, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
                    {getStatusIcon(item.status)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-slate-900 text-slate-400 border-slate-700 capitalize">
                          {item.category}
                        </Badge>
                        <span className="text-slate-200 font-medium">{item.item_name}</span>
                      </div>
                      {item.notes && <p className="text-xs text-slate-400 mt-1">{item.notes}</p>}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Overall Recommendations</Label>
            <Textarea
              value={formData.recommendations}
              onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
              className="bg-slate-800 border-slate-700 text-slate-200"
              rows={4}
              placeholder="Summary and recommendations..."
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="bg-slate-800 border-slate-700 text-slate-300">
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending} className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400">
              {mutation.isPending ? 'Saving...' : 'Complete Inspection'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
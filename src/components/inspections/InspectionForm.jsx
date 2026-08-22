import {  useEffect, useState  } from "react";
import api from "@/api/client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus, CheckCircle, AlertTriangle, AlertCircle, ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { INSPECTION_CATEGORIES, INSPECTION_ITEM_STATUSES } from "@/lib/constants";

// Preset inspection templates. Categories must come from INSPECTION_CATEGORIES.
const INSPECTION_TEMPLATES = [
  {
    id: "full_service",
    label: "Full Service",
    items: [
      { category: "fluids", item_name: "Engine Oil Level & Condition" },
      { category: "engine", item_name: "Engine Air Filter" },
      { category: "cooling", item_name: "Coolant Level & Hoses" },
      { category: "brakes", item_name: "Brake Pads & Rotor Condition" },
      { category: "tires", item_name: "Tire Tread Depth & Pressure" },
      { category: "electrical", item_name: "Battery Health & Terminals" },
      { category: "exhaust", item_name: "Exhaust System & Mounts" },
      { category: "suspension", item_name: "Shocks, Struts & Ball Joints" },
      { category: "interior", item_name: "Cabin Air Filter & HVAC Operation" },
    ],
  },
  {
    id: "pre_purchase",
    label: "Pre-Purchase",
    items: [
      { category: "body", item_name: "Paint, Body Panels & Rust" },
      { category: "engine", item_name: "Engine Start, Idle & Leak Check" },
      { category: "transmission", item_name: "Transmission Shift Quality" },
      { category: "brakes", item_name: "Brake Performance & Pedal Feel" },
      { category: "tires", item_name: "Tire Wear Patterns & Age" },
      { category: "electrical", item_name: "Lights, Windows & Accessories" },
      { category: "suspension", item_name: "Steering Play & Suspension Noise" },
      { category: "exhaust", item_name: "Exhaust Smoke & Emissions" },
      { category: "interior", item_name: "Interior Trim, Seats & Odor" },
    ],
  },
  {
    id: "brake_check",
    label: "Brake Check",
    items: [
      { category: "brakes", item_name: "Front Brake Pad Thickness" },
      { category: "brakes", item_name: "Rear Brake Pad/Shoe Thickness" },
      { category: "brakes", item_name: "Rotors & Drums Condition" },
      { category: "fluids", item_name: "Brake Fluid Level & Condition" },
      { category: "electrical", item_name: "ABS & Brake Warning Lights" },
      { category: "tires", item_name: "Tire Condition Affecting Braking" },
    ],
  },
];

// Live overall status: any failed -> failed; else any attention -> attention_required; else ok.
export function computeOverallStatus(items) {
  const list = Array.isArray(items) ? items : [];
  if (list.some((i) => i.status === "failed")) return "failed";
  if (list.some((i) => i.status === "attention")) return "attention_required";
  return "ok";
}

const OVERALL_BADGE_STYLES = {
  ok: "bg-green-900/50 text-green-300 border-0",
  attention_required: "bg-yellow-900/50 text-yellow-300 border-0",
  failed: "bg-red-900/50 text-red-300 border-0",
};

const OVERALL_LABELS = {
  ok: "All OK",
  attention_required: "Needs Attention",
  failed: "Failed",
};

const EMPTY_NEW_ITEM = { category: "engine", item_name: "", status: "ok", notes: "" };

export default function InspectionForm({ jobs, vehicles, onClose }) {
  const queryClient = useQueryClient();
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me()
  });

  const [formData, setFormData] = useState({
    job_id: "",
    vehicle_id: "",
    inspector_id: "",
    inspection_date: new Date().toISOString(),
    mileage: 0,
    items: [],
    overall_status: "ok",
    recommendations: ""
  });

  // Sync the inspector once the current user query resolves.
  useEffect(() => {
    if (currentUser?.id) {
      setFormData((prev) => ({ ...prev, inspector_id: currentUser.id }));
    }
  }, [currentUser]);

  const [newItem, setNewItem] = useState({ ...EMPTY_NEW_ITEM });

  const mutation = useMutation({
    mutationFn: (data) => api.entities.Inspection.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
      onClose();
    }
  });

  const overall_status = computeOverallStatus(formData.items);

  const applyTemplate = (templateId) => {
    const template = INSPECTION_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    setFormData((prev) => ({
      ...prev,
      items: template.items.map((item) => ({
        ...item,
        status: "ok",
        notes: ""
      }))
    }));
    setNewItem({ ...EMPTY_NEW_ITEM });
  };

  const updateItem = (index, patch) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, ...patch } : item))
    }));
  };

  const addItem = () => {
    if (!newItem.item_name.trim()) return;
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { ...newItem, item_name: newItem.item_name.trim() }]
    }));
    setNewItem({ ...EMPTY_NEW_ITEM });
  };

  const removeItem = (index) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate({
      ...formData,
      inspector_id: formData.inspector_id || currentUser?.id || "",
      mileage: Number(formData.mileage) || 0,
      overall_status
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ok': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'attention': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'failed': return <AlertCircle className="w-4 h-4 text-red-500" />;
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
                  vehicle_id: job?.vehicle_id || formData.vehicle_id
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
              <Label className="text-slate-300">Vehicle</Label>
              <Select value={formData.vehicle_id} onValueChange={(value) => {
                setFormData({ ...formData, vehicle_id: value });
              }}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                  <SelectValue placeholder="Auto-set from job, or select" />
                </SelectTrigger>
                <SelectContent>
                  {(vehicles || []).map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.year} {v.make} {v.model}{v.license_plate ? ` · ${v.license_plate}` : ""}
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
                min="0"
                value={formData.mileage}
                onChange={(e) => setFormData({ ...formData, mileage: parseInt(e.target.value) || 0 })}
                className="bg-slate-800 border-slate-700 text-slate-200"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Inspector</Label>
              <Input
                value={currentUser?.full_name || ""}
                disabled
                placeholder="Current user"
                className="bg-slate-800 border-slate-700 text-slate-400"
              />
            </div>
          </div>

          {/* Templates */}
          <div className="border-t border-slate-800 pt-6 space-y-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-orange-500" />
              <h3 className="text-lg font-semibold text-slate-100">Inspection Templates</h3>
            </div>
            <p className="text-xs text-slate-500">Pick a preset checklist to prefill items - then adjust each result.</p>
            <div className="flex flex-wrap gap-2">
              {INSPECTION_TEMPLATES.map((t) => (
                <Button
                  key={t.id}
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => applyTemplate(t.id)}
                  className="border-orange-800 text-orange-300 hover:bg-orange-900/30 hover:text-orange-200 bg-transparent"
                >
                  {t.label}
                  <Badge variant="outline" className="ml-2 bg-slate-900 text-slate-400 border-slate-700">
                    {t.items.length} items
                  </Badge>
                </Button>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-800 pt-6">
            <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
              <h3 className="text-lg font-semibold text-slate-100">Inspection Items</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Overall (auto):</span>
                <Badge className={OVERALL_BADGE_STYLES[overall_status]}>
                  {overall_status === 'ok' && <CheckCircle className="w-3 h-3 mr-1" />}
                  {overall_status === 'attention_required' && <AlertTriangle className="w-3 h-3 mr-1" />}
                  {overall_status === 'failed' && <AlertCircle className="w-3 h-3 mr-1" />}
                  {OVERALL_LABELS[overall_status]}
                </Badge>
              </div>
            </div>

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
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addItem();
                  }
                }}
                className="bg-slate-800 border-slate-700 text-slate-200"
              />

              <Select value={newItem.status} onValueChange={(value) => setNewItem({ ...newItem, status: value })}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(INSPECTION_ITEM_STATUSES).map(([value, meta]) => (
                    <SelectItem key={value} value={value}>{meta.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button type="button" onClick={addItem} disabled={!newItem.item_name.trim()} className="bg-slate-700 hover:bg-slate-600">
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>

            <Input
              placeholder="Notes for this item..."
              value={newItem.notes}
              onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
              className="bg-slate-800 border-slate-700 text-slate-200 mb-4"
            />

            {formData.items.length > 0 ? (
              <div className="space-y-2">
                {formData.items.map((item, index) => (
                  <div key={`${item.category}-${item.item_name}-${index}`} className="flex flex-wrap items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
                    {getStatusIcon(item.status)}
                    <div className="flex-1 min-w-[160px]">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-slate-900 text-slate-400 border-slate-700 capitalize">
                          {item.category}
                        </Badge>
                        <span className="text-slate-200 font-medium">{item.item_name}</span>
                      </div>
                      {item.notes && <p className="text-xs text-slate-400 mt-1">{item.notes}</p>}
                    </div>
                    <Select
                      value={item.status || "ok"}
                      onValueChange={(value) => updateItem(index, { status: value })}
                    >
                      <SelectTrigger className="w-[170px] bg-slate-900 border-slate-700 text-slate-200 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(INSPECTION_ITEM_STATUSES).map(([value, meta]) => (
                          <SelectItem key={value} value={value}>{meta.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
            ) : (
              <p className="text-center text-slate-500 py-6 text-sm">
                No checklist yet - apply a template above or add items manually.
              </p>
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
            <Button type="submit" disabled={mutation.isPending || !formData.job_id} className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400">
              {mutation.isPending ? 'Saving...' : 'Complete Inspection'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

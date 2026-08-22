import {  useState  } from "react";
import api from "@/api/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Event, Customer, Vehicle, Job } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";
import { format, parseISO } from "date-fns";

const EVENT_TYPES = [
  { value: "appointment", label: "Appointment" },
  { value: "pickup", label: "Pickup" },
  { value: "dropoff", label: "Dropoff" },
  { value: "reminder", label: "Reminder" },
];

const COLOR_OPTIONS = [
  { value: "orange", swatch: "bg-orange-500", ring: "ring-orange-400" },
  { value: "blue", swatch: "bg-blue-500", ring: "ring-blue-400" },
  { value: "green", swatch: "bg-green-500", ring: "ring-green-400" },
  { value: "purple", swatch: "bg-purple-500", ring: "ring-purple-400" },
  { value: "red", swatch: "bg-red-500", ring: "ring-red-400" },
];

// ISO datetime -> value accepted by <input type="datetime-local">
const toLocalInputValue = (date) => {
  const d = date ? parseISO(date) : new Date();
  if (isNaN(d.getTime())) return format(new Date(), "yyyy-MM-dd'T'HH:mm");
  return format(d, "yyyy-MM-dd'T'HH:mm");
};

export default function AppointmentForm({ event, defaultDate, onClose }) {
  const queryClient = useQueryClient();

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => Customer.list(),
  });
  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => Vehicle.list(),
  });
  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => Job.list(),
  });
  const { data: employees = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.auth.listUsers(),
  });

  const [formData, setFormData] = useState(() =>
    event
      ? {
          title: event.title || "",
          event_type: event.event_type || "appointment",
          date_time: toLocalInputValue(event.date),
          duration_minutes: event.duration_minutes ?? 60,
          customer_id: event.customer_id || "",
          vehicle_id: event.vehicle_id || "",
          job_id: event.job_id || "",
          assigned_to: event.assigned_to || "",
          notes: event.notes || "",
          color: event.color || "orange",
        }
      : {
          title: "",
          event_type: "appointment",
          date_time: toLocalInputValue(defaultDate),
          duration_minutes: 60,
          customer_id: "",
          vehicle_id: "",
          job_id: "",
          assigned_to: "",
          notes: "",
          color: "orange",
        }
  );

  // Vehicles belonging to the selected customer
  const customerVehicles = formData.customer_id
    ? vehicles.filter((v) => v.customer_id === formData.customer_id)
    : vehicles;

  const handleCustomerChange = (customerId) => {
    setFormData((prev) => {
      const stillValid = prev.vehicle_id && customerVehicles.some((v) => v.id === prev.vehicle_id && v.customer_id === customerId);
      return {
        ...prev,
        customer_id: customerId,
        vehicle_id: stillValid ? prev.vehicle_id : "",
      };
    });
  };

  const mutation = useMutation({
    mutationFn: (payload) =>
      event ? Event.update(event.id, payload) : Event.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      if (onClose) onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const parsed = new Date(formData.date_time);
    if (!formData.title.trim() || isNaN(parsed.getTime())) return;
    mutation.mutate({
      title: formData.title.trim(),
      event_type: formData.event_type,
      date: parsed.toISOString(),
      duration_minutes: parseInt(formData.duration_minutes, 10) || 60,
      customer_id: formData.customer_id || null,
      vehicle_id: formData.vehicle_id || null,
      job_id: formData.job_id || null,
      assigned_to: formData.assigned_to || null,
      notes: formData.notes || "",
      color: formData.color,
    });
  };

  return (
    <Card className="bg-slate-900 border-slate-800 mb-6">
      <CardHeader className="border-b border-slate-800">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-bold text-slate-100">
            {event ? "Edit Event" : "New Appointment"}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Title *</Label>
              <Input
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="bg-slate-800 border-slate-700 text-slate-200"
                placeholder="e.g. Oil change dropoff"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Event Type</Label>
              <Select
                value={formData.event_type}
                onValueChange={(value) => setFormData({ ...formData, event_type: value })}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Date &amp; Time *</Label>
              <Input
                type="datetime-local"
                required
                value={formData.date_time}
                onChange={(e) => setFormData({ ...formData, date_time: e.target.value })}
                className="bg-slate-800 border-slate-700 text-slate-200 [color-scheme:dark]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Duration (minutes)</Label>
              <Input
                type="number"
                min="5"
                step="5"
                value={formData.duration_minutes}
                onChange={(e) =>
                  setFormData({ ...formData, duration_minutes: parseInt(e.target.value, 10) || 60 })
                }
                className="bg-slate-800 border-slate-700 text-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Customer</Label>
              <Select
                value={formData.customer_id || undefined}
                onValueChange={handleCustomerChange}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.length === 0 ? (
                    <SelectItem value="no-customers" disabled>
                      No customers available
                    </SelectItem>
                  ) : (
                    customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name || customer.full_name || customer.email || customer.id}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Vehicle</Label>
              <Select
                value={formData.vehicle_id || undefined}
                onValueChange={(value) => setFormData({ ...formData, vehicle_id: value })}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                  <SelectValue
                    placeholder={formData.customer_id ? "Select vehicle" : "All vehicles (pick a customer to filter)"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {customerVehicles.length === 0 ? (
                    <SelectItem value="no-vehicles" disabled>
                      {formData.customer_id ? "No vehicles for this customer" : "No vehicles available"}
                    </SelectItem>
                  ) : (
                    customerVehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.year} {vehicle.make} {vehicle.model}
                        {vehicle.license_plate ? ` - ${vehicle.license_plate}` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Linked Job (optional)</Label>
              <Select
                value={formData.job_id || "none"}
                onValueChange={(value) =>
                  setFormData({ ...formData, job_id: value === "none" ? "" : value })
                }
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                  <SelectValue placeholder="No linked job" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No linked job</SelectItem>
                  {jobs.map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.job_number || `Job ${job.id.slice(0, 8)}`}
                      {job.description ? ` - ${String(job.description).substring(0, 30)}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Assigned To</Label>
              <Select
                value={formData.assigned_to || "unassigned"}
                onValueChange={(value) =>
                  setFormData({ ...formData, assigned_to: value === "unassigned" ? "" : value })
                }
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {employees.length === 0 ? (
                    <SelectItem value="no-employees" disabled>
                      No employees available
                    </SelectItem>
                  ) : (
                    employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.full_name || employee.email}
                        {employee.position ? ` (${String(employee.position).replace(/_/g, " ")})` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="bg-slate-800 border-slate-700 text-slate-200"
              rows={3}
              placeholder="Anything the shop should know ahead of this event..."
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Color</Label>
            <div className="flex items-center gap-3">
              {COLOR_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-label={`${option.value} color`}
                  onClick={() => setFormData({ ...formData, color: option.value })}
                  className={`w-8 h-8 rounded-full ${option.swatch} transition-all duration-150 ${
                    formData.color === option.value
                      ? `ring-2 ring-offset-2 ring-offset-slate-900 ${option.ring} scale-110`
                      : "opacity-70 hover:opacity-100"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="bg-slate-800 border-slate-700 text-slate-300"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400"
            >
              {mutation.isPending ? "Saving..." : event ? "Update Event" : "Create Event"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

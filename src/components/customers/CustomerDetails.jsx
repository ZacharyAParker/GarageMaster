import React, { useState, useEffect } from "react";
import api from "@/api/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  ArrowLeft, Mail, Phone, MapPin, Calendar, Car, Edit, DollarSign,
  Wrench, Save, CheckCircle, MessageSquare, Star
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { VEHICLE_STATUSES, JOB_STATUS_LABELS, JOB_STATUS_COLORS } from "@/lib/constants";
import { formatMoney } from "@/lib/format";

// Color name -> swatch hex for vehicle color dots
const COLOR_SWATCHES = {
  black: "#0b0f19", white: "#f8fafc", silver: "#cbd5e1", grey: "#94a3b8", gray: "#94a3b8",
  red: "#ef4444", blue: "#3b82f6", green: "#22c55e", yellow: "#eab308",
  orange: "#f97316", purple: "#a855f7", brown: "#92400e", gold: "#d4af37",
  beige: "#e7d8b1", maroon: "#7f1d1d", pink: "#ec4899", teal: "#14b8a6",
};

function colorDotHex(color) {
  if (!color) return "#94a3b8";
  return COLOR_SWATCHES[String(color).toLowerCase().trim()] || "#94a3b8";
}

export default function CustomerDetails({ customer, vehicles, onBack, onEdit }) {
  const queryClient = useQueryClient();
  const [notesDraft, setNotesDraft] = useState(customer.notes || "");
  const [notesSavedAt, setNotesSavedAt] = useState(null);

  // Jobs live in the shared cache so edits elsewhere stay in sync
  const { data: allJobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => api.entities.Job.list()
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.auth.listUsers()
  });

  useEffect(() => {
    setNotesDraft(customer.notes || "");
    setNotesSavedAt(null);
  }, [customer.id, customer.notes]);

  const customerJobs = React.useMemo(
    () => allJobs.filter(j => j.customer_id === customer.id),
    [allJobs, customer.id]
  );

  // Chronological: oldest first
  const sortedJobs = [...customerJobs].sort((a, b) => {
    const da = new Date(a.check_in_date || a.created_date || 0);
    const db = new Date(b.check_in_date || b.created_date || 0);
    return da - db;
  });

  const completedJobs = customerJobs.filter(j => j.status === 'completed');

  // ---- Computed stat cards ----
  const lifetimeSpend = completedJobs.reduce((sum, j) => sum + (Number(j.total_cost) || 0), 0);
  const vehiclesOwned = vehicles.length;
  const lastVisitDate = completedJobs.reduce((latest, j) => {
    const d = j.completed_date ? new Date(j.completed_date) : null;
    return d && (!latest || d > latest) ? d : latest;
  }, null);
  const avgVisitValue = completedJobs.length > 0 ? lifetimeSpend / completedJobs.length : 0;

  const saveNotesMutation = useMutation({
    mutationFn: (notes) => api.entities.Customer.update(customer.id, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setNotesSavedAt(new Date());
    }
  });

  const handleSaveNotes = () => {
    saveNotesMutation.mutate(notesDraft);
  };

  const statusColors = {
    active: "bg-green-900/50 text-green-300 border-0",
    inactive: "bg-slate-700 text-slate-300 border-0",
    vip: "bg-orange-600 text-white border-0"
  };

  const preferredContact = (customer.preferred_contact || "email").toLowerCase();
  const phoneHref = customer.phone ? `tel:${String(customer.phone).replace(/[^+\d]/g, "")}` : null;
  const emailHref = customer.email ? `mailto:${customer.email}` : null;

  const getMechanicName = (id) =>
    employees.find(e => e.id === id)?.full_name || null;

  const statCards = [
    {
      label: "Lifetime Spend",
      value: formatMoney(lifetimeSpend),
      icon: DollarSign,
      iconClass: "text-emerald-400",
    },
    {
      label: "Vehicles Owned",
      value: String(vehiclesOwned),
      icon: Car,
      iconClass: "text-orange-400",
    },
    {
      label: "Last Visit",
      value: lastVisitDate ? format(lastVisitDate, "MMM d, yyyy") : "No visits yet",
      icon: Calendar,
      iconClass: "text-blue-400",
    },
    {
      label: "Avg Visit Value",
      value: completedJobs.length ? formatMoney(avgVisitValue) : "-",
      icon: Star,
      iconClass: "text-purple-400",
    },
  ];

  return (
    <div className="p-6 space-y-6 bg-slate-950 min-h-screen">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="text-slate-400 hover:text-slate-200">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-slate-100">Customer Details</h1>
          <p className="text-slate-400 mt-1">View and manage customer information</p>
        </div>
        <Button onClick={onEdit} className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400">
          <Edit className="w-4 h-4 mr-2" />
          Edit Customer
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="bg-slate-900 border-slate-800">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-800 flex-shrink-0">
                  <Icon className={`w-5 h-5 ${stat.iconClass}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">{stat.label}</p>
                  <p className="font-bold text-slate-100 truncate">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="bg-slate-900 border-slate-800 self-start">
          <CardHeader className="border-b border-slate-800 text-center">
            {customer.avatar_url ? (
              <img src={customer.avatar_url} alt={customer.full_name} className="w-32 h-32 rounded-full object-cover mx-auto mb-4" />
            ) : (
              <div className="w-32 h-32 bg-gradient-to-br from-orange-600 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-5xl">
                  {customer.full_name?.[0]?.toUpperCase()}
                </span>
              </div>
            )}
            <CardTitle className="text-2xl text-slate-100">{customer.full_name}</CardTitle>
            <Badge className={`${statusColors[customer.status] || statusColors.active} mt-2`}>
              {customer.status || 'active'}
            </Badge>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start gap-3 text-slate-300">
              <Mail className="w-5 h-5 text-slate-500 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs text-slate-500">Email</p>
                <p className="break-all">{customer.email || 'Not provided'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 text-slate-300">
              <Phone className="w-5 h-5 text-slate-500 mt-0.5" />
              <div>
                <p className="text-xs text-slate-500">Phone</p>
                <p>{customer.phone}</p>
              </div>
            </div>

            {customer.address && (
              <div className="flex items-start gap-3 text-slate-300">
                <MapPin className="w-5 h-5 text-slate-500 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500">Address</p>
                  <p>{customer.address}</p>
                </div>
              </div>
            )}

            {customer.customer_since && (
              <div className="flex items-start gap-3 text-slate-300">
                <Calendar className="w-5 h-5 text-slate-500 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500">Customer Since</p>
                  <p>{format(new Date(customer.customer_since), "MMMM d, yyyy")}</p>
                </div>
              </div>
            )}

            {/* Communication quick actions - preferred channel leads */}
            <div className="pt-4 border-t border-slate-800">
              <p className="text-xs text-slate-500 mb-2">
                Quick Contact · prefers <span className="text-orange-400 font-medium capitalize">{preferredContact}</span>
              </p>
              <div className="flex gap-2">
                <Button asChild
                  size="sm"
                  disabled={!phoneHref}
                  className={
                    preferredContact === "phone"
                      ? "flex-1 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white"
                      : "flex-1 bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                  }
                  variant={preferredContact === "phone" ? "default" : "outline"}
                >
                  <a href={phoneHref || undefined}>
                    <Phone className="w-4 h-4 mr-2" />
                    Call
                  </a>
                </Button>
                <Button asChild
                  size="sm"
                  disabled={!emailHref}
                  className={
                    preferredContact === "email"
                      ? "flex-1 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white"
                      : "flex-1 bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                  }
                  variant={preferredContact === "email" ? "default" : "outline"}
                >
                  <a href={emailHref || undefined}>
                    <Mail className="w-4 h-4 mr-2" />
                    Email
                  </a>
                </Button>
                <Button asChild size="sm" variant="outline" title="Send a text message"
                  className="flex-1 bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700">
                  <a href={phoneHref ? `sms:${String(customer.phone).replace(/[^+\d]/g, "")}` : undefined}>
                    <MessageSquare className="w-4 h-4 mr-1" />
                    Text
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Tabs defaultValue="vehicles">
            <TabsList className="bg-slate-900 border border-slate-800 p-1 h-auto">
              <TabsTrigger
                value="vehicles"
                className="data-[state=active]:bg-orange-600 data-[state=active]:text-white text-slate-400 px-4 py-2 rounded-md"
              >
                <Car className="w-4 h-4 mr-2" />
                Vehicles ({vehicles.length})
              </TabsTrigger>
              <TabsTrigger
                value="jobs"
                className="data-[state=active]:bg-orange-600 data-[state=active]:text-white text-slate-400 px-4 py-2 rounded-md"
              >
                <Wrench className="w-4 h-4 mr-2" />
                Job History ({customerJobs.length})
              </TabsTrigger>
              <TabsTrigger
                value="notes"
                className="data-[state=active]:bg-orange-600 data-[state=active]:text-white text-slate-400 px-4 py-2 rounded-md"
              >
                Notes
              </TabsTrigger>
            </TabsList>

            {/* ---------------- Vehicles tab ---------------- */}
            <TabsContent value="vehicles" className="mt-4 space-y-4">
              <div className="flex justify-end">
                <Link to={`${createPageUrl("Vehicles")}?customer=${customer.id}`}>
                  <Button size="sm" className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400">
                    <Car className="w-4 h-4 mr-2" />
                    Add Vehicle
                  </Button>
                </Link>
              </div>
              {vehicles.length === 0 ? (
                <Card className="bg-slate-900 border-slate-800">
                  <CardContent className="text-center py-12">
                    <Car className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                    <p className="text-slate-500">No vehicles registered</p>
                    <Link to={`${createPageUrl("Vehicles")}?customer=${customer.id}`}>
                      <Button size="sm" className="mt-4 bg-gradient-to-r from-orange-600 to-orange-500">
                        Add First Vehicle
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {vehicles.map((vehicle) => {
                    const meta = VEHICLE_STATUSES[vehicle.status];
                    return (
                      <Link key={vehicle.id} to={`${createPageUrl("Vehicles")}?vehicle=${vehicle.id}`}>
                        <Card className="bg-slate-900 border-slate-800 hover:border-orange-600 transition-all duration-200 cursor-pointer">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start gap-3">
                              <div className="min-w-0">
                                <h3 className="font-semibold text-slate-200 text-lg">
                                  {vehicle.year} {vehicle.make} {vehicle.model}
                                </h3>
                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                  {vehicle.color && (
                                    <span
                                      title={vehicle.color}
                                      className="inline-block w-3 h-3 rounded-full ring-1 ring-slate-500/60"
                                      style={{ backgroundColor: colorDotHex(vehicle.color) }}
                                    />
                                  )}
                                  {vehicle.license_plate && (
                                    <Badge variant="outline" className="bg-slate-950 text-slate-400 border-slate-700">
                                      {vehicle.license_plate}
                                    </Badge>
                                  )}
                                  {vehicle.vin && (
                                    <Badge variant="outline" className="bg-slate-950 text-slate-400 border-slate-700">
                                      VIN: {vehicle.vin.slice(-8)}
                                    </Badge>
                                  )}
                                  {vehicle.color && (
                                    <Badge variant="outline" className="capitalize bg-slate-950 text-slate-400 border-slate-700">
                                      {vehicle.color}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <Badge className={`${meta ? meta.color : "bg-slate-700 text-slate-300 border-slate-600"} border`}>
                                {meta ? meta.label : vehicle.status?.replace(/_/g, " ") || "Unknown"}
                              </Badge>
                            </div>
                            {vehicle.mileage != null && vehicle.mileage !== "" && (
                              <p className="text-sm text-slate-400 mt-2">
                                {Number(vehicle.mileage).toLocaleString()} miles
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* ---------------- Job History tab ---------------- */}
            <TabsContent value="jobs" className="mt-4 space-y-3">
              {sortedJobs.length === 0 ? (
                <Card className="bg-slate-900 border-slate-800">
                  <CardContent className="text-center py-12">
                    <Wrench className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                    <p className="text-slate-500">No jobs on record yet</p>
                  </CardContent>
                </Card>
              ) : (
                sortedJobs.map((job) => (
                  <Card key={job.id} className="bg-slate-900 border-slate-800">
                    <CardContent className="p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-slate-200 font-mono text-sm">
                              {job.job_number || `JOB-${job.id?.slice(-6)}`}
                            </span>
                            <Badge className={`${JOB_STATUS_COLORS[job.status] || "bg-slate-700 text-slate-300"} border`}>
                              {JOB_STATUS_LABELS[job.status] || job.status}
                            </Badge>
                          </div>
                          {job.description && (
                            <p className="text-sm text-slate-400 mt-1 line-clamp-2">{job.description}</p>
                          )}
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
                            {job.check_in_date && (
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                In: {format(new Date(job.check_in_date), "MMM d, yyyy")}
                              </span>
                            )}
                            {job.completed_date && (
                              <span className="inline-flex items-center gap-1 text-emerald-400/80">
                                <CheckCircle className="w-3 h-3" />
                                Done: {format(new Date(job.completed_date), "MMM d, yyyy")}
                              </span>
                            )}
                            {getMechanicName(job.assigned_mechanic_id) && (
                              <span className="inline-flex items-center gap-1">
                                <Wrench className="w-3 h-3" />
                                {getMechanicName(job.assigned_mechanic_id)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-100">{formatMoney(job.total_cost)}</p>
                          {(job.labor_hours != null && job.labor_hours !== "") && (
                            <p className="text-xs text-slate-500 mt-0.5">
                              {job.labor_hours} hr labor
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* ---------------- Notes tab ---------------- */}
            <TabsContent value="notes" className="mt-4">
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader className="border-b border-slate-800">
                  <CardTitle className="text-lg text-slate-100">Internal Notes</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-3">
                  <Textarea
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    placeholder="Add notes about this customer - preferences, history, reminders..."
                    rows={8}
                    className="bg-slate-950 border-slate-700 text-slate-300 placeholder-slate-600 focus-visible:ring-orange-600 resize-y min-h-[160px]"
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500">
                      Saved to the customer&apos;s record{notesSavedAt ? ` · saved ${format(notesSavedAt, "h:mm a")}` : ""}
                    </p>
                    <Button
                      onClick={handleSaveNotes}
                      disabled={saveNotesMutation.isPending || notesDraft === (customer.notes || "")}
                      className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {saveNotesMutation.isPending ? "Saving..." : "Save Notes"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

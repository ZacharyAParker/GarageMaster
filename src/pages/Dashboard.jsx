

import api from "@/api/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Wrench,
  Car,
  Clock,
  AlertTriangle,
  CheckCircle,
  Package,
  Users,
  ArrowRight,
  Timer
} from "lucide-react";

import { differenceInCalendarDays } from "date-fns";

import StatsGrid from "../components/dashboard/StatsGrid";
import ActiveJobsWidget from "../components/dashboard/ActiveJobsWidget";
import RecentActivityWidget from "../components/dashboard/RecentActivityWidget";
import InventoryAlertsWidget from "../components/dashboard/InventoryAlertsWidget";
import TrendChartWidget from "../components/dashboard/TrendChartWidget";
import PermissionGate from "../components/permissions/PermissionGate";
import { formatMoney } from "@/lib/format";

export default function Dashboard() {
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
  queryFn: () => api.auth.me()
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
  queryFn: () => api.entities.Job.list("-created_date"),
    enabled: !!currentUser?.position
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
  queryFn: () => api.entities.Vehicle.list("-created_date"),
    enabled: !!currentUser?.position
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
  queryFn: () => api.entities.Customer.list("-created_date"),
    enabled: !!currentUser?.position
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ['inventory'],
  queryFn: () => api.entities.InventoryItem.list(),
    enabled: !!currentUser?.position
  });

  const isMechanic = currentUser?.position === 'mechanic';

  // Filter jobs for mechanics to show only their assigned jobs
  // Everyone else (admin, manager, service advisor, parts) sees all jobs
  const filteredJobs = isMechanic
    ? jobs.filter(j => j.assigned_mechanic_id === currentUser?.id)
    : jobs;

  const activeJobs = filteredJobs.filter(j => !['completed', 'cancelled'].includes(j.status));
  const urgentJobs = filteredJobs.filter(j => j.priority === 'urgent' && !['completed', 'cancelled'].includes(j.status));

  // Revenue counts completed jobs only - cancelled work never earns money
  const totalRevenue = filteredJobs
    .filter(j => j.status === 'completed')
    .reduce((sum, j) => sum + (Number(j.total_cost) || 0), 0);

  // Low stock: anything at or below minimum - including fully OUT of stock.
  // Out-of-stock items are surfaced first so they can't hide behind low items.
  const lowStockItems = inventory
    .filter(item => (Number(item.quantity_in_stock) || 0) <= (Number(item.minimum_stock) || 0))
    .sort((a, b) => {
      const aOut = (Number(a.quantity_in_stock) || 0) <= 0 ? 0 : 1;
      const bOut = (Number(b.quantity_in_stock) || 0) <= 0 ? 0 : 1;
      if (aOut !== bOut) return aOut - bOut; // out-of-stock (0) first
      return (Number(a.quantity_in_stock) || 0) - (Number(b.quantity_in_stock) || 0);
    });
  const outOfStockCount = inventory.filter(item => (Number(item.quantity_in_stock) || 0) <= 0).length;

  // ---- Shop Pulse metrics ----
  const nonCancelledJobs = filteredJobs.filter(j => j.status !== 'cancelled');
  const completedJobs = filteredJobs.filter(j => j.status === 'completed');
  const completionRate = nonCancelledJobs.length > 0
    ? Math.round((completedJobs.length / nonCancelledJobs.length) * 100)
    : 0;

  const turnaroundDays = completedJobs
    .filter(j => j.check_in_date && j.completed_date)
    .map(j => differenceInCalendarDays(new Date(j.completed_date), new Date(j.check_in_date)))
    .filter(days => days >= 0);
  const avgTurnaround = turnaroundDays.length > 0
    ? Math.round((turnaroundDays.reduce((sum, d) => sum + d, 0) / turnaroundDays.length) * 10) / 10
    : null;

  const awaitingApprovalJobs = filteredJobs.filter(j => j.status === 'awaiting_approval');

  return (
    <div className="p-6 space-y-6 bg-slate-950">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">
            {isMechanic ? 'My Dashboard' : 'Welcome to GarageSim CRM'}
          </h1>
          <p className="text-slate-400 mt-1">
            {isMechanic 
              ? "Here are your assigned jobs and tasks"
              : "Here's what's happening in your shop today"
            }
          </p>
        </div>
        <PermissionGate positions={['admin', 'manager', 'service_advisor']}>
          <div className="flex gap-3">
            <Link to={createPageUrl("Jobs")}>
              <Button className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 shadow-lg shadow-orange-900/50">
                <Wrench className="w-4 h-4 mr-2" />
                New Work Order
              </Button>
            </Link>
          </div>
        </PermissionGate>
      </div>

      {/* Stats Grid */}
      <StatsGrid 
        stats={{
          activeJobs: activeJobs.length,
          totalVehicles: vehicles.length,
          totalRevenue: totalRevenue,
          urgentJobs: urgentJobs.length,
          totalCustomers: customers.length,
          lowStockAlerts: lowStockItems.length
        }}
      />

      {/* Out-of-stock banner */}
      {outOfStockCount > 0 && (
        <Link to={createPageUrl("Inventory")} className="block">
          <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg border border-red-800/60 bg-red-950/40 hover:bg-red-950/60 transition-colors">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-200">
                <span className="font-bold">{outOfStockCount} part{outOfStockCount === 1 ? '' : 's'} completely out of stock</span>
                <span className="text-red-300/80"> - reorder before these block open jobs.</span>
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-red-400 flex-shrink-0" />
          </div>
        </Link>
      )}

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <ActiveJobsWidget jobs={activeJobs} />
          <RecentActivityWidget jobs={filteredJobs} />
        </div>

        <div className="space-y-6">
          <PermissionGate positions={['admin', 'manager', 'parts_specialist']}>
            <InventoryAlertsWidget lowStockItems={lowStockItems} />
          </PermissionGate>
          
          {/* Quick Actions */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="border-b border-slate-800">
              <CardTitle className="text-lg font-bold text-slate-100">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-6">
              <PermissionGate positions={['admin', 'manager', 'service_advisor']}>
                <Link to={createPageUrl("Customers")}>
                  <Button variant="outline" className="w-full justify-start bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750 hover:text-slate-100">
                    <Users className="w-4 h-4 mr-2" />
                    Add New Customer
                  </Button>
                </Link>
                <Link to={createPageUrl("Vehicles")}>
                  <Button variant="outline" className="w-full justify-start bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750 hover:text-slate-100">
                    <Car className="w-4 h-4 mr-2" />
                    Register Vehicle
                  </Button>
                </Link>
              </PermissionGate>
              <PermissionGate positions={['admin', 'manager', 'parts_specialist']}>
                <Link to={createPageUrl("Inventory")}>
                  <Button variant="outline" className="w-full justify-start bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750 hover:text-slate-100">
                    <Package className="w-4 h-4 mr-2" />
                    Order Parts
                  </Button>
                </Link>
              </PermissionGate>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Widgets: Revenue Trend + Shop Pulse */}
      <div className="grid lg:grid-cols-3 gap-6">
        {!isMechanic && (
          <div className="lg:col-span-2">
            <TrendChartWidget jobs={filteredJobs} />
          </div>
        )}

        <Card className={`bg-slate-900 border-slate-800 ${isMechanic ? 'lg:col-span-3' : ''}`}>
          <CardHeader className="border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Timer className="w-5 h-5 text-orange-400" />
              <CardTitle className="text-lg font-bold text-slate-100">Shop Pulse</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
              <div className="flex items-center gap-2 text-slate-300">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-sm">Completion Rate</span>
              </div>
              <span className="text-lg font-bold text-emerald-400">{completionRate}%</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
              <div className="flex items-center gap-2 text-slate-300">
                <Clock className="w-4 h-4 text-blue-400" />
                <span className="text-sm">Avg Turnaround</span>
              </div>
              <span className="text-lg font-bold text-blue-300">
                {avgTurnaround !== null ? `${avgTurnaround} day${avgTurnaround === 1 ? '' : 's'}` : '-'}
              </span>
            </div>

            <Link to={createPageUrl("Jobs")} className="block">
              <div className="flex items-center justify-between p-3 rounded-lg bg-amber-950/40 border border-amber-800/60 hover:bg-amber-950/60 transition-colors">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <div>
                    <p className="text-sm font-medium text-amber-200">Awaiting Approval</p>
                    <p className="text-xs text-amber-300/70">Needs customer sign-off</p>
                  </div>
                </div>
                <Badge className="bg-amber-600 text-white border-0 text-sm font-bold px-2.5">
                  {awaitingApprovalJobs.length}
                </Badge>
              </div>
            </Link>

            <p className="text-xs text-slate-500 text-center pt-1">
              Based on {nonCancelledJobs.length} non-cancelled job{nonCancelledJobs.length === 1 ? '' : 's'} · {formatMoney(totalRevenue)} lifetime revenue
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

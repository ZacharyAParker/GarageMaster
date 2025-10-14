
import React from "react";
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
  DollarSign, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  Package,
  Users,
  TrendingUp,
  Calendar,
  ArrowRight
} from "lucide-react";
import { format } from "date-fns";

import StatsGrid from "../components/dashboard/StatsGrid";
import ActiveJobsWidget from "../components/dashboard/ActiveJobsWidget";
import RecentActivityWidget from "../components/dashboard/RecentActivityWidget";
import InventoryAlertsWidget from "../components/dashboard/InventoryAlertsWidget";
import PermissionGate from "../components/permissions/PermissionGate";

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

  // Filter jobs for mechanics to show only their assigned jobs
  // Admins see all jobs
  const filteredJobs = (currentUser?.role === 'admin' || currentUser?.position !== 'mechanic')
    ? jobs
    : jobs.filter(j => j.assigned_mechanic_id === currentUser?.id);

  const activeJobs = filteredJobs.filter(j => !['completed', 'cancelled'].includes(j.status));
  const urgentJobs = filteredJobs.filter(j => j.priority === 'urgent' && !['completed', 'cancelled'].includes(j.status));
  const lowStockItems = inventory.filter(item => item.quantity_in_stock <= item.minimum_stock);
  const totalRevenue = filteredJobs.filter(j => j.status === 'completed').reduce((sum, j) => sum + (j.total_cost || 0), 0);

  const userHasPosition = !!currentUser?.position;

  return (
    <div className="p-6 space-y-6 bg-slate-950">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">
            {currentUser?.position === 'mechanic' ? 'My Dashboard' : 'Welcome to GarageSim CRM'}
          </h1>
          <p className="text-slate-400 mt-1">
            {currentUser?.position === 'mechanic' 
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
    </div>
  );
}

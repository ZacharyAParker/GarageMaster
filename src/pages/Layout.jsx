

import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery } from "@tanstack/react-query";
import api from "@/api/client";
import {
  LayoutDashboard,
  Users,
  Car,
  Wrench,
  Package,
  MessageSquare,
  Settings,
  Trophy,
  UserCog,
  Menu,
  Bell,
  Search,
  ClipboardCheck,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import NotificationBell from "../components/notifications/NotificationBell";

const navigationItems = [
  { title: "Dashboard", url: createPageUrl("Dashboard"), icon: LayoutDashboard, showAlways: true },
  { title: "Customers", url: createPageUrl("Customers"), icon: Users, requirePosition: true, blockCustomers: true },
  { title: "Vehicles", url: createPageUrl("Vehicles"), icon: Car, requirePosition: true, blockCustomers: true },
  { title: "Jobs", url: createPageUrl("Jobs"), icon: Wrench, requirePosition: true, blockCustomers: true },
  { title: "Inspections", url: createPageUrl("Inspections"), icon: ClipboardCheck, requirePosition: true, blockCustomers: true },
  { title: "Employees", url: createPageUrl("Employees"), icon: UserCog, showToEmployees: true, blockCustomers: true }, // Show to all employees
  { title: "Inventory", url: createPageUrl("Inventory"), icon: Package, showAlways: true }, // Everyone can view
  { title: "Messages", url: createPageUrl("Messages"), icon: MessageSquare, requirePosition: true, blockCustomers: true },
  { title: "Leaderboard", url: createPageUrl("Leaderboard"), icon: Trophy, requirePosition: true, blockCustomers: true },
];

export default function Layout({ children }) {
  const location = useLocation();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
  queryFn: () => api.auth.me()
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
  queryFn: () => api.entities.Job.list()
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ['inventory'],
  queryFn: () => api.entities.InventoryItem.list()
  });

  const activeJobs = jobs.filter(j => !['completed', 'cancelled'].includes(j.status)).length;
  const pendingApprovals = jobs.filter(j => j.status === 'awaiting_approval').length;
  const lowStockItems = inventory.filter(item => item.quantity_in_stock <= item.minimum_stock).length;

  const getUserInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return parts[0][0] + parts[1][0];
    }
    return name[0];
  };

  const getUserLevel = () => {
    if (!currentUser) return 1;
    return currentUser.level || Math.floor((currentUser.xp_points || 0) / 1000) + 1;
  };

  const getUserJobCount = () => {
    if (!currentUser) return 0;
    return currentUser.jobs_completed || 0;
  };

  const getPositionDisplay = (position) => {
    if (!position) return 'Pending Setup'; // Added check
    const positionMap = {
      'admin': 'Administrator',
      'manager': 'Manager',
      'mechanic': 'Mechanic',
      'service_advisor': 'Service Advisor',
      'parts_specialist': 'Parts Specialist',
      'customer': 'Customer'
    };
    return positionMap[position] || 'Team Member';
  };

  // Check if user has a position assigned
  const userHasPosition = currentUser?.position;
  const isCustomer = currentUser?.position === 'customer';
  
  // Admin sees everything
  const isBaseAdmin = currentUser?.role === 'admin';

  return (
    <SidebarProvider>
      <style>{`
        :root {
          --sidebar-background: 15 23 42;
          --sidebar-foreground: 241 245 249;
          --sidebar-primary: 249 115 22;
          --sidebar-primary-foreground: 255 255 255;
          --sidebar-accent: 30 41 59;
          --sidebar-accent-foreground: 241 245 249;
          --sidebar-border: 30 41 59;
        }

        [data-sidebar] {
          background-color: rgb(15 23 42) !important;
        }
      `}</style>
      <div className="min-h-screen flex w-full bg-slate-950">
        <Sidebar className="border-r border-slate-800 bg-slate-950">
          <SidebarHeader className="border-b border-slate-800 p-4 bg-slate-950">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-orange-500 rounded-lg flex items-center justify-center shadow-lg">
                <Wrench className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-slate-100 text-lg">GarageSim</h2>
                <p className="text-xs text-slate-500">CRM Pro</p>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="p-2 bg-slate-950">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 py-2">
                Navigation
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => {
                    // Admins see everything
                    if (isBaseAdmin) {
                      return (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton
                            asChild
                            className={`transition-all duration-200 rounded-lg mb-1 ${
                              location.pathname === item.url
                                ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-lg shadow-orange-900/50'
                                : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <Link to={item.url} className="flex items-center gap-3 px-3 py-2.5">
                              <item.icon className="w-4 h-4" />
                              <span className="font-medium text-sm">{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    }

                    // Block customers from certain pages
                    if (item.blockCustomers && isCustomer) {
                      return null;
                    }
                    
                    // Show to employees specifically (has position but not customer)
                    if (item.showToEmployees) {
                      if (!userHasPosition || isCustomer) {
                        return null;
                      }
                    }
                    
                    // Show if marked showAlways OR user has a position (and not customer for requirePosition items)
                    const shouldShow = item.showAlways || 
                                     (item.showToEmployees && userHasPosition && !isCustomer) || 
                                     (userHasPosition && !isCustomer);
                    
                    if (!shouldShow && item.requirePosition) {
                      return null;
                    }

                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          className={`transition-all duration-200 rounded-lg mb-1 ${
                            location.pathname === item.url
                              ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-lg shadow-orange-900/50'
                              : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <Link to={item.url} className="flex items-center gap-3 px-3 py-2.5">
                            <item.icon className="w-4 h-4" />
                            <span className="font-medium text-sm">{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {(userHasPosition && !isCustomer) || isBaseAdmin ? (
              <SidebarGroup className="mt-4">
                <SidebarGroupLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 py-2">
                  Quick Stats
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <div className="px-3 py-2 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Active Jobs</span>
                      <Badge className="bg-orange-600 text-white border-0">{activeJobs}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Pending Approvals</span>
                      <Badge className="bg-yellow-600 text-white border-0">{pendingApprovals}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Low Stock Items</span>
                      <Badge className="bg-red-600 text-white border-0">{lowStockItems}</Badge>
                    </div>
                  </div>
                </SidebarGroupContent>
              </SidebarGroup>
            ) : null}
          </SidebarContent>

          <SidebarFooter className="border-t border-slate-800 p-4 bg-slate-950">
            <div className="flex items-center gap-3">
              {currentUser?.avatar_url ? (
                <img
                  src={currentUser.avatar_url}
                  alt={currentUser.full_name}
                  className="w-9 h-9 rounded-full object-cover shadow-lg"
                />
              ) : (
                <div className="w-9 h-9 bg-gradient-to-br from-orange-600 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white font-semibold text-sm">
                    {getUserInitials(currentUser?.full_name)}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-200 text-sm truncate">
                  {currentUser?.full_name || 'Loading...'}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {isBaseAdmin ? (
                    <>Super Admin • Full Access</>
                  ) : userHasPosition ? (
                    <>{getPositionDisplay(currentUser?.position)} • Level {getUserLevel()}</>
                  ) : (
                    <>Pending Setup</>
                  )}
                </p>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col bg-slate-950">
          <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="lg:hidden hover:bg-slate-800 p-2 rounded-lg transition-colors text-slate-400" />
              {userHasPosition && !isCustomer && (
                <div className="hidden md:flex items-center gap-2 bg-slate-800 rounded-lg px-4 py-2 w-96 border border-slate-700">
                  <Search className="w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search jobs, customers, vehicles..."
                    className="bg-transparent outline-none text-sm text-slate-300 placeholder-slate-500 w-full"
                  />
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              {userHasPosition && !isCustomer && <NotificationBell />}
              <Link to={createPageUrl("Settings")}>
                <Button variant="ghost" size="icon" className="hover:bg-slate-800">
                  <Settings className="w-5 h-5 text-slate-400" />
                </Button>
              </Link>
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}


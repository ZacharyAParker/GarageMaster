
import { Card, CardContent } from "@/components/ui/card";
import { Wrench, Car, DollarSign, AlertTriangle, Users, Package } from "lucide-react";

const statConfigs = [
  {
    key: "activeJobs",
    label: "Active Jobs",
    icon: Wrench,
    color: "blue",
    gradient: "from-blue-600 to-blue-500"
  },
  {
    key: "totalVehicles",
    label: "Vehicles in Shop",
    icon: Car,
    color: "orange",
    gradient: "from-orange-600 to-orange-500"
  },
  {
    key: "totalRevenue",
    label: "Revenue (Month)",
    icon: DollarSign,
    color: "green",
    gradient: "from-green-600 to-green-500",
    format: (val) => `$${val.toLocaleString()}`
  },
  {
    key: "urgentJobs",
    label: "Urgent Jobs",
    icon: AlertTriangle,
    color: "red",
    gradient: "from-red-600 to-red-500"
  },
  {
    key: "totalCustomers",
    label: "Total Customers",
    icon: Users,
    color: "purple",
    gradient: "from-purple-600 to-purple-500"
  },
  {
    key: "lowStockAlerts",
    label: "Low Stock Alerts",
    icon: Package,
    color: "yellow",
    gradient: "from-yellow-600 to-yellow-500"
  }
];

export default function StatsGrid({ stats }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {statConfigs.map((config) => {
        const Icon = config.icon;
        const value = stats[config.key] || 0;
        const displayValue = config.format ? config.format(value) : value;

        return (
          <Card key={config.key} className="relative overflow-hidden border-slate-800 bg-slate-900 shadow-xl hover:shadow-2xl transition-all duration-300">
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${config.gradient} opacity-20 rounded-full transform translate-x-16 -translate-y-16`}></div>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-slate-400 mb-1">{config.label}</p>
                  <h3 className="text-3xl font-bold text-slate-100">{displayValue}</h3>
                </div>
                <div className={`p-3 rounded-xl bg-gradient-to-br ${config.gradient} shadow-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
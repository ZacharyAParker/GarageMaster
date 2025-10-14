import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { AlertTriangle, ArrowRight } from "lucide-react";

export default function InventoryAlertsWidget({ lowStockItems }) {
  return (
    <Card className="shadow-xl border-red-900/50 bg-slate-900">
      <CardHeader className="border-b border-red-900/50 bg-red-950/30">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <CardTitle className="text-lg font-bold text-red-300">Low Stock Alerts</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {lowStockItems.length === 0 ? (
          <p className="text-center text-slate-500 py-6 text-sm">All parts are well stocked</p>
        ) : (
          <div className="space-y-3">
            {lowStockItems.slice(0, 5).map((item) => (
              <div key={item.id} className="p-3 bg-red-950/30 border border-red-900/50 rounded-lg">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium text-slate-200 text-sm">{item.part_name}</p>
                    <p className="text-xs text-slate-500 mt-1">Part #: {item.part_number}</p>
                  </div>
                  <Badge className="bg-red-600 text-white border-0">
                    {item.quantity_in_stock} left
                  </Badge>
                </div>
              </div>
            ))}
            <Link to={createPageUrl("Inventory")}>
              <Button variant="outline" className="w-full mt-2 bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750" size="sm">
                View All Alerts <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
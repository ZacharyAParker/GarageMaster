import {  useMemo, useState  } from "react";
import api from "@/api/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { INVENTORY_CATEGORIES } from "@/lib/constants";
import { formatMoney } from "@/lib/format";

import InventoryForm from "../components/inventory/InventoryForm";
import StockAdjustDialog from "@/components/inventory/StockAdjustDialog";
import MovementHistory from "@/components/inventory/MovementHistory";
import SupplierDirectory from "@/components/inventory/SupplierDirectory";
import {
  Plus,
  Search,
  Package,
  AlertTriangle,
  Edit,
  Trash2,
  History,
  PackagePlus,
  Printer,
  DollarSign,
  Tag,
  TrendingUp,
  XCircle,
} from "lucide-react";

// Stock indicator: red at/below minimum, amber up to 2x minimum, green above.
function stockLevel(item) {
  const qty = Number(item.quantity_in_stock) || 0;
  const min = Number(item.minimum_stock) || 0;
  if (qty <= min) return "red";
  if (qty <= min * 2) return "amber";
  return "green";
}

const STOCK_TONES = {
  red: { text: "text-red-400", badge: "bg-red-500/10 text-red-300 border-red-500/30", label: "Low" },
  amber: { text: "text-amber-400", badge: "bg-amber-500/10 text-amber-300 border-amber-500/30", label: "Watch" },
  green: { text: "text-green-400", badge: "bg-green-500/10 text-green-300 border-green-500/30", label: "OK" },
};

const categoryLabel = (c) => String(c || "").replace(/_/g, " ");

export default function Inventory() {
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [adjustItem, setAdjustItem] = useState(null);
  const [historyItem, setHistoryItem] = useState(null);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => api.auth.me(),
  });

  const { data: inventory = [], isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => api.entities.InventoryItem.list("part_name"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.InventoryItem.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });

  // Admins can manage, OR anyone with a shop position (mechanic, manager, etc.) can manage
  // Only customers are read-only
  const canManage =
    currentUser?.role === "admin" ||
    (currentUser?.position && currentUser?.position !== "customer");

  const handleEdit = (item) => {
    if (!canManage) {
      alert("You don't have permission to edit inventory.");
      return;
    }
    setEditingItem(item);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (!canManage) {
      alert("You don't have permission to delete inventory.");
      return;
    }
    if (confirm("Are you sure you want to delete this part?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleAdjustStock = (item) => {
    if (!canManage) {
      alert("You don't have permission to adjust stock.");
      return;
    }
    setAdjustItem(item);
  };

  const isLowStock = (item) =>
    (Number(item.quantity_in_stock) || 0) <= (Number(item.minimum_stock) || 0);

  const filteredInventory = inventory.filter((item) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      item.part_name?.toLowerCase().includes(q) ||
      item.part_number?.toLowerCase().includes(q) ||
      item.supplier?.toLowerCase().includes(q);
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    const matchesLowStock = !lowStockOnly || isLowStock(item);
    return matchesSearch && matchesCategory && matchesLowStock;
  });

  // ---- KPIs (computed over the full catalog) ----
  const lowStockItems = inventory.filter(isLowStock);
  const outOfStockItems = inventory.filter((i) => (Number(i.quantity_in_stock) || 0) <= 0);
  const valueAtCost = inventory.reduce(
    (sum, item) => sum + (Number(item.quantity_in_stock) || 0) * (Number(item.unit_cost) || 0),
    0
  );
  const retailValue = inventory.reduce(
    (sum, item) => sum + (Number(item.quantity_in_stock) || 0) * (Number(item.retail_price) || 0),
    0
  );
  const potentialMargin = retailValue - valueAtCost;

  // ---- Reorder report data: items needing reorder grouped by supplier ----
  const reorderGroups = useMemo(() => {
    const groups = new Map();
    for (const item of lowStockItems) {
      const supplier = (item.supplier || "").trim() || "No Supplier";
      if (!groups.has(supplier)) groups.set(supplier, []);
      groups.get(supplier).push(item);
    }
    return [...groups.entries()]
      .map(([supplier, items]) => ({ supplier, items }))
      .sort((a, b) => a.supplier.localeCompare(b.supplier));
  }, [inventory]); // eslint-disable-line react-hooks/exhaustive-deps

  const kpis = [
    {
      label: "Value at Cost",
      value: formatMoney(valueAtCost),
      icon: DollarSign,
      gradient: "from-blue-600 to-blue-500",
      text: "text-blue-400",
    },
    {
      label: "Retail Value",
      value: formatMoney(retailValue),
      icon: Tag,
      gradient: "from-purple-600 to-purple-500",
      text: "text-purple-400",
    },
    {
      label: "Potential Margin",
      value: formatMoney(potentialMargin),
      icon: TrendingUp,
      gradient: "from-green-600 to-green-500",
      text: "text-green-400",
    },
    {
      label: "Low Stock",
      value: String(lowStockItems.length),
      icon: AlertTriangle,
      gradient: "from-amber-600 to-amber-500",
      text: "text-amber-400",
    },
    {
      label: "Out of Stock",
      value: String(outOfStockItems.length),
      icon: XCircle,
      gradient: "from-red-600 to-red-500",
      text: "text-red-400",
    },
  ];

  return (
    <div className="p-6 space-y-6 bg-slate-950 min-h-screen">
      {/* Print-only low stock report */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #low-stock-report, #low-stock-report * { visibility: visible !important; }
          #low-stock-report {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: #ffffff !important;
          }
        }
      `}</style>
      <div id="low-stock-report" className="hidden print:block text-slate-900 p-6">
        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3 mb-4">
          <div>
            <h1 className="text-2xl font-bold">Low Stock Report</h1>
            <p className="text-sm text-slate-600">
              GarageMaster · Generated {new Date().toLocaleString()}
            </p>
          </div>
          <p className="text-sm text-slate-700">
            {lowStockItems.length} part{lowStockItems.length === 1 ? "" : "s"} need
            {lowStockItems.length === 1 ? "s" : ""} reordering
          </p>
        </div>
        {reorderGroups.length === 0 ? (
          <p className="text-slate-600">All stock levels are healthy - nothing to reorder.</p>
        ) : (
          <div className="space-y-5">
            {reorderGroups.map(({ supplier, items }) => (
              <div key={supplier}>
                <h2 className="text-lg font-bold mb-1">{supplier}</h2>
                <p className="text-xs text-slate-600 mb-2">
                  {items.length} part{items.length === 1 ? "" : "s"} to reorder
                </p>
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-400 text-left">
                      <th className="py-1 pr-3 font-semibold">Part #</th>
                      <th className="py-1 pr-3 font-semibold">Name</th>
                      <th className="py-1 pr-3 text-right font-semibold">In Stock</th>
                      <th className="py-1 pr-3 text-right font-semibold">Minimum</th>
                      <th className="py-1 text-right font-semibold">Suggested Order</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const qty = Number(item.quantity_in_stock) || 0;
                      const min = Number(item.minimum_stock) || 0;
                      const suggested = Math.max(min * 2 - qty, 1);
                      return (
                        <tr key={item.id} className="border-b border-slate-200">
                          <td className="py-1 pr-3 font-mono text-xs">{item.part_number || "-"}</td>
                          <td className="py-1 pr-3">
                            {item.part_name}
                            {item.brand ? (
                              <span className="text-slate-500"> · {item.brand}</span>
                            ) : null}
                          </td>
                          <td className="py-1 pr-3 text-right">{qty}</td>
                          <td className="py-1 pr-3 text-right">{min}</td>
                          <td className="py-1 text-right font-semibold">{suggested}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Parts Inventory</h1>
          <p className="text-slate-400 mt-1">
            {canManage
              ? "Manage stock levels, movements, and parts catalog"
              : "View parts catalog and availability"}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => window.print()}
            disabled={lowStockItems.length === 0}
            className="bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
          >
            <Printer className="w-4 h-4 mr-2" />
            Low Stock Report
          </Button>
          {canManage && (
            <Button
              onClick={() => {
                setShowForm(true);
                setEditingItem(null);
              }}
              className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Part
            </Button>
          )}
        </div>
      </div>

      {showForm && canManage && (
        <InventoryForm
          item={editingItem}
          onClose={() => {
            setShowForm(false);
            setEditingItem(null);
          }}
        />
      )}

      <Tabs defaultValue="catalog" className="space-y-6">
        <TabsList className="bg-slate-900 border border-slate-800 p-1">
          <TabsTrigger
            value="catalog"
            className="data-[state=active]:bg-slate-800 data-[state=active]:text-orange-400 text-slate-400"
          >
            <Package className="w-4 h-4 mr-2" />
            Parts Catalog
          </TabsTrigger>
          <TabsTrigger
            value="suppliers"
            className="data-[state=active]:bg-slate-800 data-[state=active]:text-orange-400 text-slate-400"
          >
            Suppliers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="mt-0 space-y-6">
          {/* KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
            {kpis.map((kpi) => {
              const Icon = kpi.icon;
              return (
                <Card key={kpi.label} className="bg-slate-900 border-slate-800">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 bg-gradient-to-br ${kpi.gradient} rounded-lg flex items-center justify-center shrink-0`}
                      >
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-slate-400 truncate">{kpi.label}</p>
                        <p className={`text-xl font-bold ${kpi.text}`}>{kpi.value}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="border-b border-slate-800">
              <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                <CardTitle className="text-xl font-bold text-slate-100">All Parts</CardTitle>
                <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                  <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-4 py-2 flex-1 lg:w-80 border border-slate-700">
                    <Search className="w-4 h-4 text-slate-500" />
                    <Input
                      type="text"
                      placeholder="Search name, part #, or supplier…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-transparent border-0 outline-none text-sm text-slate-300 placeholder-slate-500 p-0"
                    />
                  </div>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-4 py-2 capitalize"
                  >
                    <option value="all">All Categories</option>
                    {INVENTORY_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {categoryLabel(cat)}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="low-stock-only"
                      checked={lowStockOnly}
                      onCheckedChange={setLowStockOnly}
                      className="data-[state=checked]:bg-orange-600"
                    />
                    <Label
                      htmlFor="low-stock-only"
                      className="text-sm text-slate-400 cursor-pointer whitespace-nowrap"
                    >
                      Low stock only
                    </Label>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {isLoading ? (
                <div className="text-center py-12 text-slate-500">Loading inventory…</div>
              ) : filteredInventory.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-500">No parts found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-800">
                        <th className="text-left text-xs font-semibold text-slate-400 uppercase p-3">Part #</th>
                        <th className="text-left text-xs font-semibold text-slate-400 uppercase p-3">Name</th>
                        <th className="text-left text-xs font-semibold text-slate-400 uppercase p-3">Category</th>
                        <th className="text-left text-xs font-semibold text-slate-400 uppercase p-3">Supplier</th>
                        <th className="text-right text-xs font-semibold text-slate-400 uppercase p-3">Stock</th>
                        <th className="text-right text-xs font-semibold text-slate-400 uppercase p-3">Unit Cost</th>
                        <th className="text-right text-xs font-semibold text-slate-400 uppercase p-3">Retail</th>
                        <th className="text-right text-xs font-semibold text-slate-400 uppercase p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInventory.map((item) => {
                        const tone = STOCK_TONES[stockLevel(item)];
                        return (
                          <tr key={item.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                            <td className="p-3 text-slate-300 font-mono text-sm">{item.part_number}</td>
                            <td className="p-3">
                              <p className="text-slate-200 font-medium">{item.part_name}</p>
                              {item.brand && <p className="text-xs text-slate-500">{item.brand}</p>}
                            </td>
                            <td className="p-3">
                              <Badge
                                variant="outline"
                                className="bg-slate-900 text-slate-400 border-slate-700 capitalize"
                              >
                                {categoryLabel(item.category)}
                              </Badge>
                            </td>
                            <td className="p-3 text-slate-400 text-sm">
                              {item.supplier || <span className="text-slate-600">-</span>}
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <span className={`font-semibold ${tone.text}`}>
                                  {Number(item.quantity_in_stock) || 0}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] px-1.5 py-0 ${tone.badge}`}
                                >
                                  {tone.label}
                                </Badge>
                              </div>
                              <p className="text-[10px] text-slate-600 mt-0.5">
                                min {Number(item.minimum_stock) || 0}
                              </p>
                            </td>
                            <td className="p-3 text-right text-slate-300">{formatMoney(item.unit_cost)}</td>
                            <td className="p-3 text-right text-slate-300">{formatMoney(item.retail_price)}</td>
                            <td className="p-3 text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setHistoryItem(item)}
                                  title="Movement history"
                                  className="text-slate-400 hover:text-slate-200"
                                >
                                  <History className="w-4 h-4" />
                                </Button>
                                {canManage && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleAdjustStock(item)}
                                      title="Adjust stock"
                                      className="text-orange-400 hover:text-orange-300"
                                    >
                                      <PackagePlus className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleEdit(item)}
                                      title="Edit part"
                                      className="text-slate-400 hover:text-slate-200"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleDelete(item.id)}
                                      title="Delete part"
                                      className="text-red-400 hover:text-red-300"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers" className="mt-0">
          <SupplierDirectory items={inventory} />
        </TabsContent>
      </Tabs>

      <StockAdjustDialog
        item={adjustItem}
        open={!!adjustItem}
        onClose={() => setAdjustItem(null)}
        currentUser={currentUser}
      />
      <MovementHistory item={historyItem} open={!!historyItem} onClose={() => setHistoryItem(null)} />
    </div>
  );
}

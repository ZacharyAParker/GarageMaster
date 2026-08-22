import {  useMemo, useState  } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import {
  Building2,
  ChevronDown,
  ChevronUp,
  Package,
  AlertTriangle,
  Layers,
  Boxes,
} from "lucide-react";

function stockTone(item) {
  const qty = Number(item.quantity_in_stock) || 0;
  const min = Number(item.minimum_stock) || 0;
  if (qty <= min) return { label: "Low", dot: "bg-red-400", text: "text-red-400" };
  if (qty <= min * 2) return { label: "Watch", dot: "bg-amber-400", text: "text-amber-400" };
  return { label: "OK", dot: "bg-green-400", text: "text-green-400" };
}

export default function SupplierDirectory({ items = [] }) {
  const [expanded, setExpanded] = useState(() => new Set());

  const suppliers = useMemo(() => {
    const groups = new Map();
    for (const item of items) {
      const name = (item.supplier || "").trim() || "No Supplier";
      if (!groups.has(name)) groups.set(name, []);
      groups.get(name).push(item);
    }
    return [...groups.entries()]
      .map(([name, parts]) => ({
        name,
        parts: parts.slice().sort((a, b) =>
          String(a.part_name || "").localeCompare(String(b.part_name || ""))
        ),
        partCount: parts.length,
        totalUnits: parts.reduce((s, p) => s + (Number(p.quantity_in_stock) || 0), 0),
        totalValue: parts.reduce(
          (s, p) => s + (Number(p.unit_cost) || 0) * (Number(p.quantity_in_stock) || 0),
          0
        ),
        lowStockCount: parts.filter(
          (p) => (Number(p.quantity_in_stock) || 0) <= (Number(p.minimum_stock) || 0)
        ).length,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  const toggle = (name) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  if (suppliers.length === 0) {
    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-12 text-center">
          <Building2 className="w-14 h-14 text-slate-700 mx-auto mb-4" />
          <p className="text-slate-500">No suppliers yet</p>
          <p className="text-slate-600 text-sm mt-1">
            Add a supplier to a part and it will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        {suppliers.length} supplier{suppliers.length === 1 ? "" : "s"} across{" "}
        {items.length} parts
      </p>

      {suppliers.map((supplier) => {
        const isOpen = expanded.has(supplier.name);
        return (
          <Card key={supplier.name} className="bg-slate-900 border-slate-800">
            <CardContent className="p-0">
              <button
                type="button"
                onClick={() => toggle(supplier.name)}
                className="w-full flex flex-col md:flex-row md:items-center gap-4 p-5 text-left hover:bg-slate-800/40 transition-colors rounded-t-lg"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-600 to-orange-500 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-100 truncate">{supplier.name}</p>
                    <p className="text-xs text-slate-500">
                      {isOpen ? "Hide parts" : "View parts"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-500 flex items-center gap-1">
                      <Package className="w-3 h-3" /> Parts
                    </p>
                    <p className="text-lg font-bold text-slate-100">{supplier.partCount}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-500 flex items-center gap-1">
                      <Boxes className="w-3 h-3" /> Units
                    </p>
                    <p className="text-lg font-bold text-slate-100">{supplier.totalUnits}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-500 flex items-center gap-1">
                      <Layers className="w-3 h-3" /> Stock Value
                    </p>
                    <p className="text-lg font-bold text-orange-400">
                      {formatMoney(supplier.totalValue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-500 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Low Stock
                    </p>
                    <p
                      className={`text-lg font-bold ${
                        supplier.lowStockCount > 0 ? "text-red-400" : "text-slate-100"
                      }`}
                    >
                      {supplier.lowStockCount}
                    </p>
                  </div>
                </div>

                <div className="text-slate-500 shrink-0">
                  {isOpen ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-slate-800 p-4 bg-slate-950/40 rounded-b-lg">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-800">
                          <th className="text-left text-[10px] font-semibold text-slate-500 uppercase p-2">Part #</th>
                          <th className="text-left text-[10px] font-semibold text-slate-500 uppercase p-2">Name</th>
                          <th className="text-left text-[10px] font-semibold text-slate-500 uppercase p-2">Category</th>
                          <th className="text-right text-[10px] font-semibold text-slate-500 uppercase p-2">Stock</th>
                          <th className="text-right text-[10px] font-semibold text-slate-500 uppercase p-2">Unit Cost</th>
                          <th className="text-right text-[10px] font-semibold text-slate-500 uppercase p-2">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {supplier.parts.map((part) => {
                          const tone = stockTone(part);
                          const value =
                            (Number(part.unit_cost) || 0) * (Number(part.quantity_in_stock) || 0);
                          return (
                            <tr key={part.id} className="border-b border-slate-800/60 last:border-0">
                              <td className="p-2 font-mono text-xs text-slate-400">{part.part_number || "-"}</td>
                              <td className="p-2">
                                <span className="text-sm text-slate-200">{part.part_name}</span>
                                {part.brand && (
                                  <span className="text-xs text-slate-500"> · {part.brand}</span>
                                )}
                              </td>
                              <td className="p-2">
                                <Badge
                                  variant="outline"
                                  className="bg-slate-900 text-slate-400 border-slate-700 text-[10px] capitalize"
                                >
                                  {String(part.category || "other").replace(/_/g, " ")}
                                </Badge>
                              </td>
                              <td className={`p-2 text-right text-sm font-semibold ${tone.text}`}>
                                <span className={`inline-block w-2 h-2 rounded-full mr-2 ${tone.dot}`} />
                                {Number(part.quantity_in_stock) || 0}
                                <span className="text-slate-600 font-normal">
                                  {" "}
                                  / min {Number(part.minimum_stock) || 0}
                                </span>
                              </td>
                              <td className="p-2 text-right text-sm text-slate-400">
                                {formatMoney(part.unit_cost)}
                              </td>
                              <td className="p-2 text-right text-sm text-slate-300">
                                {formatMoney(value)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggle(supplier.name)}
                      className="text-slate-500 hover:text-slate-300"
                    >
                      Collapse
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

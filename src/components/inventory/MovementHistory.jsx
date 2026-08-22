import React from "react";
import api from "@/api/client";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, initials } from "@/lib/format";
import { ArrowDownToLine, ArrowUpFromLine, Scale, PackageOpen } from "lucide-react";
import { REASON_LABELS } from "./StockAdjustDialog";

const TYPE_META = {
  in: { label: "Parts In", Icon: ArrowDownToLine, iconClass: "text-green-400", chipClass: "bg-green-500/10 border border-green-500/30" },
  out: { label: "Parts Out", Icon: ArrowUpFromLine, iconClass: "text-red-400", chipClass: "bg-red-500/10 border border-red-500/30" },
  adjust: { label: "Correction", Icon: Scale, iconClass: "text-amber-400", chipClass: "bg-amber-500/10 border border-amber-500/30" },
};

export default function MovementHistory({ item, open, onClose }) {
  // Newest first: order by descending created_date.
  const { data: movements = [], isLoading } = useQuery({
    queryKey: ["movements", item?.id],
    queryFn: () => api.entities.StockMovement.filter({ item_id: item.id }, "-created_date"),
    enabled: open && !!item,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.auth.listUsers(),
    enabled: open,
  });

  const userById = React.useMemo(() => {
    const map = new Map();
    for (const u of users) map.set(u.id, u);
    return map;
  }, [users]);

  const performerFor = (movement) => {
    const user = userById.get(movement.performed_by);
    return user?.full_name || movement.performed_by || "Unknown";
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : null)}>
      <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-slate-100">Movement History</DialogTitle>
          <DialogDescription className="text-slate-400">
            {item?.part_name}
            {item?.part_number ? (
              <span className="font-mono text-slate-500"> · {item.part_number}</span>
            ) : null}
            {" · "}
            <span className="text-slate-300">
              {Number(item?.quantity_in_stock) || 0} in stock
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto -mx-2 px-2 space-y-2">
          {isLoading ? (
            <div className="text-center py-10 text-slate-500 text-sm">Loading movements…</div>
          ) : movements.length === 0 ? (
            <div className="text-center py-10">
              <PackageOpen className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No stock movements recorded yet.</p>
              <p className="text-slate-600 text-xs mt-1">
                Adjustments will appear here after you record them.
              </p>
            </div>
          ) : (
            movements.map((m) => {
              const meta = TYPE_META[m.movement_type] || TYPE_META.adjust;
              const { Icon } = meta;
              const qty = Number(m.quantity) || 0;
              const performerName = performerFor(m);
              return (
                <div
                  key={m.id}
                  className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-950/50 p-3"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${meta.chipClass}`}>
                    <Icon className={`w-4 h-4 ${meta.iconClass}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-bold ${meta.iconClass}`}>
                        {qty > 0 ? `+${qty}` : qty}
                      </span>
                      <span className="text-sm font-medium text-slate-200">
                        {REASON_LABELS[m.reason] || "Other"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      <span className="text-xs text-slate-500">{formatDateTime(m.created_date)}</span>
                      <span
                        title={performerName}
                        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-500/20 text-orange-300 text-[9px] font-bold"
                      >
                        {initials(performerName)}
                      </span>
                      <span className="text-xs text-slate-500">{performerName}</span>
                      {m.reference && (
                        <Badge
                          variant="outline"
                          className="bg-slate-900 text-slate-400 border-slate-700 text-[10px] px-1.5 py-0 font-mono"
                        >
                          {m.reference}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] uppercase tracking-wide text-slate-600">Result</p>
                    <p className="text-sm font-semibold text-slate-300">
                      {m.resulting_quantity != null ? m.resulting_quantity : "-"}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

import {  useEffect, useMemo, useState  } from "react";
import api from "@/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowDownToLine, ArrowUpFromLine, Scale, Loader2 } from "lucide-react";

export const MOVEMENT_REASONS = [
  "received_order",
  "used_on_job",
  "stock_count_correction",
  "damaged",
  "returned_to_supplier",
  "other",
];

export const REASON_LABELS = {
  received_order: "Received Order",
  used_on_job: "Used on Job",
  stock_count_correction: "Stock Count Correction",
  damaged: "Damaged",
  returned_to_supplier: "Returned to Supplier",
  other: "Other",
};

const MOVEMENT_TYPES = [
  {
    value: "in",
    label: "Parts In",
    hint: "Add stock to inventory",
    icon: ArrowDownToLine,
    iconClass: "text-green-400",
    ringClass: "border-green-500/40 bg-green-500/10",
  },
  {
    value: "out",
    label: "Parts Out",
    hint: "Remove stock from inventory",
    icon: ArrowUpFromLine,
    iconClass: "text-red-400",
    ringClass: "border-red-500/40 bg-red-500/10",
  },
  {
    value: "adjust",
    label: "Correction",
    hint: "Signed delta - use negative to decrease",
    icon: Scale,
    iconClass: "text-amber-400",
    ringClass: "border-amber-500/40 bg-amber-500/10",
  },
];

export default function StockAdjustDialog({ item, open, onClose, currentUser }) {
  const queryClient = useQueryClient();
  const [movementType, setMovementType] = useState("in");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("received_order");
  const [reference, setReference] = useState("");

  useEffect(() => {
    if (open) {
      setMovementType("in");
      setQuantity("1");
      setReason("received_order");
      setReference("");
    }
  }, [open, item?.id]);

  const currentQty = Number(item?.quantity_in_stock) || 0;
  const parsedQty = Number(quantity);
  const hasQty = quantity !== "" && Number.isFinite(parsedQty);
  const signedQty = useMemo(() => {
    if (!hasQty) return 0;
    if (movementType === "in") return Math.abs(parsedQty);
    if (movementType === "out") return -Math.abs(parsedQty);
    return parsedQty; // correction: signed delta
  }, [hasQty, parsedQty, movementType]);

  // Clamp at zero minimum - stock can never go negative.
  const resultingQty = Math.max(currentQty + signedQty, 0);

  const qtyValid =
    hasQty &&
    (movementType === "adjust" ? parsedQty !== 0 : Math.abs(parsedQty) > 0);

  const mutation = useMutation({
    mutationFn: async () => {
      const movement = await api.entities.StockMovement.create({
        item_id: item.id,
        movement_type: movementType,
        quantity: signedQty,
        reason,
        reference: reference.trim(),
        resulting_quantity: resultingQty,
        performed_by: currentUser?.id || null,
      });
      const updated = await api.entities.InventoryItem.update(item.id, {
        quantity_in_stock: resultingQty,
      });
      return { movement, updated };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["movements"] });
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!qtyValid) return;
    mutation.mutate();
  };

  const previewColor =
    resultingQty === 0
      ? "text-red-400"
      : resultingQty <= (Number(item?.minimum_stock) || 0)
      ? "text-amber-400"
      : "text-green-400";

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : null)}>
      <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-slate-100">Adjust Stock</DialogTitle>
          <DialogDescription className="text-slate-400">
            {item?.part_name}
            {item?.part_number ? (
              <span className="font-mono text-slate-500"> · {item.part_number}</span>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-slate-300">Movement Type</Label>
            <RadioGroup
              value={movementType}
              onValueChange={setMovementType}
              className="grid grid-cols-1 gap-2"
            >
              {MOVEMENT_TYPES.map((type) => {
                const Icon = type.icon;
                const selected = movementType === type.value;
                return (
                  <Label
                    key={type.value}
                    htmlFor={`movement-${type.value}`}
                    className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                      selected
                        ? type.ringClass
                        : "border-slate-800 bg-slate-950/50 hover:bg-slate-800/50"
                    }`}
                  >
                    <RadioGroupItem
                      id={`movement-${type.value}`}
                      value={type.value}
                      className="border-slate-600 text-orange-500"
                    />
                    <Icon className={`w-4 h-4 ${type.iconClass}`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-200">{type.label}</p>
                      <p className="text-xs text-slate-500">{type.hint}</p>
                    </div>
                  </Label>
                );
              })}
            </RadioGroup>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="adjust-quantity" className="text-slate-300">
                Quantity {movementType === "adjust" && "(signed)"}
              </Label>
              <Input
                id="adjust-quantity"
                type="number"
                step="1"
                min={movementType === "adjust" ? undefined : 1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="bg-slate-800 border-slate-700 text-slate-200"
                placeholder={movementType === "adjust" ? "e.g. -2" : "0"}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Reason</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                  {MOVEMENT_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {REASON_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="adjust-reference" className="text-slate-300">
              Reference <span className="text-slate-500">(optional)</span>
            </Label>
            <Input
              id="adjust-reference"
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="bg-slate-800 border-slate-700 text-slate-200"
              placeholder="Job #, PO #, invoice…"
            />
          </div>

          {/* Resulting quantity preview */}
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Resulting Quantity</p>
              <p className="text-sm text-slate-400">
                Current: <span className="font-semibold text-slate-200">{currentQty}</span>
              </p>
            </div>
            <div className="text-right">
              <p className={`text-2xl font-bold ${previewColor}`}>
                {qtyValid ? resultingQty : currentQty}
              </p>
              {qtyValid && resultingQty < currentQty && (
                <p className="text-xs text-red-400">
                  {currentQty - resultingQty} removed
                </p>
              )}
              {qtyValid && resultingQty > currentQty && (
                <p className="text-xs text-green-400">
                  +{resultingQty - currentQty} added
                </p>
              )}
            </div>
          </div>

          {mutation.isError && (
            <p className="text-sm text-red-400">
              Failed to save adjustment. Please try again.
            </p>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!qtyValid || mutation.isPending}
              className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save Adjustment"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
